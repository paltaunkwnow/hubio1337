// xd
import { z } from "zod";
import type { AgentDefinition } from "./types";
import { buildAgentUserMessage, DATA_LABEL_INSTRUCTIONS } from "./shared";

const numeric = z.union([z.number(), z.string()]);

const inputSchema = z.object({
  price: numeric.optional(),
  audience: numeric.optional(),
  conversion: numeric.optional(),
  ticket: numeric.optional(),
  days: numeric.optional(),
  ctr: numeric.optional(),
  cpa: numeric.optional(),
  ltv: numeric.optional(),
  retention: numeric.optional(),
  margin: numeric.optional(),
}).passthrough();

export interface RoiScenario {
  roi?: number | string;
  ingresos?: number | string;
  inversion?: number | string;
  clientes?: number | string;
  [key: string]: unknown;
}

export interface RoiAgentOutput {
  markdown: string;
  scenarios?: { optimistic: RoiScenario; realistic: RoiScenario; pessimistic: RoiScenario };
  risks?: string[];
  recommendations?: string[];
  chartData?: Array<{ name: string; inversion: number; ingresos: number }>;
  dataLabels?: Record<string, string>;
}

export const roiAgent: AgentDefinition<RoiAgentOutput> = {
  id: "roi",
  name: "Agente ROI Hubio",
  description: "Analista de ROI publicitario: escenarios optimista/realista/pesimista con métricas avanzadas (CTR, CPA, LTV, retención, margen).",
  capabilities: [
    "Escenarios optimista / realista / pesimista con supuestos explícitos",
    "Análisis de métricas avanzadas: CTR, CPA, LTV, retención, margen",
    "Riesgos y recomendaciones accionables",
  ],
  inputSchema,
  temperature: 0.4,
  maxTokens: 3072,
  buildMessages(ctx) {
    const system = `Eres el Agente ROI de Hubio Tools: analista senior de performance marketing.

El sistema calcula un "baseline" real (inversión, clientes potenciales, ingresos, ROI, break-even): úsalo como escenario realista de partida.
Si hay métricas avanzadas (CTR %, CPA, LTV, retención %, margen %), incorpóralas: LTV alto mejora el ROI de largo plazo, margen bajo reduce ganancia neta, CPA vs ticket define viabilidad.
Los escenarios optimista/pesimista deben declarar el supuesto de variación aplicado (ej. conversión ±25%).
${DATA_LABEL_INSTRUCTIONS}

Responde SOLO JSON válido:
{
  "markdown": "análisis completo en markdown, en español",
  "scenarios": {
    "optimistic": { "roi": number, "ingresos": number, "inversion": number, "clientes": number, "supuesto": "..." },
    "realistic": { ... },
    "pessimistic": { ... }
  },
  "risks": ["riesgo 1", "..."],
  "recommendations": ["recomendación accionable", "..."],
  "chartData": [{ "name": "Optimista", "inversion": number, "ingresos": number }, { "name": "Realista", ... }, { "name": "Pesimista", ... }],
  "dataLabels": { "scenarios.realistic": "dato_real", "scenarios.optimistic": "prediccion", "scenarios.pessimistic": "prediccion" }
}
Plan del usuario: ${ctx.userPlan || "FREE"}. Responde en español.`;
    return [{ role: "system", content: system }, buildAgentUserMessage(ctx)];
  },
};
