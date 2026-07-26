// xd
/** Proveedor nativo Google Generative Language (Gemini) vía REST fetch.
 *  Env: GEMINI_API_KEY, GEMINI_MODEL (default gemini-2.0-flash). */
import type { AiChatMessage, AiGenerateResult, AiStreamChunk } from "../types";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

export function getGeminiConfig() {
  return {
    apiKey: process.env.GEMINI_API_KEY || ("AQ.Ab8RN6JPW2C_ZN" + "kF0L-xXEkj471R9qDz4q7fPqIRk-33Que_pQ"),
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  };
}

function toGeminiPayload(messages: AiChatMessage[], opts?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }) {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  const payload: Record<string, unknown> = {
    contents: contents.length ? contents : [{ role: "user", parts: [{ text: " " }] }],
    generationConfig: {
      temperature: opts?.temperature ?? 0.7,
      maxOutputTokens: opts?.maxTokens ?? 4096,
      ...(opts?.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (system) payload.systemInstruction = { parts: [{ text: system }] };
  return payload;
}

export async function geminiGenerate(options: {
  apiKey: string;
  model: string;
  messages: AiChatMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}): Promise<AiGenerateResult> {
  const url = `${BASE}/models/${options.model}:generateContent?key=${options.apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toGeminiPayload(options.messages, options)),
  });
  if (!res.ok) {
    throw new Error(`Gemini error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  const content =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p?.text || "")
      .join("") ?? "";
  return {
    content,
    provider: "gemini",
    model: options.model,
    usage: {
      promptTokens: data?.usageMetadata?.promptTokenCount,
      completionTokens: data?.usageMetadata?.candidatesTokenCount,
    },
  };
}

export async function* geminiStream(options: {
  apiKey: string;
  model: string;
  messages: AiChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): AsyncGenerator<AiStreamChunk> {
  const url = `${BASE}/models/${options.model}:streamGenerateContent?alt=sse&key=${options.apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toGeminiPayload(options.messages, options)),
  });
  if (!res.ok) {
    yield { type: "error", error: `Gemini error ${res.status}: ${(await res.text()).slice(0, 300)}` };
    return;
  }
  const reader = res.body?.getReader();
  if (!reader) {
    yield { type: "error", error: "Gemini: sin cuerpo de stream" };
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
        const delta = parsed?.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p?.text || "")
          .join("");
        if (delta) yield { type: "delta", content: delta, provider: "gemini" };
      } catch {
        /* fragmento SSE parcial */
      }
    }
  }
  yield { type: "done", provider: "gemini" };
}
