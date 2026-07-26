// xd
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enhanceWithAi } from "@/lib/ai/adapters/tool-enhance";
import { loadAnalyticsMetrics } from "@/lib/ai/loaders/business-data";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const periodDays = Math.min(90, Math.max(7, Number(searchParams.get("days") || 30)));
    const period = `${periodDays}d`;

    const cached = await prisma.aiInsightCache.findUnique({
      where: {
        userId_scope_period: { userId: user.id, scope: "analytics", period },
      },
    });
    if (cached && cached.expiresAt > new Date()) {
      return NextResponse.json({ success: true, data: cached.payload, cached: true });
    }

    const metrics = await loadAnalyticsMetrics(user.id, periodDays);
    const aiPack = await enhanceWithAi(
      "analytics",
      { scope: "analytics", period },
      {
        crawlData: metrics as unknown as Record<string, unknown>,
        userId: user.id,
        userPlan: user.plan,
        skipCache: true,
      }
    );

    const payload = {
      metrics,
      ai: aiPack?.ai?.json ?? null,
      markdown: aiPack?.ai?.markdown ?? "Configurá AI_API_KEY (u otro proveedor) para analíticas inteligentes.",
    };

    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const payloadJson = JSON.parse(JSON.stringify(payload));
    await prisma.aiInsightCache.upsert({
      where: { userId_scope_period: { userId: user.id, scope: "analytics", period } },
      create: { userId: user.id, scope: "analytics", period, payload: payloadJson, expiresAt },
      update: { payload: payloadJson, expiresAt },
    });

    return NextResponse.json({ success: true, data: payload });
  } catch (e) {
    console.error("analytics AI", e);
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}
