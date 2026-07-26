// xd
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { checkToolAccess } from "@/lib/toolAccess";
import { crawlSeoPage, crawlCompetitors } from "@/lib/ai/adapters/seo-crawl";
import { enhanceWithAi } from "@/lib/ai/adapters/tool-enhance";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });

    const access = await checkToolAccess(user.id, "seo-analyzer");
    if (!access.allowed) return NextResponse.json({ success: false, error: access.message }, { status: 403 });

    const body = await req.json();
    const url = String(body.url || "");
    if (!url) return NextResponse.json({ success: false, error: "URL requerida" }, { status: 400 });

    // Competidores opcionales (máx. 2 URLs)
    const competitorUrls = Array.isArray(body.competitors)
      ? (body.competitors as unknown[]).map(String).filter(Boolean).slice(0, 2)
      : [];

    const [crawl, competitorCrawls] = await Promise.all([
      crawlSeoPage(url),
      competitorUrls.length ? crawlCompetitors(competitorUrls) : Promise.resolve([]),
    ]);

    const crawlData: Record<string, unknown> = { ...crawl };
    if (competitorCrawls.length) crawlData.competitors = competitorCrawls;

    const aiPack = await enhanceWithAi("seo-analyzer", body, {
      crawlData,
      userId: user.id,
      userPlan: user.plan,
    });

    const result = {
      ...crawl,
      competitors: competitorCrawls,
      ai: aiPack?.ai?.json ?? null,
      aiMarkdown: aiPack?.ai?.markdown ?? null,
    };

    await prisma.toolUsage.create({
      data: { userId: user.id, toolName: "seo-analyzer", inputData: body, outputData: result as object },
    }).catch(() => {});

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("SEO analyzer error", error);
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}
