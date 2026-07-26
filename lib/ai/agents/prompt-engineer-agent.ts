// xd
import { z } from "zod";
import type { AgentDefinition } from "./types";
import { buildAgentUserMessage } from "./shared";
import { PROMPT_PLATFORMS } from "../constants";

export { PROMPT_PLATFORMS };

const inputSchema = z.object({
  tool: z.string().optional(),
  platform: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  nivel: z.string().optional(),
  creatividad: z.string().optional(),
  idioma: z.string().optional(),
  rol: z.string().optional(),
  objetivo: z.string().optional(),
  restricciones: z.string().optional(),
  formatoSalida: z.string().optional(),
}).passthrough();

export interface PromptVariation {
  platform: string;
  level: string;
  prompt: string;
  creativity?: string;
  role?: string;
  constraints?: string;
  notes?: string;
}

export interface PromptEngineerAgentOutput {
  markdown: string;
  prompts?: PromptVariation[];
}

export const promptEngineerAgent: AgentDefinition<PromptEngineerAgentOutput> = {
  id: "prompt-engineer",
  name: "Agente Prompt Engineer Hubio",
  description: "Especialista en ingeniería de prompts multi-plataforma: 3 variaciones optimizadas con formato específico por plataforma.",
  capabilities: [
    `Plataformas soportadas: ${PROMPT_PLATFORMS.join(", ")}`,
    "Controles: nivel, creatividad, idioma, rol, objetivo, restricciones y formato de salida",
    "3 variaciones por solicitud con notas de uso",
  ],
  inputSchema,
  temperature: 0.7,
  maxTokens: 3072,
  buildMessages(ctx) {
    const system = `Eres el Agente Prompt Engineer de Hubio Tools: experto en ingeniería de prompts para ${PROMPT_PLATFORMS.join(", ")}.

FORMATO POR PLATAFORMA (respétalo):
- Midjourney: descriptores separados por comas + parámetros (--ar, --v, --style).
- Flux / Stable Diffusion: prompt positivo detallado + sugerencia de negative prompt.
- Runway / Veo / Sora: descripción cinematográfica de escena, cámara, movimiento y duración.
- ChatGPT / Claude / Gemini: rol + contexto + tarea + formato de salida + restricciones.
- Cursor / Copilot / Windsurf: contexto técnico, stack, archivo objetivo y criterios de aceptación.
- Lovable / Bolt: descripción de app/pantalla, stack sugerido, diseño y comportamiento.

CONTROLES DEL USUARIO (aplícalos):
- nivel: básico (directo) / intermedio (estructurado) / experto (técnica avanzada: few-shot, chain-of-thought, seeds).
- creatividad: conservador / balanceado / creativo.
- idioma de los prompts: es / en (los metadatos y notas SIEMPRE en español).
- rol, objetivo, restricciones y formato de salida deseado.

Genera EXACTAMENTE 3 variaciones con enfoques distintos (ej. minimalista, detallada, experimental).

Responde SOLO JSON válido:
{
  "markdown": "explicación breve de las variaciones en markdown, en español",
  "prompts": [
    { "platform": "...", "level": "Variación 1 — Minimalista", "prompt": "...", "creativity": "...", "role": "...", "constraints": "...", "notes": "cuándo usar esta variación" },
    { ... }, { ... }
  ]
}
Plan del usuario: ${ctx.userPlan || "FREE"}. Responde en español (salvo el idioma pedido para los prompts).`;
    return [{ role: "system", content: system }, buildAgentUserMessage(ctx)];
  },
};
