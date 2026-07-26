// xd
import { prisma } from "@/lib/prisma";
import { Prisma, WalletTransactionType, WalletTransactionStatus } from "@prisma/client";
import { isWallbitConfigured } from "./wallbitService";

export async function getOrCreateWalletBalance(userId: string) {
  return prisma.walletBalance.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function creditWallet(
  userId: string,
  params: {
    amount: number;
    currency: "USDT" | "BOB";
    type: WalletTransactionType;
    txid?: string;
    metadata?: Prisma.InputJsonValue;
    reference?: string;
  }
) {
  const field = params.currency === "USDT" ? "balanceUSDT" : "balanceBOB";

  return prisma.$transaction(async (tx) => {
    await tx.walletBalance.upsert({
      where: { userId },
      create: { userId, [field]: params.amount },
      update: { [field]: { increment: params.amount } },
    });

    return tx.walletTransaction.create({
      data: {
        userId,
        type: params.type,
        amount: params.amount,
        currency: params.currency,
        status: WalletTransactionStatus.PAID,
        txid: params.txid,
        metadata: params.metadata,
        reference: params.reference,
      },
    });
  });
}

export async function debitWalletBOB(
  userId: string,
  amountBOB: number,
  type: WalletTransactionType,
  metadata?: Prisma.InputJsonValue
) {
  return prisma.$transaction(async (tx) => {
    const balance = await tx.walletBalance.findUnique({ where: { userId } });
    const current = Number(balance?.balanceBOB ?? 0);
    if (current < amountBOB) {
      throw new Error("Saldo BOB insuficiente");
    }

    await tx.walletBalance.update({
      where: { userId },
      data: { balanceBOB: { decrement: amountBOB } },
    });

    return tx.walletTransaction.create({
      data: {
        userId,
        type,
        amount: amountBOB,
        currency: "BOB",
        status: WalletTransactionStatus.PAID,
        metadata,
      },
    });
  });
}

export async function convertUsdtToBob(userId: string, amountUSDT: number) {
  if (amountUSDT <= 0) throw new Error("Monto inválido");

  let rate = Number(process.env.USDT_BOB_RATE || "0");
  if (!rate && isWallbitConfigured()) {
    try {
      const { getExchangeRate } = await import("./wallbitService");
      const res = await getExchangeRate("USDT", "BOB");
      rate = Number(res.rate ?? 0);
    } catch {
      /* fallback below */
    }
  }
  if (!rate) rate = 6.96;

  const bobAmount = Math.round(amountUSDT * rate * 100) / 100;

  return prisma.$transaction(async (tx) => {
    const bal = await tx.walletBalance.findUnique({ where: { userId } });
    const usdt = Number(bal?.balanceUSDT ?? 0);
    if (usdt < amountUSDT) throw new Error("Saldo USDT insuficiente");

    await tx.walletBalance.update({
      where: { userId },
      data: {
        balanceUSDT: { decrement: amountUSDT },
        balanceBOB: { increment: bobAmount },
      },
    });

    await tx.walletTransaction.create({
      data: {
        userId,
        type: WalletTransactionType.SALE,
        amount: amountUSDT,
        currency: "USDT",
        status: WalletTransactionStatus.PAID,
        metadata: { conversion: "USDT_TO_BOB", bobAmount, rate },
      },
    });

    return { bobAmount, rate };
  });
}

export async function getWalletDashboard(userId: string) {
  const [balance, transactions, pendingWithdrawals, posConfig] = await Promise.all([
    getOrCreateWalletBalance(userId),
    prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.withdrawalRequest.count({
      where: { userId, status: { in: ["PENDING", "APPROVED", "PROCESSING"] } },
    }),
    prisma.pOSConfig.findUnique({
      where: { userId },
      include: {
        sales: {
          orderBy: { createdAt: "desc" },
          take: 100,
        },
      },
    }),
  ]);

  const sales = posConfig?.sales ?? [];
  const totalSales = sales.reduce((s, sale) => s + Number(sale.totalAmount), 0);
  const usdtSales = sales.filter((s) => s.paymentMethod === "USDT_TRC20");
  const pendingPayments = sales.filter((s) => s.paymentStatus === "PENDING").length;

  return {
    balance,
    transactions,
    pendingWithdrawals,
    financial: {
      totalSales,
      totalSalesCount: sales.length,
      usdtSalesCount: usdtSales.length,
      pendingPayments,
      availableBalanceUSDT: Number(balance.balanceUSDT),
      availableBalanceBOB: Number(balance.balanceBOB),
    },
  };
}
