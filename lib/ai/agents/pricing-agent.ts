// xd
import { z } from "zod";
import type { AgentDefinition } from "./types";
import { buildAgentUserMessage, DATA_LABEL_INSTRUCTIONS } from "./shared";

const inputSchema = z.object({
  category: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  currency: z.string().optional(),
  clientType: z.string().optional(),
  experienceYears: z.union([z.number(), z.string()]).optional(),
  deliveryType: z.string().optional(),
  hours: z.union([z.number(), z.string()]).optional(),
  inflation: z.union([z.number(), z.string()]).optional(),
  techStack: z.string().optional(),
  competitionLevel: z.string().optional(),
}).passthrough();

export interface PricingAgentOutput {
  markdown: string;
  min?: number;
  recommended?: number;
  premium?: number;
  hourlyRate?: number;
  estimatedHours?: number;
  marginNotes?: string;
  justification?: string;
  labels?: Record<string, string>;
}

export const pricingAgent: AgentDefinition<PricingAgentOutput> = {
  id: "pricing",
  name: "Agente de Precios Hubio",
  description: "Consultor de pricing freelance/agencia en LatAm: tarifas por experiencia, región, inflación, stack y competencia.",
  capabilities: [
    "Rangos mínimo / recomendado / premium con justificación de mercado",
    "Ajuste por inflación local, stack tecnológico y nivel de competencia",
    "Notas de margen y estrategia de negociación",
  ],
  inputSchema,
  temperature: 0.5,
  maxTokens: 3072,
  buildMessages(ctx) {
    const system = `Eres el Agente de Precios de Hubio Tools: consultor senior de pricing para freelancers y agencias en LatAm.

Usa TODOS los inputs disponibles: país/región, ciudad, moneda, inflación (%), años de experiencia, tipo de cliente, complejidad/urgencia de entrega, stack tecnológico, nivel de competencia (baja/media/alta) y horas estimadas.
El sistema incluye un "baseline" con referencia numérica real de mercado Hubio: combínalo con tu justificación; no lo contradigas sin explicar por qué.

Criterios profesionales:
- Inflación alta ⇒ recomienda ajustes o cobros en moneda dura.
- Stack especializado/escaso ⇒ premium justificado.
- Competencia alta ⇒ estrategia de diferenciación en vez de bajar precio.
${DATA_LABEL_INSTRUCTIONS}

Responde SOLO JSON válido:
{
  "markdown": "análisis completo en markdown, en español",
  "min": number,
  "recommended": number,
  "premium": number,
  "hourlyRate": number,
  "estimatedHours": number,
  "marginNotes": "notas de margen: costos, impuestos, colchón de negociación",
  "justification": "justificación de mercado en 3-5 frases",
  "labels": { "min": "estimacion", "recommended": "estimacion", "premium": "estimacion", "hourlyRate": "estimacion" }
}
Plan del usuario: ${ctx.userPlan || "FREE"}. Responde en español.`;
    return [{ role: "system", content: system }, buildAgentUserMessage(ctx)];
  },
};
