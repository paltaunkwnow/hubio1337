// xd
import type { AiProviderId } from "./types";

export type AiLogEvent =
  | "generate_start"
  | "generate_success"
  | "generate_error"
  | "stream_start"
  | "stream_chunk"
  | "stream_done"
  | "fallback"
  | "rate_limited"
  | "cache_hit";

export interface AiLogPayload {
  event: AiLogEvent;
  provider?: AiProviderId;
  model?: string;
  toolId?: string;
  userId?: string;
  durationMs?: number;
  error?: string;
  cached?: boolean;
}

export function logAi(payload: AiLogPayload) {
  const line = `[Hubio AI] ${JSON.stringify({ ...payload, ts: new Date().toISOString() })}`;
  if (payload.event.includes("error") || payload.event === "rate_limited") {
    console.warn(line);
  } else {
    console.log(line);
  }
}
