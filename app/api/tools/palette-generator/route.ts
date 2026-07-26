// xd
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { checkToolAccess } from "@/lib/toolAccess";
import { enhanceWithAi } from "@/lib/ai/adapters/tool-enhance";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });

    const access = await checkToolAccess(user.id, "palette-generator");
    if (!access.allowed) return NextResponse.json({ success: false, error: access.message }, { status: 403 });

    const body = await req.json();
    const aiPack = await enhanceWithAi("palette-generator", body, {
      userId: user.id,
      userPlan: user.plan,
    });

    const aiJson = (aiPack?.ai?.json as { colors?: unknown } | null) ?? null;
    const result = {
      colors: Array.isArray(aiJson?.colors) ? aiJson!.colors : body.colors ?? [],
      mode: body.mode,
      brand: body.brand || body.sector,
      ai: aiJson,
      aiMarkdown: aiPack?.ai?.markdown ?? null,
    };

    await prisma.toolUsage.create({
      data: { userId: user.id, toolName: "palette-generator", inputData: body, outputData: result as object },
    }).catch(() => {});

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Palette generator AI error", error);
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}
