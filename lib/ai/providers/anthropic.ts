// xd
import type { AiChatMessage, AiGenerateResult, AiStreamChunk } from "../types";

export async function anthropicGenerate(options: {
  apiKey: string;
  model: string;
  messages: AiChatMessage[];
  maxTokens?: number;
}): Promise<AiGenerateResult> {
  const system = options.messages.find((m) => m.role === "system")?.content;
  const userMessages = options.messages.filter((m) => m.role !== "system");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": options.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: options.model,
      max_tokens: options.maxTokens ?? 4096,
      system: system || undefined,
      messages: userMessages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data?.content?.[0]?.text ?? "";
  return { content, provider: "anthropic", model: options.model };
}

export async function* anthropicStream(options: {
  apiKey: string;
  model: string;
  messages: AiChatMessage[];
  maxTokens?: number;
}): AsyncGenerator<AiStreamChunk> {
  const system = options.messages.find((m) => m.role === "system")?.content;
  const userMessages = options.messages.filter((m) => m.role !== "system");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": options.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: options.model,
      max_tokens: options.maxTokens ?? 4096,
      system: system || undefined,
      stream: true,
      messages: userMessages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    }),
  });

  if (!res.ok) {
    yield { type: "error", error: `Anthropic error ${res.status}: ${(await res.text()).slice(0, 300)}` };
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    yield { type: "error", error: "Anthropic: sin cuerpo de stream" };
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
      if (!payload) continue;
      try {
        const parsed = JSON.parse(payload);
        if (parsed?.type === "content_block_delta" && parsed?.delta?.text) {
          yield { type: "delta", content: parsed.delta.text, provider: "anthropic" };
        }
        if (parsed?.type === "message_stop") {
          yield { type: "done", provider: "anthropic" };
          return;
        }
        if (parsed?.type === "error") {
          yield { type: "error", error: parsed?.error?.message || "Anthropic stream error" };
          return;
        }
      } catch {
        /* fragmento SSE parcial */
      }
    }
  }
  yield { type: "done", provider: "anthropic" };
}
