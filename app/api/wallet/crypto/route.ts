// xd
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createPaymentOrder,
  submitPaymentTxid,
  cancelPaymentOrder,
} from "@/lib/services/cryptoPaymentService";
import { resolveSubscriptionAmountUSDT } from "@/lib/walletConfig";
import { CryptoPaymentPurpose, Plan } from "@prisma/client";

async function getAuthUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({ where: { email: session.user.email } });
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const action = body.action || "create";

    if (action === "create") {
      const purpose = (body.purpose as CryptoPaymentPurpose) || CryptoPaymentPurpose.OTHER;
      let amountUSDT = Number(body.amountUSDT);

      if (purpose === CryptoPaymentPurpose.SUBSCRIPTION || purpose === CryptoPaymentPurpose.RENEWAL) {
        amountUSDT = resolveSubscriptionAmountUSDT(body.plan || "PROFESSIONAL", body.interval || "monthly");
      }

      if (!Number.isFinite(amountUSDT) || amountUSDT <= 0) {
        return NextResponse.json({ success: false, error: "Monto inválido" }, { status: 400 });
      }

      const metadata = {
        plan: body.plan as Plan | undefined,
        interval: body.interval,
        posSaleId: body.posSaleId,
        ...body.metadata,
      };

      const order = await createPaymentOrder({
        userId: user.id,
        purpose,
        amountUSDT,
        metadata,
      });

      if (body.posSaleId) {
        await prisma.pOSSale.update({
          where: { id: body.posSaleId },
          data: { cryptoPaymentOrderId: order.id },
        });
      }

      return NextResponse.json({ success: true, data: order });
    }

    if (action === "submit_txid") {
      const order = await submitPaymentTxid(body.orderId, user.id, body.txid);
      return NextResponse.json({ success: true, data: order });
    }

    if (action === "cancel") {
      const order = await cancelPaymentOrder(body.orderId, user.id);
      return NextResponse.json({ success: true, data: order });
    }

    return NextResponse.json({ success: false, error: "Acción inválida" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function GET(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    const reference = searchParams.get("reference");

    const order = await prisma.cryptoPaymentOrder.findFirst({
      where: {
        userId: user.id,
        ...(orderId ? { id: orderId } : {}),
        ...(reference ? { reference } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("CRYPTO_ORDER_GET", error);
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}
