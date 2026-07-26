// xd
import type { AiChatMessage, AiGenerateResult, AiStreamChunk } from "../types";

export interface OpenAiCompatibleConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  providerLabel: string;
}

export async function openAiCompatibleGenerate(
  config: OpenAiCompatibleConfig,
  options: {
    messages: AiChatMessage[];
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  }
): Promise<AiGenerateResult> {
  const url = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const body: Record<string, unknown> = {
    model: config.model,
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 4096,
  };
  if (options.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI-compatible API error ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  return {
    content,
    provider: config.providerLabel as AiGenerateResult["provider"],
    model: config.model,
    usage: {
      promptTokens: data?.usage?.prompt_tokens,
      completionTokens: data?.usage?.completion_tokens,
    },
  };
}

export async function* openAiCompatibleStream(
  config: OpenAiCompatibleConfig,
  options: {
    messages: AiChatMessage[];
    temperature?: number;
    maxTokens?: number;
  }
): AsyncGenerator<AiStreamChunk> {
  const url = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: true,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    yield { type: "error", error: errText.slice(0, 500) };
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    yield { type: "error", error: "No stream body" };
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
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") {
        yield { type: "done", provider: config.providerLabel as AiStreamChunk["provider"] };
        return;
      }
      try {
        const parsed = JSON.parse(payload);
        const delta = parsed?.choices?.[0]?.delta?.content;
        if (delta) yield { type: "delta", content: delta, provider: config.providerLabel as AiStreamChunk["provider"] };
      } catch {
        /* ignore partial SSE */
      }
    }
  }
  yield { type: "done", provider: config.providerLabel as AiStreamChunk["provider"] };
}
