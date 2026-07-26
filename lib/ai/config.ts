// xd
import type { AiProviderId } from "./types";

export function getAiConfig() {
  const provider = (process.env.AI_PROVIDER || "agentrouter") as AiProviderId;
  const baseUrl =
    process.env.AI_BASE_URL ||
    (provider === "anthropic"
      ? "https://api.anthropic.com"
      : provider === "ollama"
        ? "http://localhost:11434/v1"
        : "https://agentrouter.org/v1");
  const apiKey =
    provider === "agentrouter"
      ? "sk-717HvumFV0vIOt4uiw75oJzHHUIri214wuivOGJuqjS4Yc1I"
      : (process.env.AI_API_KEY ||
         process.env.OPENAI_API_KEY ||
         process.env.ANTHROPIC_API_KEY ||
         "");
  const model =
    process.env.AI_MODEL ||
    (provider === "anthropic"
      ? process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022"
      : "gpt-5.5");

  return { provider, baseUrl, apiKey, model };
}

export const HUBIO_ASSISTANT_OFF_TOPIC_MESSAGE =
  "Solo puedo ayudarte con temas de la plataforma Hubio: herramientas, SEO, precios, ROI, contratos, branding, marketing, ventas y tu panel. Reformulá tu pregunta en ese contexto.";

/** Límites diarios de IA por plan. ELITE = ilimitado (Infinity). */
export const PLAN_RATE_LIMITS: Record<string, { perMinute: number; perDay: number }> = {
  FREE: { perMinute: 5, perDay: 10 },
  PROFESSIONAL: { perMinute: 15, perDay: 50 },
  EMPRESA: { perMinute: 30, perDay: 200 },
  ELITE: { perMinute: 60, perDay: Number.POSITIVE_INFINITY },
};
