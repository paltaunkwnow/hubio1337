// xd
import { aiGenerate, aiStream } from "../engine";
import { logAi } from "../observability";
import { parseStructuredAiContent } from "../response-formatter";
import type { AiStreamChunk } from "../types";
import { getAgent } from "./registry";
import type { AgentContext, AgentId, AgentResult } from "./types";

export interface RunAgentOptions {
  userId?: string;
  userPlan?: string;
  crawlData?: Record<string, unknown>;
  userSummary?: string;
  /** Desactiva el caché (ej. datos altamente dinámicos). */
  skipCache?: boolean;
  stream?: boolean;
}

function hashInput(input: Record<string, unknown>): string {
  const str = JSON.stringify(input);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return `${str.length}:${hash.toString(36)}`;
}

function validateInput(agentId: AgentId, input: Record<string, unknown>): Record<string, unknown> {
  const agent = getAgent(agentId);
  if (!agent.inputSchema) return input;
  const parsed = agent.inputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Entrada inválida para el agente ${agent.name}: revisá los datos enviados.`);
  }
  return parsed.data as Record<string, unknown>;
}

function checkPlan(agentId: AgentId, userPlan?: string) {
  const agent = getAgent(agentId);
  if (agent.requiredPlans && userPlan && !agent.requiredPlans.includes(userPlan)) {
    throw new Error(`Tu plan actual no permite usar ${agent.name}. Mejorá tu plan en Hubio.`);
  }
}

/**
 * Ejecuta un agente especializado: valida entrada, construye mensajes,
 * llama al motor IA (jsonMode), formatea, registra y cachea.
 */
export async function runAgent<T = Record<string, unknown>>(
  agentId: AgentId,
  input: Record<string, unknown>,
  opts: RunAgentOptions = {}
): Promise<AgentResult<T>> {
  const start = Date.now();
  const agent = getAgent(agentId);
  checkPlan(agentId, opts.userPlan);
  const validInput = validateInput(agentId, input);

  const ctx: AgentContext = {
    input: validInput,
    crawlData: opts.crawlData,
    userPlan: opts.userPlan,
    userSummary: opts.userSummary,
  };
  const messages = agent.buildMessages(ctx);

  const result = await aiGenerate({
    messages,
    jsonMode: true,
    temperature: agent.temperature,
    maxTokens: agent.maxTokens ?? 4096,
    toolId: `agent:${agentId}`,
    userId: opts.userId,
    userPlan: opts.userPlan,
    cacheKey: opts.skipCache ? undefined : `agent:${agentId}:${hashInput(validInput)}`,
    skipCache: opts.skipCache,
  });

  const parse = agent.parseOutput ?? parseStructuredAiContent;
  const ai = parse(result.content) as AgentResult<T>["ai"];

  logAi({
    event: "generate_success",
    provider: result.provider,
    model: result.model,
    toolId: `agent:${agentId}`,
    userId: opts.userId,
    durationMs: Date.now() - start,
    cached: result.cached,
  });

  return {
    ai,
    raw: result.content,
    meta: {
      provider: result.provider,
      model: result.model,
      cached: result.cached,
      durationMs: Date.now() - start,
    },
  };
}

/** Variante streaming: valida y construye mensajes, delega en aiStream. */
export async function* runAgentStream(
  agentId: AgentId,
  input: Record<string, unknown>,
  opts: RunAgentOptions = {}
): AsyncGenerator<AiStreamChunk> {
  const agent = getAgent(agentId);
  checkPlan(agentId, opts.userPlan);
  const validInput = validateInput(agentId, input);
  const messages = agent.buildMessages({
    input: validInput,
    crawlData: opts.crawlData,
    userPlan: opts.userPlan,
    userSummary: opts.userSummary,
  });
  yield* aiStream({
    messages,
    temperature: agent.temperature,
    maxTokens: agent.maxTokens ?? 2048,
    toolId: `agent:${agentId}`,
    userId: opts.userId,
    userPlan: opts.userPlan,
  });
}
