// xd
/**
 * Wrapper de compatibilidad: enhanceWithAi mantiene su firma original,
 * pero ahora delega en el sistema de agentes especializados (lib/ai/agents).
 */
import { aiGenerate, buildToolPrompt, parseStructuredAiContent } from "@/lib/ai";
import { getAiConfig } from "@/lib/ai/config";
import { runAgent } from "@/lib/ai/agents/run-agent";
import { TOOL_TO_AGENT } from "@/lib/ai/agents/registry";

function hasAnyProvider(): boolean {
  const { apiKey } = getAiConfig();
  return Boolean(
    apiKey ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.OLLAMA_BASE_URL ||
      process.env.OLLAMA_MODEL
  );
}

export async function enhanceWithAi<T = Record<string, unknown>>(
  toolId: string,
  input: Record<string, unknown>,
  opts?: {
    crawlData?: Record<string, unknown>;
    userId?: string;
    userPlan?: string;
    skipCache?: boolean;
  }
): Promise<{ ai: import("@/lib/ai/types").StructuredAiResponse<T>; raw?: string } | null> {
  if (!hasAnyProvider()) return null;

  try {
    const agentId = TOOL_TO_AGENT[toolId];
    if (agentId && agentId !== "coach") {
      const result = await runAgent<T>(agentId, input, {
        crawlData: opts?.crawlData,
        userId: opts?.userId,
        userPlan: opts?.userPlan,
        skipCache: opts?.skipCache,
      });
      return { ai: result.ai, raw: result.raw };
    }

    // Fallback legado para toolIds sin agente registrado.
    const messages = buildToolPrompt({
      toolId,
      input,
      crawlData: opts?.crawlData,
      userPlan: opts?.userPlan,
    });
    const result = await aiGenerate({
      messages,
      jsonMode: true,
      toolId,
      userId: opts?.userId,
      userPlan: opts?.userPlan,
      maxTokens: 4096,
      cacheKey: `${toolId}:${JSON.stringify(input).slice(0, 200)}`,
    });
    return { ai: parseStructuredAiContent<T>(result.content), raw: result.content };
  } catch (e) {
    console.warn(`AI enhancement failed for ${toolId}`, e);
    return null;
  }
}
