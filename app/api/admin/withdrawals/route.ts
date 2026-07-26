// xd
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminUser } from "@/lib/admin";
import {
  adminUpdateWithdrawal,
  getWithdrawalAdminStats,
} from "@/lib/services/withdrawalService";
import { confirmPaymentOrder } from "@/lib/services/cryptoPaymentService";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const me = session?.user?.email
      ? await prisma.user.findUnique({ where: { email: session.user.email } })
      : null;
    if (!me || !(await isAdminUser(me.id))) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
    }

    const [requests, stats, pendingCrypto] = await Promise.all([
      prisma.withdrawalRequest.findMany({
        include: {
          user: { select: { id: true, name: true, email: true, username: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      getWithdrawalAdminStats(),
      prisma.cryptoPaymentOrder.findMany({
        where: { status: "PENDING", txid: { not: null } },
        include: { user: { select: { name: true, email: true } } },
        take: 50,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { requests, stats, pendingCrypto },
    });
  } catch (error) {
    console.error("ADMIN_WITHDRAWALS_GET", error);
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const me = session?.user?.email
      ? await prisma.user.findUnique({ where: { email: session.user.email } })
      : null;
    if (!me || !(await isAdminUser(me.id))) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();

    if (body.cryptoOrderId) {
      const order = await confirmPaymentOrder(body.cryptoOrderId, {
        confirmedByAdmin: true,
      });
      return NextResponse.json({ success: true, data: order });
    }

    const updated = await adminUpdateWithdrawal(
      me.id,
      body.withdrawalId,
      body.action,
      {
        adminNote: body.adminNote,
        bankReference: body.bankReference,
        wallbitRef: body.wallbitRef,
      }
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
