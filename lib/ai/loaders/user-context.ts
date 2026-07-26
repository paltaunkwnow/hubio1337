// xd
import { prisma } from "@/lib/prisma";
import type { UserAiContext } from "../types";
import { toolsCatalogForPrompt } from "../prompt-builder";

export async function loadUserAiContext(userId: string): Promise<UserAiContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, plan: true, country: true },
  });
  if (!user) throw new Error("Usuario no encontrado");

  const recent = await prisma.toolUsage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { toolName: true, createdAt: true },
  });

  return {
    userId: user.id,
    name: user.name,
    plan: user.plan,
    country: user.country,
    recentToolUsage: recent.map((r) => ({
      toolName: r.toolName,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export function formatUserSummary(ctx: UserAiContext): string {
  const tools = ctx.recentToolUsage?.map((t) => t.toolName).join(", ") || "ninguna";
  return `Nombre: ${ctx.name}, Plan: ${ctx.plan}, País: ${ctx.country || "no indicado"}. Herramientas usadas recientemente: ${tools}.`;
}

export function getToolsCatalogText(): string {
  return toolsCatalogForPrompt();
}
