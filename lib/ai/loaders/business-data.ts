// xd
/** Cargadores de datos reales de negocio para los agentes (POS y analíticas). */
import { prisma } from "@/lib/prisma";

export async function loadPosSnapshot(userId: string) {
  const posConfig = await prisma.pOSConfig.findUnique({
    where: { userId },
    include: {
      products: { take: 100 },
      sales: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { items: { include: { product: true } } },
      },
    },
  });
  if (!posConfig) return null;

  const salesSummary = posConfig.sales.map((s) => ({
    total: Number(s.totalAmount),
    date: s.createdAt,
    items: s.items.map((i) => ({
      name: i.product.name,
      qty: i.quantity,
      stock: i.product.stock,
    })),
  }));

  const inventory = posConfig.products.map((p) => ({
    name: p.name,
    stock: p.stock,
    price: Number(p.price),
  }));

  return { salesSummary, inventory, currency: posConfig.currency };
}

export interface AnalyticsMetrics {
  periodDays: number;
  current: Record<string, number>;
  previous: Record<string, number>;
  deltas: Record<string, number | null>;
  plan: string;
}

/** Métricas del usuario: período actual vs anterior, con deltas porcentuales. */
export async function loadAnalyticsMetrics(userId: string, periodDays = 30): Promise<AnalyticsMetrics> {
  const now = Date.now();
  const currentStart = new Date(now - periodDays * 86_400_000);
  const previousStart = new Date(now - 2 * periodDays * 86_400_000);

  async function countsBetween(gte: Date, lt?: Date) {
    const createdAt = lt ? { gte, lt } : { gte };
    const [toolUsage, ordersAsClient, ordersAsProvider, posts, posSales] = await Promise.all([
      prisma.toolUsage.count({ where: { userId, createdAt } }),
      prisma.serviceOrder.count({ where: { clientId: userId, createdAt } }),
      prisma.serviceOrder.count({ where: { service: { providerId: userId }, createdAt } }),
      prisma.post.count({ where: { authorId: userId, createdAt } }),
      prisma.pOSSale.count({ where: { posConfig: { userId }, createdAt } }),
    ]);
    const posRevenueAgg = await prisma.pOSSale.aggregate({
      where: { posConfig: { userId }, createdAt },
      _sum: { totalAmount: true },
    });
    return {
      usoHerramientas: toolUsage,
      pedidosComoCliente: ordersAsClient,
      pedidosComoProveedor: ordersAsProvider,
      publicaciones: posts,
      ventasPos: posSales,
      ingresosPos: Number(posRevenueAgg._sum.totalAmount ?? 0),
    };
  }

  const [current, previous, user] = await Promise.all([
    countsBetween(currentStart),
    countsBetween(previousStart, currentStart),
    prisma.user.findUnique({ where: { id: userId }, select: { plan: true } }),
  ]);

  const deltas: Record<string, number | null> = {};
  for (const key of Object.keys(current)) {
    const prev = previous[key as keyof typeof previous];
    const curr = current[key as keyof typeof current];
    deltas[key] = prev === 0 ? (curr > 0 ? null : 0) : Math.round(((curr - prev) / prev) * 100);
  }

  return {
    periodDays,
    current,
    previous,
    deltas,
    plan: user?.plan ?? "FREE",
  };
}
