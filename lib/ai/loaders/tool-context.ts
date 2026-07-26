// xd
import { prisma } from "@/lib/prisma";

export async function loadRecentToolResults(userId: string, toolName?: string, limit = 3) {
  const rows = await prisma.toolUsage.findMany({
    where: { userId, ...(toolName ? { toolName } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { toolName: true, inputData: true, outputData: true, createdAt: true },
  });
  return rows;
}

export async function loadToolContextSummary(userId: string): Promise<string> {
  const rows = await loadRecentToolResults(userId, undefined, 5);
  if (!rows.length) return "";
  return rows
    .map(
      (r) =>
        `[${r.toolName} @ ${r.createdAt.toISOString()}] input keys: ${Object.keys(r.inputData as object).join(", ")}`
    )
    .join("\n");
}
