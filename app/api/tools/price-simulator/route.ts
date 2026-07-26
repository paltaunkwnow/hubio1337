// xd
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { checkToolAccess } from "@/lib/toolAccess";
import { PRICE_REFERENCE } from "@/lib/price-reference";
import { enhanceWithAi } from "@/lib/ai/adapters/tool-enhance";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });

    const access = await checkToolAccess(user.id, "price-simulator");
    if (!access.allowed) return NextResponse.json({ success: false, error: access.message }, { status: 403 });

    const body = await req.json();
    const category = String(body.category || "desarrollo web").toLowerCase();
    const region = String(body.region || body.country || "global").toLowerCase();
    const experienceYears = Number(body.experienceYears || body.experience || 0);
    const deliveryType = String(body.deliveryType || body.urgency || "estándar").toLowerCase();
    const hours = Number(body.hours || body.estimatedHours || 40);

    const reference = PRICE_REFERENCE[category] || PRICE_REFERENCE["desarrollo web"];
    const row = reference[region as keyof typeof reference] || reference.global;

    const experienceMultiplier = experienceYears >= 5 ? 1.35 : experienceYears >= 2 ? 1.15 : 1;
    const deliveryMultiplier = deliveryType.includes("premium") || deliveryType.includes("urgent")
      ? 1.35
      : deliveryType.includes("básico") || deliveryType.includes("basico")
        ? 0.9
        : 1;
    const inflation = Math.max(0, Number(body.inflation || 0));
    // Ajuste suave por inflación (mitad del % anual como colchón de pricing local)
    const inflationFactor = 1 + Math.min(inflation, 80) / 200;
    const competitionLevel = String(body.competitionLevel || "media").toLowerCase();
    const competitionFactor =
      competitionLevel === "alta" ? 0.95 : competitionLevel === "baja" ? 1.08 : 1;
    const techStack = String(body.techStack || "").trim();
    const stackFactor = techStack.length > 8 ? 1.05 : 1;

    const factor = experienceMultiplier * deliveryMultiplier * inflationFactor * competitionFactor * stackFactor;
    const min = Math.round(row.min * factor * hours);
    const avg = Math.round(row.avg * factor * hours);
    const premium = Math.round(row.premium * factor * hours);
    const hourly = Math.round(row.hourly * factor);

    const baseline = {
      category,
      region,
      experienceYears,
      deliveryType,
      hours,
      inflation,
      techStack,
      competitionLevel,
      min,
      avg,
      premium,
      hourly,
      label: "referencia_mercado_hubio",
    };

    const aiPack = await enhanceWithAi("price-simulator", { ...body, baseline }, {
      userId: user.id,
      userPlan: user.plan,
    });

    const result = {
      ...baseline,
      recommended: aiPack?.ai?.json && typeof (aiPack.ai.json as any).recommended === "number"
        ? (aiPack.ai.json as any).recommended
        : avg,
      ai: aiPack?.ai?.json ?? null,
      aiMarkdown: aiPack?.ai?.markdown ?? null,
    };

    await prisma.toolUsage.create({
      data: { userId: user.id, toolName: "price-simulator", inputData: body, outputData: result as object },
    }).catch(() => {});

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Price simulator error", error);
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}
