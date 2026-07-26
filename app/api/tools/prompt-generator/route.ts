// xd
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { checkToolAccess } from "@/lib/toolAccess";
import { enhanceWithAi } from "@/lib/ai/adapters/tool-enhance";

function fallbackPrompts(input: Record<string, unknown>) {
  const base = String(input.description || "");
  const tool = String(input.tool || input.platform || "ChatGPT");
  return [
    { platform: tool, level: "Básico", prompt: `${tool} prompt: ${base}` },
    {
      platform: tool,
      level: "Detallado",
      prompt: `${tool} prompt highly detailed, ${base}, professional composition, high quality`,
    },
    {
      platform: tool,
      level: "Avanzado",
      prompt: `${tool} prompt advanced, ${base}, cinematic, premium quality, consistent style`,
    },
  ];
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });

    const access = await checkToolAccess(user.id, "prompt-generator");
    if (!access.allowed) return NextResponse.json({ success: false, error: access.message }, { status: 403 });

    const body = await req.json();
    let prompts = fallbackPrompts(body);

    const aiPack = await enhanceWithAi("prompt-generator", body, {
      userId: user.id,
      userPlan: user.plan,
    });

    if (aiPack?.ai?.json && Array.isArray((aiPack.ai.json as { prompts?: unknown }).prompts)) {
      prompts = (aiPack.ai.json as { prompts: typeof prompts }).prompts;
    }

    const result = { prompts, aiMarkdown: aiPack?.ai?.markdown ?? null };

    await prisma.toolUsage.create({
      data: { userId: user.id, toolName: "prompt-generator", inputData: body, outputData: result },
    }).catch(() => {});

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Prompt generator error", error);
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}
