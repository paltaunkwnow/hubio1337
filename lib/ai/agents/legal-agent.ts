// xd
import { z } from "zod";
import type { AgentDefinition } from "./types";
import { buildAgentUserMessage } from "./shared";
import { LEGAL_DISCLAIMER } from "../constants";

export { LEGAL_DISCLAIMER };

const inputSchema = z.object({
  clientName: z.string().optional(),
  freelancerName: z.string().optional(),
  serviceDescription: z.string().optional(),
  price: z.union([z.number(), z.string()]).optional(),
  currency: z.string().optional(),
  country: z.string().optional(),
  startDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  revisions: z.union([z.number(), z.string()]).optional(),
  paymentMethod: z.string().optional(),
  confidentiality: z.boolean().optional(),
  ip: z.boolean().optional(),
}).passthrough();

export interface LegalAgentOutput {
  markdown: string;
  contractText?: string;
  missingFields?: string[];
  riskClauses?: string[];
  clauseExplanations?: Array<{ clause: string; explanation: string }>;
  countryNotes?: string;
}

export const legalAgent: AgentDefinition<LegalAgentOutput> = {
  id: "legal",
  name: "Agente Legal Hubio",
  description: "Redactor de contratos de servicios en español: contratos completos, cláusulas de riesgo y explicación cláusula por cláusula.",
  capabilities: [
    "Redacción de contratos de prestación de servicios adaptados por país y moneda",
    "Detección de campos faltantes antes de generar",
    "Cláusulas de riesgo sugeridas y explicación cláusula por cláusula",
  ],
  inputSchema,
  temperature: 0.3,
  maxTokens: 4096,
  buildMessages(ctx) {
    const system = `Eres el Agente Legal de Hubio Tools: abogado redactor de contratos de servicios profesionales en español para LatAm y España.

REGLAS:
- Respeta país y moneda indicados; incluye notas específicas del país en "countryNotes".
- Detecta campos faltantes u obviamente incompletos y lístalos en "missingFields" (usa los nombres de campo: clientName, freelancerName, serviceDescription, price, country, startDate, deliveryDate).
- Sugiere cláusulas de protección de riesgo en "riskClauses" (mora, alcance, terminación anticipada, penalidades).
- Explica CADA cláusula principal del contrato en "clauseExplanations": lenguaje simple, qué protege y a quién.
- El contrato debe ser completo y profesional: declaraciones, objeto, plazo, precio y forma de pago, revisiones, confidencialidad (si aplica), propiedad intelectual (si aplica), resolución de conflictos, firmas.
- SIEMPRE cierra el markdown con el descargo: "${LEGAL_DISCLAIMER}"

Responde SOLO JSON válido:
{
  "markdown": "resumen y notas legales en markdown, en español",
  "contractText": "texto completo del contrato listo para firmar",
  "missingFields": ["campo1"],
  "riskClauses": ["cláusula de riesgo sugerida"],
  "clauseExplanations": [{ "clause": "PRIMERA: Objeto", "explanation": "explicación simple" }],
  "countryNotes": "consideraciones legales del país"
}
Plan del usuario: ${ctx.userPlan || "FREE"}. Responde en español.`;
    return [{ role: "system", content: system }, buildAgentUserMessage(ctx)];
  },
};
