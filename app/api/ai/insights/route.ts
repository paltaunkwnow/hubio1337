// xd
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enhanceWithAi } from "@/lib/ai/adapters/tool-enhance";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "weekly";

    const cached = await prisma.aiInsightCache.findUnique({
      where: {
        userId_scope_period: {
          userId: user.id,
          scope: "dashboard",
          period,
        },
      },
    });

    if (cached && cached.expiresAt > new Date()) {
      return NextResponse.json({ success: true, data: cached.payload, cached: true });
    }

    const [toolCount, orders, posts] = await Promise.all([
      prisma.toolUsage.count({ where: { userId: user.id } }),
      prisma.serviceOrder.count({
        where: { OR: [{ clientId: user.id }, { service: { providerId: user.id } }] },
      }),
      prisma.post.count({ where: { authorId: user.id } }),
    ]);

    const metrics = { toolCount, orders, posts, plan: user.plan, period };

    const aiPack = await enhanceWithAi("dashboard-insights", metrics, {
      userId: user.id,
      userPlan: user.plan,
    });

    const payload = {
      metrics,
      ai: aiPack?.ai?.json ?? null,
      markdown: aiPack?.ai?.markdown ?? "Configura AI_API_KEY para resúmenes inteligentes del panel.",
    };

    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const payloadJson = JSON.parse(JSON.stringify(payload));
    await prisma.aiInsightCache.upsert({
      where: {
        userId_scope_period: { userId: user.id, scope: "dashboard", period },
      },
      create: {
        userId: user.id,
        scope: "dashboard",
        period,
        payload: payloadJson,
        expiresAt,
      },
      update: { payload: payloadJson, expiresAt },
    });

    return NextResponse.json({ success: true, data: payload });
  } catch (e) {
    console.error("dashboard insights", e);
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}
