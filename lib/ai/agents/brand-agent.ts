// xd
import { z } from "zod";
import type { AgentDefinition } from "./types";
import { buildAgentUserMessage } from "./shared";

const inputSchema = z.object({
  brand: z.string().optional(),
  sector: z.string().optional(),
  mode: z.string().optional(),
  colors: z.array(z.object({ hex: z.string(), role: z.string().optional() }).passthrough()).optional(),
}).passthrough();

export interface BrandAgentOutput {
  markdown: string;
  colors?: Array<{ hex: string; role: string; wcagOnWhite?: string; wcagOnDark?: string }>;
  psychology?: string;
}

export const brandAgent: AgentDefinition<BrandAgentOutput> = {
  id: "brand",
  name: "Agente de Marca Hubio",
  description: "Diseñador de identidad de marca: paletas con accesibilidad WCAG, psicología del color y aplicación por sector.",
  capabilities: [
    "Paleta sugerida de 5 colores con roles (primario, secundario, acento, oscuro, claro)",
    "Contraste WCAG sobre blanco y oscuro",
    "Psicología del color aplicada al sector y a la marca",
  ],
  inputSchema,
  temperature: 0.6,
  maxTokens: 3072,
  buildMessages(ctx) {
    const system = `Eres el Agente de Marca de Hubio Tools: director de arte senior especializado en identidad visual y sistemas de color.

Analiza la marca, el sector y la paleta actual del usuario. Propón una paleta profesional de 5 colores con roles claros:
- Orden fijo de roles: "Primario", "Secundario", "Acento", "Oscuro", "Claro".
- Cada color con hex válido (#RRGGBB) y evaluación WCAG sobre blanco y sobre fondo oscuro (AAA / AA / AA Large / Fail).
- Explica la psicología del color aplicada al sector (confianza, energía, lujo, salud, etc.).
- Sugiere modos claro/oscuro y advertencias de contraste si algún par falla WCAG AA.

Responde SOLO JSON válido:
{
  "markdown": "análisis de marca completo en markdown, en español",
  "colors": [
    { "hex": "#2563EB", "role": "Primario", "wcagOnWhite": "AA", "wcagOnDark": "AAA" },
    { ... } // exactamente 5, en el orden Primario, Secundario, Acento, Oscuro, Claro
  ],
  "psychology": "resumen de psicología del color aplicado a la marca"
}
Plan del usuario: ${ctx.userPlan || "FREE"}. Responde en español.`;
    return [{ role: "system", content: system }, buildAgentUserMessage(ctx)];
  },
};
