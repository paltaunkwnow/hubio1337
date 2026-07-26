// xd
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.roles?.includes("ADMIN") || (session?.user as any)?.role === "ADMIN";
    if (!session || !isAdmin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: query,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        username: true,
        name: true,
        avatar: true,
      },
      take: 5,
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("Search Users Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
