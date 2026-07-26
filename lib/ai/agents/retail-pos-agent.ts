// xd
import { z } from "zod";
import type { AgentDefinition } from "./types";
import { buildAgentUserMessage, DATA_LABEL_INSTRUCTIONS } from "./shared";

const inputSchema = z.object({
  salesSummary: z.array(z.record(z.string(), z.unknown())).optional(),
  inventory: z.array(z.record(z.string(), z.unknown())).optional(),
  currency: z.string().optional(),
}).passthrough();

export interface RetailPosAgentOutput {
  markdown: string;
  starProducts?: string[];
  lowRotation?: string[];
  alerts?: string[];
  predictions?: Array<{ text: string; label: string; assumptions?: string[] } | string>;
  repositionSuggestions?: string[];
  dataLabels?: Record<string, string>;
}

export const retailPosAgent: AgentDefinition<RetailPosAgentOutput> = {
  id: "retail-pos",
  name: "Agente Retail POS Hubio",
  description: "Analista retail: productos estrella, baja rotación, alertas de stock, predicciones etiquetadas y sugerencias de reposición.",
  capabilities: [
    "Detección de productos estrella y de baja rotación con datos reales de ventas",
    "Alertas de stock crítico",
    "Predicciones de demanda etiquetadas con supuestos",
    "Sugerencias de reposición de inventario",
  ],
  inputSchema,
  temperature: 0.4,
  maxTokens: 3072,
  buildMessages(ctx) {
    const system = `Eres el Agente Retail POS de Hubio: analista senior de retail y gestión de inventario.

Analiza SOLO las ventas e inventario reales provistos. No inventes productos ni cifras.
- "starProducts": productos con mayor volumen/frecuencia de venta (con cifras reales).
- "lowRotation": productos con stock pero pocas o ninguna venta.
- "alerts": stock crítico (productos que se venden y tienen stock bajo), anomalías de precio/costo.
- "predictions": proyecciones de demanda; CADA una etiquetada "prediccion" con supuestos explícitos (ej. "si el ritmo de ventas de los últimos X días se mantiene...").
- "repositionSuggestions": cantidades sugeridas de reposición por producto, basadas en el ritmo de venta real observado.
${DATA_LABEL_INSTRUCTIONS}

Responde SOLO JSON válido:
{
  "markdown": "análisis completo en markdown, en español",
  "starProducts": ["Producto X — 24 unidades vendidas"],
  "lowRotation": ["Producto Y — 0 ventas, 30 en stock"],
  "alerts": ["Stock crítico: ..."],
  "predictions": [{ "text": "...", "label": "prediccion", "assumptions": ["..."] }],
  "repositionSuggestions": ["Reponer ~20 unidades de Producto X (ritmo real: 3/día)"],
  "dataLabels": { "starProducts": "dato_real", "lowRotation": "dato_real", "predictions": "prediccion", "repositionSuggestions": "estimacion" }
}
Responde en español.`;
    return [{ role: "system", content: system }, buildAgentUserMessage(ctx)];
  },
};
