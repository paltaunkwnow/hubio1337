// xd
import { getAiConfig } from "./config";
import type { AiProviderId } from "./types";
import { openAiCompatibleGenerate, openAiCompatibleStream } from "./providers/openai-compatible";
import { anthropicGenerate, anthropicStream } from "./providers/anthropic";
import { geminiGenerate, geminiStream, getGeminiConfig } from "./providers/gemini";
import { getOllamaConfig, isOllamaConfigured, ollamaGenerate, ollamaStream } from "./providers/ollama";
import { logAi } from "./observability";
import type { AiChatMessage, AiGenerateResult, AiStreamChunk } from "./types";

const OPENAI_COMPAT_PROVIDERS: AiProviderId[] = [
  "openai",
  "agentrouter",
  "deepseek",
  "mistral",
  "openrouter",
  "groq",
  "google",
];

function resolveOpenAiBase(provider: AiProviderId, baseUrl: string): string {
  if (baseUrl && !baseUrl.includes("agentrouter")) return baseUrl;
  const defaults: Partial<Record<AiProviderId, string>> = {
    openai: "https://api.openai.com/v1",
    deepseek: "https://api.deepseek.com/v1",
    mistral: "https://api.mistral.ai/v1",
    openrouter: "https://openrouter.ai/api/v1",
    groq: "https://api.groq.com/openai/v1",
    google: "https://generativelanguage.googleapis.com/v1beta/openai",
    agentrouter: "https://agentrouter.org/v1",
  };
  return defaults[provider] || baseUrl;
}

export function getProviderChain(preferred?: AiProviderId): AiProviderId[] {
  const { provider } = getAiConfig();
  const primary = preferred || provider;
  const chain: AiProviderId[] = [primary];
  if (primary !== "agentrouter") chain.push("agentrouter");
  if (primary !== "openai" && process.env.OPENAI_API_KEY) chain.push("openai");
  if (primary !== "anthropic" && process.env.ANTHROPIC_API_KEY) chain.push("anthropic");
  if (primary !== "gemini" && process.env.GEMINI_API_KEY) chain.push("gemini");
  if (primary !== "ollama" && isOllamaConfigured()) chain.push("ollama");
  return Array.from(new Set(chain)) as AiProviderId[];
}

async function generateWithProvider(
  p: AiProviderId,
  messages: AiChatMessage[],
  opts?: { model?: string; temperature?: number; maxTokens?: number; jsonMode?: boolean }
): Promise<AiGenerateResult | null> {
  const config = getAiConfig();

  if (p === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY || config.apiKey;
    if (!key) return null;
    return anthropicGenerate({
      apiKey: key,
      model: opts?.model || process.env.ANTHROPIC_MODEL || config.model,
      messages,
      maxTokens: opts?.maxTokens,
    });
  }

  if (p === "gemini") {
    const gemini = getGeminiConfig();
    if (!gemini.apiKey) return null;
    return geminiGenerate({
      apiKey: gemini.apiKey,
      model: opts?.model || gemini.model,
      messages,
      temperature: opts?.temperature,
      maxTokens: opts?.maxTokens,
      jsonMode: opts?.jsonMode,
    });
  }

  if (p === "ollama") {
    const ollama = getOllamaConfig();
    return ollamaGenerate({
      baseUrl: ollama.baseUrl,
      model: opts?.model || ollama.model,
      messages,
      temperature: opts?.temperature,
      maxTokens: opts?.maxTokens,
      jsonMode: opts?.jsonMode,
    });
  }

  if (OPENAI_COMPAT_PROVIDERS.includes(p)) {
    const key = p === "openai" ? process.env.OPENAI_API_KEY || config.apiKey : config.apiKey;
    if (!key) return null;
    return openAiCompatibleGenerate(
      {
        baseUrl: resolveOpenAiBase(p, config.baseUrl),
        apiKey: key,
        model: opts?.model || config.model,
        providerLabel: p,
      },
      {
        messages,
        temperature: opts?.temperature,
        maxTokens: opts?.maxTokens,
        jsonMode: opts?.jsonMode,
      }
    );
  }

  return null;
}

export async function routeGenerate(
  messages: AiChatMessage[],
  opts?: { model?: string; temperature?: number; maxTokens?: number; jsonMode?: boolean; provider?: AiProviderId }
): Promise<AiGenerateResult> {
  const chain = getProviderChain(opts?.provider);
  let lastError: Error | null = null;

  for (const p of chain) {
    try {
      const result = await generateWithProvider(p, messages, opts);
      if (result) return result;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      logAi({ event: "fallback", provider: p, error: lastError.message });
    }
  }

  throw lastError || new Error("No AI provider available");
}

export async function* routeStream(
  messages: AiChatMessage[],
  opts?: { model?: string; temperature?: number; maxTokens?: number; provider?: AiProviderId }
): AsyncGenerator<AiStreamChunk> {
  const config = getAiConfig();
  const p = opts?.provider || config.provider;

  if (p === "anthropic") {
    yield* anthropicStream({
      apiKey: process.env.ANTHROPIC_API_KEY || config.apiKey,
      model: opts?.model || process.env.ANTHROPIC_MODEL || config.model,
      messages,
      maxTokens: opts?.maxTokens,
    });
    return;
  }

  if (p === "gemini") {
    const gemini = getGeminiConfig();
    if (!gemini.apiKey) {
      yield { type: "error", error: "GEMINI_API_KEY no configurada" };
      return;
    }
    yield* geminiStream({
      apiKey: gemini.apiKey,
      model: opts?.model || gemini.model,
      messages,
      temperature: opts?.temperature,
      maxTokens: opts?.maxTokens,
    });
    return;
  }

  if (p === "ollama") {
    const ollama = getOllamaConfig();
    yield* ollamaStream({
      baseUrl: ollama.baseUrl,
      model: opts?.model || ollama.model,
      messages,
      temperature: opts?.temperature,
      maxTokens: opts?.maxTokens,
    });
    return;
  }

  const key = config.apiKey || process.env.OPENAI_API_KEY || "";
  if (!key) {
    yield { type: "error", error: "AI_API_KEY no configurada" };
    return;
  }

  yield* openAiCompatibleStream(
    {
      baseUrl: resolveOpenAiBase(p, config.baseUrl),
      apiKey: key,
      model: opts?.model || config.model,
      providerLabel: p,
    },
    { messages, temperature: opts?.temperature, maxTokens: opts?.maxTokens }
  );
}
