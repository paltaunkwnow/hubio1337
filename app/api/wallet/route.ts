// xd
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWalletDashboard } from "@/lib/services/walletService";

export async function GET() {
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

    const data = await getWalletDashboard(user.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("WALLET_GET", error);
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}
