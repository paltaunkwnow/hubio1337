// xd
import { getAiCache, hashCacheKey } from "./cache";
import { logAi } from "./observability";
import { checkAiRateLimit } from "./rate-limiter";
import { routeGenerate, routeStream } from "./router";
import type { AiGenerateOptions, AiGenerateResult, AiStreamChunk } from "./types";

export async function aiGenerate(options: AiGenerateOptions): Promise<AiGenerateResult> {
  const start = Date.now();
  logAi({
    event: "generate_start",
    toolId: options.toolId,
    userId: options.userId,
  });

  if (options.userId) {
    const rate = await checkAiRateLimit(options.userId, options.userPlan || "FREE");
    if (!rate.allowed) throw new Error(rate.message);
  }

  const cache = getAiCache();
  if (options.cacheKey && !options.skipCache) {
    const hit = await cache.get(hashCacheKey(["ai", options.cacheKey]));
    if (hit) {
      logAi({ event: "cache_hit", userId: options.userId, cached: true });
      return { content: hit, provider: "agentrouter", model: options.model || "cached", cached: true };
    }
  }

  try {
    const result = await routeGenerate(options.messages, {
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      jsonMode: options.jsonMode,
    });

    if (options.cacheKey && result.content) {
      await cache.set(hashCacheKey(["ai", options.cacheKey]), result.content, 1800);
    }

    logAi({
      event: "generate_success",
      provider: result.provider,
      model: result.model,
      toolId: options.toolId,
      userId: options.userId,
      durationMs: Date.now() - start,
    });

    return result;
  } catch (error) {
    logAi({
      event: "generate_error",
      toolId: options.toolId,
      userId: options.userId,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - start,
    });
    throw error;
  }
}

export async function* aiStream(
  options: AiGenerateOptions
): AsyncGenerator<AiStreamChunk> {
  logAi({ event: "stream_start", toolId: options.toolId, userId: options.userId });

  if (options.userId) {
    const rate = await checkAiRateLimit(options.userId, options.userPlan || "FREE");
    if (!rate.allowed) {
      yield { type: "error", error: rate.message };
      return;
    }
  }

  try {
    for await (const chunk of routeStream(options.messages, {
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    })) {
      if (chunk.type === "delta") {
        logAi({ event: "stream_chunk", userId: options.userId });
      }
      yield chunk;
    }
  } catch (error) {
    yield { type: "error", error: error instanceof Error ? error.message : String(error) };
  }
}
