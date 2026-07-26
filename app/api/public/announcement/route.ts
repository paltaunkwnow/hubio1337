// xd
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ announcementText: null, announcementLink: null });
  }

  try {
    const config = await prisma.globalConfig.findUnique({
      where: { id: "singleton" },
      select: { announcementText: true, announcementLink: true },
    });
    return NextResponse.json({
      announcementText: config?.announcementText ?? null,
      announcementLink: config?.announcementLink ?? null,
    });
  } catch (error) {
    console.error("Failed to load public announcement:", error);
    return NextResponse.json({ announcementText: null, announcementLink: null });
  }
}
