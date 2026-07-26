// xd
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  aiGenerate,
  aiStream,
  buildAssistantSystemPrompt,
  ContextManager,
  HUBIO_ASSISTANT_OFF_TOPIC_MESSAGE,
  isLikelyOffTopic,
  isAmbiguousTopic,
  appendConversationMessage,
  getOrCreateAssistantConversation,
  loadUserAiContext,
  formatUserSummary,
  getToolsCatalogText,
  loadToolContextSummary,
  runAgent,
} from "@/lib/ai";
import {
  loadConversationContext,
  ensureConversationTitle,
  maybeSummarizeConversation,
} from "@/lib/ai/conversation-memory";
import {
  buildCoachRouterMessages,
  parseCoachDecision,
  COACH_TOOL_TO_AGENT,
  type CoachToolName,
} from "@/lib/ai/agents/coach-agent";
import { loadPosSnapshot, loadAnalyticsMetrics } from "@/lib/ai/loaders/business-data";

export const runtime = "nodejs";

/** Guardrail capa 2: clasificación LLM barata, solo en zona gris. Fail-open. */
async function classifyOnTopic(message: string, userId: string, userPlan: string): Promise<boolean> {
  try {
    const result = await aiGenerate({
      messages: [
        {
          role: "system",
          content:
            'Responde SOLO "si" o "no". ¿Es esta pregunta sobre la plataforma Hubio o sobre negocios, marketing, SEO, precios, ROI, contratos, branding, ventas o herramientas para negocios? Ante la duda responde "si".',
        },
        { role: "user", content: message.slice(0, 500) },
      ],
      maxTokens: 4,
      temperature: 0,
      toolId: "assistant-guardrail",
      userId,
      userPlan,
      skipCache: true,
    });
    return !/^no\b/i.test(result.content.trim());
  } catch {
    return true; // fail-open
  }
}

