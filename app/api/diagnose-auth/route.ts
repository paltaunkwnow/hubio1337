// xd
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;
    const databaseUrl = process.env.DATABASE_URL;
    
    // Check database connection
    let dbStatus = "OK";
    let dbError = null;
    let userCount = 0;
    try {
      userCount = await prisma.user.count();
    } catch (e: any) {
      dbStatus = "ERROR";
      dbError = e.message || String(e);
    }
    
    // Hide secret details but provide diagnostic clues
    const secretLength = nextAuthSecret ? nextAuthSecret.length : 0;
    const secretClue = nextAuthSecret 
      ? `${nextAuthSecret.substring(0, 2)}...${nextAuthSecret.substring(nextAuthSecret.length - 2)}` 
      : "MISSING";
      
    // Check if running on Vercel
    const isVercel = !!process.env.VERCEL || (nextAuthUrl && nextAuthUrl.includes("vercel.app"));
    
    const diagnostics = {
      isVercel,
      nextAuthUrl: nextAuthUrl || "Not set",
      nextAuthSecret: {
        status: nextAuthSecret ? "Configured" : "Missing",
        length: secretLength,
        clue: secretClue
      },
      database: {
        status: dbStatus,
        error: dbError,
        userCount
      },
      recommendations: [] as string[]
    };
    
    if (isVercel) {
      if (nextAuthUrl && nextAuthUrl.includes("localhost")) {
        diagnostics.recommendations.push(
          "WARNING: NEXTAUTH_URL in Vercel environment variables is set to a localhost address: '" + nextAuthUrl + "'. This will prevent cookies from being set in production! Please remove this variable or change it to your production URL (e.g. 'https://hubio.lat' or your vercel.app domain)."
        );
      }
      if (!nextAuthSecret) {
        diagnostics.recommendations.push(
          "CRITICAL: NEXTAUTH_SECRET is missing in your Vercel environment variables. NextAuth requires it in production."
        );
      }
    } else {
      // Local development checks
      if (!nextAuthUrl) {
        diagnostics.recommendations.push(
          "NOTICE: NEXTAUTH_URL is not set. Locally, NextAuth defaults to http://localhost:3000."
        );
      }
    }
    
    return NextResponse.json(diagnostics);
  } catch (error: any) {
    return NextResponse.json({
      status: "DIAGNOSTICS_FAILED",
      error: error.message || String(error)
    }, { status: 500 });
  }
}
