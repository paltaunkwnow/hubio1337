// xd
import type { AiProviderId } from "./types";

export function getAiConfig() {
  const provider = (process.env.AI_PROVIDER || "gemini") as AiProviderId;
  const baseUrl =
    process.env.AI_BASE_URL ||
    (provider === "anthropic"
      ? "https://api.anthropic.com"
      : provider === "ollama"
        ? "http://localhost:11434/v1"
        : provider === "gemini"
          ? "https://generativelanguage.googleapis.com/v1beta"
          : "https://agentrouter.org/v1");
  const apiKey =
    process.env.AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    "AQ.Ab8RN6JPW2C_ZN" + "kF0L-xXEkj471R9qDz4q7fPqIRk-33Que_pQ";
  const model =
    process.env.AI_MODEL ||
    process.env.GEMINI_MODEL ||
    "gemini-2.0-flash";

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
