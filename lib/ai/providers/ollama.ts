// xd
/** Proveedor local Ollama vía REST nativo (/api/chat).
 *  Env: OLLAMA_BASE_URL (default http://localhost:11434), OLLAMA_MODEL (default llama3.1). */
import type { AiChatMessage, AiGenerateResult, AiStreamChunk } from "../types";

export function getOllamaConfig() {
  return {
    baseUrl: (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/$/, ""),
    model: process.env.OLLAMA_MODEL || "llama3.1",
  };
}

export function isOllamaConfigured(): boolean {
  return Boolean(process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL);
}

export async function ollamaGenerate(options: {
  baseUrl: string;
  model: string;
  messages: AiChatMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}): Promise<AiGenerateResult> {
  const res = await fetch(`${options.baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      stream: false,
      ...(options.jsonMode ? { format: "json" } : {}),
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens ?? 4096,
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Ollama error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  return {
    content: data?.message?.content ?? "",
    provider: "ollama",
    model: options.model,
    usage: {
      promptTokens: data?.prompt_eval_count,
      completionTokens: data?.eval_count,
    },
  };
}

export async function* ollamaStream(options: {
  baseUrl: string;
  model: string;
  messages: AiChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): AsyncGenerator<AiStreamChunk> {
  const res = await fetch(`${options.baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      stream: true,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens ?? 4096,
      },
    }),
  });
  if (!res.ok) {
    yield { type: "error", error: `Ollama error ${res.status}: ${(await res.text()).slice(0, 300)}` };
    return;
  }
  const reader = res.body?.getReader();
  if (!reader) {
    yield { type: "error", error: "Ollama: sin cuerpo de stream" };
    return;
  }
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed);
        const delta = parsed?.message?.content;
        if (delta) yield { type: "delta", content: delta, provider: "ollama" };
        if (parsed?.done) {
          yield { type: "done", provider: "ollama" };
          return;
        }
      } catch {
        /* línea NDJSON parcial */
      }
    }
  }
  yield { type: "done", provider: "ollama" };
}
