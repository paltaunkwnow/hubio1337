// xd
/**
 * Cron de insights IA: regenera caché de dashboard + analytics para usuarios activos.
 * Auth: header Authorization: Bearer <CRON_SECRET> o ?secret=
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enhanceWithAi } from "@/lib/ai/adapters/tool-enhance";
import { loadAnalyticsMetrics } from "@/lib/ai/loaders/business-data";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorize(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const url = new URL(req.url);
  const q = url.searchParams.get("secret") || "";
  return bearer === secret || q === secret;
}

async function refreshDashboard(userId: string, plan: string, period: string) {
  const [toolCount, orders, posts] = await Promise.all([
    prisma.toolUsage.count({ where: { userId } }),
    prisma.serviceOrder.count({
      where: { OR: [{ clientId: userId }, { service: { providerId: userId } }] },
    }),
    prisma.post.count({ where: { authorId: userId } }),
  ]);
  const metrics = { toolCount, orders, posts, plan, period };
  const aiPack = await enhanceWithAi("dashboard-insights", metrics, {
    userId,
    userPlan: plan,
    skipCache: true,
  });
  const payload = {
    metrics,
    ai: aiPack?.ai?.json ?? null,
    markdown: aiPack?.ai?.markdown ?? null,
  };
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
  const payloadJson = JSON.parse(JSON.stringify(payload));
  await prisma.aiInsightCache.upsert({
    where: { userId_scope_period: { userId, scope: "dashboard", period } },
    create: { userId, scope: "dashboard", period, payload: payloadJson, expiresAt },
    update: { payload: payloadJson, expiresAt },
  });
}

async function refreshAnalytics(userId: string, plan: string) {
  const periodDays = 30;
  const period = `${periodDays}d`;
  const metrics = await loadAnalyticsMetrics(userId, periodDays);
  const aiPack = await enhanceWithAi(
    "analytics",
    { scope: "analytics", period },
    {
      crawlData: metrics as unknown as Record<string, unknown>,
      userId,
      userPlan: plan,
      skipCache: true,
    }
  );
  const payload = {
    metrics,
    ai: aiPack?.ai?.json ?? null,
    markdown: aiPack?.ai?.markdown ?? null,
  };
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
  const payloadJson = JSON.parse(JSON.stringify(payload));
  await prisma.aiInsightCache.upsert({
    where: { userId_scope_period: { userId, scope: "analytics", period } },
    create: { userId, scope: "analytics", period, payload: payloadJson, expiresAt },
    update: { payload: payloadJson, expiresAt },
  });
}

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ success: false, error: "CRON_SECRET no configurado" }, { status: 503 });
  }
  if (!authorize(req)) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }

  const since = new Date(Date.now() - 14 * 86_400_000);
  const activeUsers = await prisma.user.findMany({
    where: {
      OR: [
        { toolUsages: { some: { createdAt: { gte: since } } } },
        { posts: { some: { createdAt: { gte: since } } } },
        { clientOrders: { some: { createdAt: { gte: since } } } },
        { posConfig: { is: { sales: { some: { createdAt: { gte: since } } } } } },
      ],
    },
    select: { id: true, plan: true },
    take: 40,
    orderBy: { updatedAt: "desc" },
  });

  let ok = 0;
  let failed = 0;
  for (const u of activeUsers) {
    try {
      await refreshDashboard(u.id, u.plan, "weekly");
      await refreshAnalytics(u.id, u.plan);
      ok += 1;
    } catch (e) {
      failed += 1;
      console.warn("[cron/insights] fallo para", u.id, e);
    }
  }

  return NextResponse.json({
    success: true,
    processed: activeUsers.length,
    ok,
    failed,
  });
}

export async function POST(req: Request) {
  return GET(req);
}
