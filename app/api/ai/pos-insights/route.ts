// xd
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkToolAccess } from "@/lib/toolAccess";
import { enhanceWithAi } from "@/lib/ai/adapters/tool-enhance";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });

    const access = await checkToolAccess(user.id, "pos-system");
    if (!access.allowed) return NextResponse.json({ success: false, error: access.message }, { status: 403 });

    const posConfig = await prisma.pOSConfig.findUnique({
      where: { userId: user.id },
      include: {
        products: { take: 100 },
        sales: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { items: { include: { product: true } } },
        },
      },
    });

    if (!posConfig) {
      return NextResponse.json({ success: false, error: "POS no configurado" }, { status: 404 });
    }

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

    const input = { salesSummary, inventory, currency: posConfig.currency };

    const aiPack = await enhanceWithAi("pos-insights", input, {
      userId: user.id,
      userPlan: user.plan,
    });

    const result = {
      ...input,
      ai: aiPack?.ai?.json ?? null,
      aiMarkdown: aiPack?.ai?.markdown ?? null,
    };

    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    console.error("POS AI insights", e);
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}
