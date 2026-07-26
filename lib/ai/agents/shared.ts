// xd
import type { AiChatMessage } from "../types";
import type { AgentContext } from "./types";

/** Mensaje user estándar: inputs + datos reales, sin permitir que el modelo invente métricas. */
export function buildAgentUserMessage(ctx: AgentContext): AiChatMessage {
  const parts: string[] = [`Datos de entrada:\n${JSON.stringify(ctx.input, null, 2)}`];
  if (ctx.crawlData) {
    parts.push(`Datos reales del sistema (NO inventar, usar tal cual):\n${JSON.stringify(ctx.crawlData, null, 2)}`);
  }
  if (ctx.userSummary) {
    parts.push(`Contexto del usuario:\n${ctx.userSummary}`);
  }
  return { role: "user", content: parts.join("\n\n") };
}

export const DATA_LABEL_INSTRUCTIONS = `ETIQUETADO DE DATOS (obligatorio):
- "dato_real": proviene directamente de los datos provistos (crawl, ventas, métricas).
- "estimacion": derivado con supuestos razonables de mercado.
- "prediccion": proyección futura; SIEMPRE declara los supuestos usados.
Nunca presentes una estimación o predicción como dato real.`;
