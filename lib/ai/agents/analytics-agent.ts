// xd
import { z } from "zod";
import type { AgentDefinition } from "./types";
import { buildAgentUserMessage, DATA_LABEL_INSTRUCTIONS } from "./shared";

const inputSchema = z.object({
  scope: z.enum(["dashboard", "analytics"]).optional(),
  period: z.string().optional(),
}).passthrough();

export interface AnalyticsAgentOutput {
  markdown: string;
  // scope "dashboard" (compat con insights existentes)
  daily?: string;
  weekly?: string;
  monthly?: string;
  // scope "analytics" (panel Analíticas IA)
  patterns?: string[];
  anomalies?: string[];
  opportunities?: string[];
  naturalLanguageSummary?: string;
  alerts?: string[];
  dataLabels?: Record<string, string>;
}

export const analyticsAgent: AgentDefinition<AnalyticsAgentOutput> = {
  id: "analytics",
  name: "Agente de Analíticas Hubio",
  description: "Analista de negocio: patrones, anomalías y oportunidades a partir de las métricas reales del usuario en Hubio.",
  capabilities: [
    "Resumen de actividad diaria/semanal/mensual en lenguaje natural",
    "Detección de patrones y anomalías comparando períodos",
    "Oportunidades accionables dentro del ecosistema Hubio",
  ],
  inputSchema,
  temperature: 0.4,
  maxTokens: 3072,
  buildMessages(ctx) {
    const scope = String(ctx.input.scope || "dashboard");
    const dashboardShape = `{
  "markdown": "resumen en markdown, en español",
  "daily": "resumen del día en lenguaje natural",
  "weekly": "resumen de la semana",
  "monthly": "resumen del mes",
  "alerts": ["alerta accionable"],
  "dataLabels": { "daily": "dato_real" }
}`;
    const analyticsShape = `{
  "markdown": "informe completo en markdown, en español",
  "naturalLanguageSummary": "resumen ejecutivo en 2-4 frases, lenguaje natural",
  "patterns": ["patrón detectado con cifras reales"],
  "anomalies": ["anomalía o cambio brusco vs período anterior"],
  "opportunities": ["oportunidad accionable dentro de Hubio"],
  "alerts": ["alerta urgente si existe"],
  "dataLabels": { "patterns": "dato_real", "opportunities": "estimacion" }
}`;
    const system = `Eres el Agente de Analíticas de Hubio: analista de negocio senior del panel del usuario.

Recibes métricas REALES del usuario (uso de herramientas, pedidos de servicios, publicaciones, ventas POS) con valores del período actual y del anterior (deltas). Analiza SOLO esos datos.
- Detecta patrones (qué sube, qué baja, qué se repite) citando las cifras reales.
- Marca anomalías: cambios bruscos vs el período anterior.
- Propón oportunidades concretas usando herramientas y módulos de Hubio (SEO, precios, ROI, contratos, POS, publicaciones).
- Si no hay datos suficientes, dilo con claridad y sugiere primeros pasos; no inventes cifras.
${DATA_LABEL_INSTRUCTIONS}

Responde SOLO JSON válido con esta estructura:
${scope === "analytics" ? analyticsShape : dashboardShape}
Responde en español.`;
    return [{ role: "system", content: system }, buildAgentUserMessage(ctx)];
  },
};