/** Orquestador coach: decide si delegar en un agente especializado. */
async function maybeInvokeSpecialist(
  message: string,
  history: Array<{ role: string; content: string }>,
  user: { id: string; plan: string }
): Promise<{ tool: CoachToolName; resultJson: unknown } | null> {
  try {
    const historySnippet = history
      .slice(-6)
      .map((m) => `${m.role === "user" ? "Usuario" : "Asistente"}: ${m.content.slice(0, 200)}`)
      .join("\n");

    const routerPass = await aiGenerate({
      messages: buildCoachRouterMessages(message, historySnippet),
      jsonMode: true,
      maxTokens: 256,
      temperature: 0,
      toolId: "coach-router",
      userId: user.id,
      userPlan: user.plan,
      skipCache: true,
    });

    const decision = parseCoachDecision(routerPass.content);
    if (decision.action !== "invoke" || !decision.tool) return null;

    const agentId = COACH_TOOL_TO_AGENT[decision.tool];
    let input: Record<string, unknown> = decision.args || {};
    let crawlData: Record<string, unknown> | undefined;

    if (decision.tool === "invoke_pos_insights") {
      const snapshot = await loadPosSnapshot(user.id);
      if (!snapshot) return null;
      input = snapshot as unknown as Record<string, unknown>;
    }
    if (decision.tool === "invoke_analytics") {
      const metrics = await loadAnalyticsMetrics(user.id);
      input = { scope: "analytics", period: `${metrics.periodDays}d` };
      crawlData = metrics as unknown as Record<string, unknown>;
    }
    if (decision.tool === "invoke_seo") {
      const url = String(input.url || "");
      if (!url) return null;
      const { crawlSeoPage } = await import("@/lib/ai/adapters/seo-crawl");
      crawlData = (await crawlSeoPage(url)) as unknown as Record<string, unknown>;
    }

    const agentResult = await runAgent(agentId, input, {
      userId: user.id,
      userPlan: user.plan,
      crawlData,
    });

    return { tool: decision.tool, resultJson: agentResult.ai.json ?? agentResult.ai.markdown };
  } catch (e) {
    console.warn("Coach orchestration falló, respondiendo directo", e);
    return null; // fail-open: el coach responde sin herramienta
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return new Response(JSON.stringify({ error: "Usuario no encontrado" }), { status: 404 });

  const body = await req.json();
  const message = String(body.message || "").trim();
  const regenerate = Boolean(body.regenerate);
  const conversationId = body.conversationId as string | undefined;

  if (!message) {
    return new Response(JSON.stringify({ error: "Mensaje requerido" }), { status: 400 });
  }

  // Guardrail capa 1: heurística. Capa 2: clasificación LLM solo en zona gris.
  let offTopic = isLikelyOffTopic(message);
  if (!offTopic && isAmbiguousTopic(message)) {
    offTopic = !(await classifyOnTopic(message, user.id, user.plan));
  }
  if (offTopic) {
    const conv = await getOrCreateAssistantConversation(user.id, conversationId);
    await appendConversationMessage(conv.id, "user", message);
    await appendConversationMessage(conv.id, "assistant", HUBIO_ASSISTANT_OFF_TOPIC_MESSAGE);
    await ensureConversationTitle(conv.id);
    return new Response(
      JSON.stringify({
        conversationId: conv.id,
        content: HUBIO_ASSISTANT_OFF_TOPIC_MESSAGE,
        offTopic: true,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  const userCtx = await loadUserAiContext(user.id);
  const toolHistory = await loadToolContextSummary(user.id);
  let system = buildAssistantSystemPrompt({
    toolsCatalog: getToolsCatalogText(),
    userSummary: formatUserSummary(userCtx),
    toolHistory,
  });

  const conv = await getOrCreateAssistantConversation(user.id, conversationId);
  const { messages: history, summary } = await loadConversationContext(conv.id);

  if (summary) {
    system += `\n\nMemoria de la conversación (resumen de mensajes anteriores):\n${summary}`;
  }

  // Orquestación: pasada de ruteo → agente especializado si corresponde.
  const invocation = await maybeInvokeSpecialist(message, history, { id: user.id, plan: user.plan });
  if (invocation) {
    const toolLabel = invocation.tool.replace(/^invoke_/, "");
    system += `\n\nRESULTADO DE HERRAMIENTA ESPECIALIZADA (${toolLabel}) — ya ejecutada con datos reales del usuario. Incorpora estos resultados en tu respuesta, cítalos con claridad y no los contradigas:\n${JSON.stringify(invocation.resultJson).slice(0, 8000)}`;
  }

  const ctx = new ContextManager();
  const messages = regenerate
    ? ctx.merge(system, history.filter((_, i, arr) => i < arr.length - 1), message)
    : ctx.merge(system, history, message);

  const encoder = new TextEncoder();
  let assistantBuffer = "";

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "meta", conversationId: conv.id, tool: invocation?.tool || null })}\n\n`)
      );

      try {
        for await (const chunk of aiStream({
          messages,
          toolId: "assistant",
          userId: user.id,
          userPlan: user.plan,
          maxTokens: 2048,
        })) {
          if (chunk.type === "delta" && chunk.content) {
            assistantBuffer += chunk.content;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "delta", content: chunk.content })}\n\n`)
            );
          }
          if (chunk.type === "error") {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "error", error: chunk.error })}\n\n`)
            );
          }
          if (chunk.type === "done") {
            if (assistantBuffer) {
              if (!regenerate) {
                await appendConversationMessage(conv.id, "user", message);
              }
              await appendConversationMessage(conv.id, "assistant", assistantBuffer);
              await ensureConversationTitle(conv.id);
              // Memoria larga: resumen best-effort, sin bloquear la respuesta.
              maybeSummarizeConversation(conv.id).catch(() => {});
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
          }
        }
      } catch (e) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: e instanceof Error ? e.message : "Error IA" })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return new Response(JSON.stringify({ error: "Usuario no encontrado" }), { status: 404 });

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");

  if (conversationId) {
    const conv = await prisma.aiConversation.findFirst({
      where: { id: conversationId, userId: user.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!conv) return new Response(JSON.stringify({ error: "No encontrado" }), { status: 404 });
    return Response.json({ conversation: conv });
  }

  const list = await prisma.aiConversation.findMany({
    where: { userId: user.id, type: "ASSISTANT" },
    orderBy: [{ favorite: "desc" }, { updatedAt: "desc" }],
    take: 30,
    select: { id: true, title: true, favorite: true, updatedAt: true, createdAt: true },
  });

  return Response.json({ conversations: list });
}

/** Marca / desmarca una conversación como favorita. */
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return new Response(JSON.stringify({ error: "Usuario no encontrado" }), { status: 404 });

  const body = await req.json();
  const conversationId = String(body.conversationId || "");
  const favorite = Boolean(body.favorite);
  if (!conversationId) {
    return new Response(JSON.stringify({ error: "conversationId requerido" }), { status: 400 });
  }

  const conv = await prisma.aiConversation.findFirst({
    where: { id: conversationId, userId: user.id },
  });
  if (!conv) return new Response(JSON.stringify({ error: "No encontrado" }), { status: 404 });

  const updated = await prisma.aiConversation.update({
    where: { id: conv.id },
    data: { favorite },
  });

  return Response.json({ success: true, conversation: { id: updated.id, favorite: updated.favorite } });
}
