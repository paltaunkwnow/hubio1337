// xd
import { prisma } from "@/lib/prisma";
import {
  CRYPTO_PAYMENT_EXPIRY_MINUTES,
  WALLET_TRON_ADDRESS,
  POS_PLATFORM_COMMISSION_PERCENT,
} from "@/lib/walletConfig";
import {
  CryptoPaymentPurpose,
  CryptoPaymentStatus,
  Plan,
  Prisma,
  WalletTransactionType,
} from "@prisma/client";

export function getReceivingWalletAddress(): string {
  return WALLET_TRON_ADDRESS;
}

export async function createPaymentOrder(params: {
  userId: string;
  purpose: CryptoPaymentPurpose;
  amountUSDT: number;
  metadata?: Prisma.InputJsonValue;
}) {
  if (params.amountUSDT <= 0) {
    throw new Error("Monto inválido");
  }

  const expiresAt = new Date(
    Date.now() + CRYPTO_PAYMENT_EXPIRY_MINUTES * 60 * 1000
  );

  return prisma.cryptoPaymentOrder.create({
    data: {
      userId: params.userId,
      purpose: params.purpose,
      amountUSDT: params.amountUSDT,
      walletAddress: getReceivingWalletAddress(),
      expiresAt,
      metadata: params.metadata,
      status: CryptoPaymentStatus.PENDING,
    },
  });
}

export async function submitPaymentTxid(orderId: string, userId: string, txid: string) {
  const cleanTxid = txid.trim();
  if (!cleanTxid || cleanTxid.length < 10) {
    throw new Error("TXID inválido");
  }

  const order = await prisma.cryptoPaymentOrder.findFirst({
    where: { id: orderId, userId },
  });
  if (!order) throw new Error("Orden no encontrada");
  if (order.status !== CryptoPaymentStatus.PENDING) {
    throw new Error("La orden ya no está pendiente");
  }
  if (order.expiresAt < new Date()) {
    await prisma.cryptoPaymentOrder.update({
      where: { id: order.id },
      data: { status: CryptoPaymentStatus.EXPIRED },
    });
    throw new Error("La orden expiró");
  }

  const duplicate = await prisma.cryptoPaymentOrder.findFirst({
    where: { txid: cleanTxid, NOT: { id: order.id } },
  });
  if (duplicate) throw new Error("TXID ya registrado");

  return prisma.cryptoPaymentOrder.update({
    where: { id: order.id },
    data: { txid: cleanTxid },
  });
}

export async function confirmPaymentOrder(
  orderId: string,
  options?: { confirmedByAdmin?: boolean }
) {
  const order = await prisma.cryptoPaymentOrder.findUnique({
    where: { id: orderId },
    include: { posSale: true },
  });
  if (!order) throw new Error("Orden no encontrada");
  if (order.status === CryptoPaymentStatus.PAID) return order;
  if (!order.txid && !options?.confirmedByAdmin) {
    throw new Error("Se requiere TXID antes de confirmar");
  }

  const amount = Number(order.amountUSDT);

  await prisma.$transaction(async (tx) => {
    await tx.cryptoPaymentOrder.update({
      where: { id: order.id },
      data: { status: CryptoPaymentStatus.PAID },
    });

    if (order.purpose === CryptoPaymentPurpose.POS_SALE && order.posSale) {
      const commission =
        (amount * POS_PLATFORM_COMMISSION_PERCENT) / 100;
      const sellerCredit = amount - commission;

      await tx.pOSSale.update({
        where: { id: order.posSale.id },
        data: {
          paymentStatus: CryptoPaymentStatus.PAID,
          paymentTxid: order.txid,
          commission,
        },
      });

      await tx.walletBalance.upsert({
        where: { userId: order.userId },
        create: { userId: order.userId, balanceUSDT: sellerCredit },
        update: { balanceUSDT: { increment: sellerCredit } },
      });

      await tx.walletTransaction.create({
        data: {
          userId: order.userId,
          type: WalletTransactionType.SALE,
          amount: sellerCredit,
          currency: "USDT",
          status: "PAID",
          txid: order.txid,
          reference: order.reference,
          metadata: { orderId: order.id, posSaleId: order.posSale.id, commission },
        },
      });
    } else if (
      order.purpose === CryptoPaymentPurpose.SUBSCRIPTION ||
      order.purpose === CryptoPaymentPurpose.RENEWAL
    ) {
      const meta = (order.metadata as Record<string, unknown>) || {};
      const plan = (meta.plan as Plan) || Plan.PROFESSIONAL;
      const interval = (meta.interval as string) || "monthly";
      const months = interval === "annual" ? 12 : 1;
      const expires = new Date();
      expires.setMonth(expires.getMonth() + months);

      await tx.user.update({
        where: { id: order.userId },
        data: { plan, planExpiresAt: expires },
      });

      await tx.subscription.create({
        data: {
          userId: order.userId,
          plan,
          status: "ACTIVE",
          startDate: new Date(),
          endDate: expires,
          paymentId: order.reference,
        },
      });

      await tx.walletTransaction.create({
        data: {
          userId: order.userId,
          type: WalletTransactionType.SUBSCRIPTION,
          amount,
          currency: "USDT",
          status: "PAID",
          txid: order.txid,
          reference: `${order.reference}-sub`,
          metadata: { orderId: order.id, plan, interval },
        },
      });
    }
  });

  return prisma.cryptoPaymentOrder.findUnique({ where: { id: orderId } });
}

export async function expireStaleOrders() {
  const result = await prisma.cryptoPaymentOrder.updateMany({
    where: {
      status: CryptoPaymentStatus.PENDING,
      expiresAt: { lt: new Date() },
    },
    data: { status: CryptoPaymentStatus.EXPIRED },
  });
  return result.count;
}

export async function cancelPaymentOrder(orderId: string, userId: string) {
  const order = await prisma.cryptoPaymentOrder.findFirst({
    where: { id: orderId, userId, status: CryptoPaymentStatus.PENDING },
  });
  if (!order) throw new Error("Orden no encontrada");

  return prisma.cryptoPaymentOrder.update({
    where: { id: orderId },
    data: { status: CryptoPaymentStatus.CANCELLED },
  });
}
