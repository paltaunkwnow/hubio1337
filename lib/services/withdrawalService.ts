// xd
import { prisma } from "@/lib/prisma";
import {
  WITHDRAWAL_MIN_BOB,
  getWithdrawalNet,
} from "@/lib/walletConfig";
import { recordWithdrawalIntent, isWallbitConfigured } from "./wallbitService";
import { WithdrawalMethod, WithdrawalStatus, WalletTransactionType } from "@prisma/client";

export async function createWithdrawalRequest(
  userId: string,
  params: {
    amountBOB: number;
    method: WithdrawalMethod;
    bankName?: string;
    accountNumber?: string;
    accountHolder?: string;
    qrImageUrl?: string;
  }
) {
  const amountBOB = Math.round(params.amountBOB * 100) / 100;

  if (amountBOB < WITHDRAWAL_MIN_BOB) {
    throw new Error(
      `El monto mínimo de retiro es ${WITHDRAWAL_MIN_BOB} Bs.`
    );
  }

  const { fee, net } = getWithdrawalNet(amountBOB);
  if (net <= 0) {
    throw new Error("El monto es insuficiente para cubrir la comisión");
  }

  if (params.method === WithdrawalMethod.BANK_ACCOUNT) {
    if (!params.bankName?.trim() || !params.accountNumber?.trim() || !params.accountHolder?.trim()) {
      throw new Error("Completa los datos bancarios");
    }
  }
  if (params.method === WithdrawalMethod.QR && !params.qrImageUrl?.trim()) {
    throw new Error("Sube la imagen del código QR");
  }

  const pending = await prisma.withdrawalRequest.count({
    where: {
      userId,
      status: { in: ["PENDING", "APPROVED", "PROCESSING"] },
    },
  });
  if (pending > 0) {
    throw new Error("Ya tienes un retiro en proceso");
  }

  const balance = await prisma.walletBalance.findUnique({ where: { userId } });
  const available = Number(balance?.balanceBOB ?? 0);
  if (available < amountBOB) {
    throw new Error("Saldo BOB insuficiente");
  }

  const request = await prisma.$transaction(async (tx) => {
    await tx.walletBalance.update({
      where: { userId },
      data: { balanceBOB: { decrement: amountBOB } },
    });

    const created = await tx.withdrawalRequest.create({
      data: {
        userId,
        amountBOB,
        feeBOB: fee,
        netAmountBOB: net,
        method: params.method,
        bankName: params.bankName?.trim(),
        accountNumber: params.accountNumber?.trim(),
        accountHolder: params.accountHolder?.trim(),
        qrImageUrl: params.qrImageUrl?.trim(),
        status: WithdrawalStatus.PENDING,
      },
    });

    await tx.walletTransaction.create({
      data: {
        userId,
        type: WalletTransactionType.WITHDRAWAL,
        amount: amountBOB,
        currency: "BOB",
        status: "PENDING",
        reference: `wd-${created.id}`,
        metadata: { withdrawalId: created.id, fee, net },
      },
    });

    return created;
  });

  if (isWallbitConfigured()) {
    try {
      await recordWithdrawalIntent({
        amountBOB: net,
        reference: request.id,
        metadata: { userId, method: params.method },
      });
    } catch (e) {
      console.error("WALLBIT_WITHDRAWAL_INTENT", e);
    }
  }

  return request;
}

export async function adminUpdateWithdrawal(
  adminId: string,
  withdrawalId: string,
  action: "approve" | "reject" | "processing" | "complete",
  payload?: { adminNote?: string; bankReference?: string; wallbitRef?: string }
) {
  const existing = await prisma.withdrawalRequest.findUnique({
    where: { id: withdrawalId },
  });
  if (!existing) throw new Error("Retiro no encontrado");

  let status: WithdrawalStatus = existing.status;

  switch (action) {
    case "approve":
      if (existing.status !== WithdrawalStatus.PENDING) throw new Error("Estado inválido");
      status = WithdrawalStatus.APPROVED;
      break;
    case "reject":
      if (!["PENDING", "APPROVED"].includes(existing.status)) {
        throw new Error("No se puede rechazar en este estado");
      }
      status = WithdrawalStatus.REJECTED;
      break;
    case "processing":
      status = WithdrawalStatus.PROCESSING;
      break;
    case "complete":
      status = WithdrawalStatus.COMPLETED;
      break;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        status,
        adminNote: payload?.adminNote,
        bankReference: payload?.bankReference,
        wallbitRef: payload?.wallbitRef,
        processedAt: action === "complete" ? new Date() : undefined,
      },
    });

    if (action === "reject") {
      await tx.walletBalance.upsert({
        where: { userId: existing.userId },
        create: { userId: existing.userId, balanceBOB: Number(existing.amountBOB) },
        update: { balanceBOB: { increment: existing.amountBOB } },
      });

      await tx.walletTransaction.create({
        data: {
          userId: existing.userId,
          type: WalletTransactionType.REFUND,
          amount: Number(existing.amountBOB),
          currency: "BOB",
          status: "PAID",
          reference: `refund-${withdrawalId}`,
          metadata: { withdrawalId, adminId },
        },
      });

      await tx.walletTransaction.updateMany({
        where: { reference: `wd-${withdrawalId}` },
        data: { status: "CANCELLED" },
      });
    }

    if (action === "complete") {
      await tx.walletTransaction.updateMany({
        where: { reference: `wd-${withdrawalId}` },
        data: { status: "PAID" },
      });

      await tx.walletTransaction.create({
        data: {
          userId: existing.userId,
          type: WalletTransactionType.FEE,
          amount: Number(existing.feeBOB),
          currency: "BOB",
          status: "PAID",
          reference: `fee-${withdrawalId}`,
          metadata: { withdrawalId },
        },
      });

      await tx.adminLog.create({
        data: {
          adminId,
          action: "WITHDRAWAL_COMPLETE",
          details: `Retiro ${withdrawalId} completado`,
        },
      });
    }

    return row;
  });

  return updated;
}

export async function getWithdrawalAdminStats() {
  const [pending, completed, fees] = await Promise.all([
    prisma.withdrawalRequest.count({ where: { status: "PENDING" } }),
    prisma.withdrawalRequest.aggregate({
      where: { status: "COMPLETED" },
      _sum: { netAmountBOB: true, feeBOB: true },
    }),
    prisma.withdrawalRequest.aggregate({
      _sum: { feeBOB: true },
      where: { status: "COMPLETED" },
    }),
  ]);

  return {
    pendingCount: pending,
    totalWithdrawnBOB: Number(completed._sum.netAmountBOB ?? 0),
    totalFeesBOB: Number(fees._sum.feeBOB ?? 0),
  };
}
