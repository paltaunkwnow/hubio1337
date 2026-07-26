// xd
import { prisma } from "@/lib/prisma";
import type { AiChatMessage } from "./types";

/** Umbral de mensajes a partir del cual se compacta la memoria vieja en un resumen. */
const SUMMARY_THRESHOLD = 16;
/** Cantidad de mensajes recientes que se mantienen literales al resumir. */
const KEEP_RECENT = 10;

export async function loadConversationMessages(conversationId: string): Promise<AiChatMessage[]> {
  const rows = await prisma.aiMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 40,
  });
  return rows.map((r) => ({ role: r.role as AiChatMessage["role"], content: r.content }));
}

export async function appendConversationMessage(
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string
) {
  await prisma.aiMessage.create({
    data: { conversationId, role, content },
  });
  await prisma.aiConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });
}

export async function getOrCreateAssistantConversation(userId: string, conversationId?: string) {
  if (conversationId) {
    const existing = await prisma.aiConversation.findFirst({
      where: { id: conversationId, userId, type: "ASSISTANT" },
    });
    if (existing) return existing;
  }
  return prisma.aiConversation.create({
    data: {
      userId,
      type: "ASSISTANT",
      title: null,
    },
  });
}

/**
 * Auto-título: si la conversación no tiene título, lo deriva del primer
 * mensaje del usuario (truncado a 60 caracteres, sin llamada LLM).
 */
export async function ensureConversationTitle(conversationId: string) {
  const conv = await prisma.aiConversation.findUnique({ where: { id: conversationId } });
  if (!conv || conv.title) return;
  const firstUser = await prisma.aiMessage.findFirst({
    where: { conversationId, role: "user" },
    orderBy: { createdAt: "asc" },
  });
  if (!firstUser) return;
  const clean = firstUser.content.replace(/\s+/g, " ").trim();
  const title = clean.length > 60 ? `${clean.slice(0, 57)}...` : clean;
  if (!title) return;
  await prisma.aiConversation.update({
    where: { id: conversationId },
    data: { title },
  });
}

/**
 * Memoria larga (rolling summary): cuando la conversación supera
 * SUMMARY_THRESHOLD mensajes, resume los más antiguos con IA y guarda el
 * resumen en AiConversation.summary. Falla en silencio (best-effort).
 */
export async function maybeSummarizeConversation(conversationId: string) {
  try {
    const total = await prisma.aiMessage.count({ where: { conversationId } });
    if (total <= SUMMARY_THRESHOLD) return;

    const conv = await prisma.aiConversation.findUnique({ where: { id: conversationId } });
    if (!conv) return;

    const older = await prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: total - KEEP_RECENT,
    });
    if (!older.length) return;

    const transcript = older
      .map((m) => `${m.role === "user" ? "Usuario" : "Asistente"}: ${m.content}`)
      .join("\n")
      .slice(0, 12000);

    // Import diferido para evitar ciclo engine → rate-limiter → ... → memoria.
    const { aiGenerate } = await import("./engine");
    const result = await aiGenerate({
      messages: [
        {
          role: "system",
          content:
            "Resume esta conversación del asistente Hubio en máximo 10 líneas, en español. Conserva: datos del negocio del usuario, decisiones tomadas, cifras mencionadas y temas pendientes. Sin preámbulos.",
        },
        {
          role: "user",
          content: `${conv.summary ? `Resumen previo:\n${conv.summary}\n\n` : ""}Conversación a resumir:\n${transcript}`,
        },
      ],
      maxTokens: 512,
      temperature: 0.3,
      toolId: "conversation-summary",
      skipCache: true,
    });

    if (result.content?.trim()) {
      await prisma.aiConversation.update({
        where: { id: conversationId },
        data: { summary: result.content.trim().slice(0, 4000) },
      });
    }
  } catch (e) {
    console.warn("No se pudo resumir la conversación", e);
  }
}

/**
 * Mensajes recientes + resumen inyectable: si existe summary, se devuelve para
 * anexarlo como contexto system y solo se mantienen los mensajes recientes.
 */
export async function loadConversationContext(conversationId: string): Promise<{
  messages: AiChatMessage[];
  summary: string | null;
}> {
  const conv = await prisma.aiConversation.findUnique({ where: { id: conversationId } });
  const rows = await prisma.aiMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: conv?.summary ? KEEP_RECENT : 40,
  });
  rows.reverse();
  return {
    messages: rows.map((r) => ({ role: r.role as AiChatMessage["role"], content: r.content })),
    summary: conv?.summary ?? null,
  };
}
