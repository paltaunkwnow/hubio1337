// xd
import type { ZodTypeAny } from "zod";
import type { AiChatMessage, StructuredAiResponse } from "../types";

export type AgentId =
  | "seo"
  | "pricing"
  | "roi"
  | "legal"
  | "prompt-engineer"
  | "brand"
  | "retail-pos"
  | "analytics"
  | "coach";

export interface AgentContext {
  /** Input validado del usuario / de la ruta API. */
  input: Record<string, unknown>;
  /** Datos reales (crawl, ventas, métricas) que el agente NO debe inventar. */
  crawlData?: Record<string, unknown>;
  userPlan?: string;
  /** Resumen de contexto del usuario (nombre, plan, historial) para personalizar. */
  userSummary?: string;
}

export interface AgentRunMeta {
  provider?: string;
  model?: string;
  cached?: boolean;
  durationMs?: number;
}

export interface AgentResult<T = Record<string, unknown>> {
  ai: StructuredAiResponse<T>;
  raw: string;
  meta: AgentRunMeta;
}

export interface AgentDefinition<T = Record<string, unknown>> {
  id: AgentId;
  /** Nombre profesional visible del agente. */
  name: string;
  description: string;
  capabilities: string[];
  /** Planes que pueden invocar el agente. Sin definir = todos. */
  requiredPlans?: string[];
  /** Validación de entrada con zod (dependencia ya presente en el repo). */
  inputSchema?: ZodTypeAny;
  temperature?: number;
  maxTokens?: number;
  /** Construye los mensajes (system + user) para el motor IA. */
  buildMessages(ctx: AgentContext): AiChatMessage[];
  /** Parseo/normalización de la salida cruda del modelo. */
  parseOutput?(raw: string): StructuredAiResponse<T>;
}

export const DATA_LABEL_VALUES = ["dato_real", "estimacion", "prediccion"] as const;
export type DataLabel = (typeof DATA_LABEL_VALUES)[number];
