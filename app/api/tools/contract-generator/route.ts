// xd
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { checkToolAccess } from "@/lib/toolAccess";
import { buildFallbackContract } from "@/lib/ai/adapters/contract-fallback";
import { enhanceWithAi } from "@/lib/ai/adapters/tool-enhance";
import { LEGAL_DISCLAIMER } from "@/lib/ai/constants";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });

    const access = await checkToolAccess(user.id, "contract-generator");
    if (!access.allowed) return NextResponse.json({ success: false, error: access.message }, { status: 403 });

    const body = await req.json();
    const required = ["clientName", "freelancerName", "serviceDescription", "price", "country"];
    const missingFields = required.filter((k) => !String(body[k] ?? "").trim());

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Completá los campos obligatorios antes de generar el contrato.",
          missingFields,
          disclaimer: LEGAL_DISCLAIMER,
        },
        { status: 400 }
      );
    }

    let contractText = buildFallbackContract(body);
    let riskClauses: string[] = [];
    let clauseExplanations: Array<{ clause: string; explanation: string }> = [];
    let countryNotes: string | null = null;

    const aiPack = await enhanceWithAi("contract-generator", body, {
      userId: user.id,
      userPlan: user.plan,
    });

    if (aiPack?.ai?.json) {
      const j = aiPack.ai.json as Record<string, unknown>;
      if (typeof j.contractText === "string" && j.contractText.length > 100) contractText = j.contractText;
      if (Array.isArray(j.riskClauses)) riskClauses = j.riskClauses as string[];
      if (Array.isArray(j.clauseExplanations)) {
        clauseExplanations = j.clauseExplanations as Array<{ clause: string; explanation: string }>;
      }
      if (typeof j.countryNotes === "string") countryNotes = j.countryNotes;
    }

    const result = {
      contractText,
      missingFields: [] as string[],
      riskClauses,
      clauseExplanations,
      countryNotes,
      disclaimer: LEGAL_DISCLAIMER,
      aiMarkdown: aiPack?.ai?.markdown ?? null,
    };

    await prisma.toolUsage.create({
      data: { userId: user.id, toolName: "contract-generator", inputData: body, outputData: result },
    }).catch(() => {});

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Contract generator error", error);
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}
