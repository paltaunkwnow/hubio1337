// xd
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createWithdrawalRequest } from "@/lib/services/withdrawalService";
import { WithdrawalMethod } from "@prisma/client";
import { getWithdrawalNet, WITHDRAWAL_MIN_BOB } from "@/lib/walletConfig";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });
    }

    const body = await req.json();
    const amountBOB = Number(body.amountBOB);
    if (!Number.isFinite(amountBOB)) {
      return NextResponse.json({ success: false, error: "Monto inválido" }, { status: 400 });
    }

    const method =
      body.method === "qr" ? WithdrawalMethod.QR : WithdrawalMethod.BANK_ACCOUNT;

    const request = await createWithdrawalRequest(user.id, {
      amountBOB,
      method,
      bankName: body.bankName,
      accountNumber: body.accountNumber,
      accountHolder: body.accountHolder,
      qrImageUrl: body.qrImageUrl,
    });

    return NextResponse.json({ success: true, data: request });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    const status = message.includes(String(WITHDRAWAL_MIN_BOB)) ? 400 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const previewAmount = searchParams.get("preview");
    if (previewAmount) {
      const amount = Number(previewAmount);
      const { fee, net } = getWithdrawalNet(amount);
      return NextResponse.json({
        success: true,
        data: { amountBOB: amount, feeBOB: fee, netAmountBOB: net, minBOB: WITHDRAWAL_MIN_BOB },
      });
    }

    const list = await prisma.withdrawalRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error("WITHDRAW_GET", error);
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}
