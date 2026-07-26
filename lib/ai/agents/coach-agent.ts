// xd
import { z } from "zod";
import type { AgentDefinition, AgentId } from "./types";
import { buildAgentUserMessage } from "./shared";

/** Especificaciones estilo OpenAI functions para el orquestador. */
export const COACH_TOOL_SPECS = [
  {
    name: "invoke_seo",
    description: "Audita el SEO de una URL (crawl real + análisis). Requiere una URL explícita del usuario.",
    parameters: { type: "object", properties: { url: { type: "string" }, competitors: { type: "array", items: { type: "string" }, maxItems: 2 } }, required: ["url"] },
  },
  {
    name: "invoke_pricing",
    description: "Calcula tarifas recomendadas para un servicio freelance/agencia (categoría, región, experiencia, horas).",
    parameters: { type: "object", properties: { category: { type: "string" }, region: { type: "string" }, experienceYears: { type: "number" }, hours: { type: "number" }, inflation: { type: "number" }, techStack: { type: "string" }, competitionLevel: { type: "string" } } },
  },
  {
    name: "invoke_roi",
    description: "Proyecta ROI de una campaña publicitaria (presupuesto diario, audiencia, conversión, ticket, días).",
    parameters: { type: "object", properties: { price: { type: "number" }, audience: { type: "number" }, conversion: { type: "number" }, ticket: { type: "number" }, days: { type: "number" } } },
  },
  {
    name: "invoke_legal",
    description: "Genera o explica un contrato de servicios (partes, servicio, precio, país).",
    parameters: { type: "object", properties: { clientName: { type: "string" }, freelancerName: { type: "string" }, serviceDescription: { type: "string" }, price: { type: "string" }, country: { type: "string" } } },
  },
  {
    name: "invoke_prompt_engineer",
    description: "Genera prompts optimizados para plataformas de IA (ChatGPT, Midjourney, Cursor, etc.).",
    parameters: { type: "object", properties: { platform: { type: "string" }, description: { type: "string" }, nivel: { type: "string" }, idioma: { type: "string" } } },
  },
  {
    name: "invoke_brand",
    description: "Analiza identidad de marca y propone paleta de colores profesional con WCAG.",
    parameters: { type: "object", properties: { brand: { type: "string" }, sector: { type: "string" } } },
  },
  {
    name: "invoke_pos_insights",
    description: "Analiza las ventas e inventario reales del POS del usuario (no requiere argumentos; el sistema carga los datos).",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "invoke_analytics",
    description: "Analiza las métricas reales del panel del usuario: patrones, anomalías y oportunidades (no requiere argumentos).",
    parameters: { type: "object", properties: {} },
  },
] as const;

export type CoachToolName = (typeof COACH_TOOL_SPECS)[number]["name"];

export const COACH_TOOL_TO_AGENT: Record<CoachToolName, AgentId> = {
  invoke_seo: "seo",
  invoke_pricing: "pricing",
  invoke_roi: "roi",
  invoke_legal: "legal",
  invoke_prompt_engineer: "prompt-engineer",
  invoke_brand: "brand",
  invoke_pos_insights: "retail-pos",
  invoke_analytics: "analytics",
};

export interface CoachRouteDecision {
  action: "answer" | "invoke";
  tool?: CoachToolName;
  args?: Record<string, unknown>;
}

/** Mensajes para la pasada de ruteo (no streaming, jsonMode). */
export function buildCoachRouterMessages(userMessage: string, historySnippet: string): Array<{ role: "system" | "user"; content: string }> {
  const toolsDoc = COACH_TOOL_SPECS.map(
    (t) => `- ${t.name}: ${t.description}\n  parámetros: ${JSON.stringify(t.parameters.properties)}`
  ).join("\n");
  return [
    {
      role: "system",
      content: `Eres el router del Coach IA de Hubio. Decide si la consulta del usuario se responde directamente o si conviene invocar una herramienta especializada.

Herramientas disponibles:
${toolsDoc}

REGLAS:
- Invoca una herramienta SOLO si la consulta pide explícitamente ese análisis Y hay argumentos suficientes (ej. invoke_seo necesita URL).
- invoke_pos_insights e invoke_analytics no necesitan argumentos.
- Ante la duda, responde {"action":"answer"}.

Responde SOLO JSON válido: {"action":"answer"} o {"action":"invoke","tool":"invoke_x","args":{...}}`,
    },
    {
      role: "user",
      content: `${historySnippet ? `Contexto reciente de la conversación:\n${historySnippet}\n\n` : ""}Mensaje del usuario:\n${userMessage}`,
    },
  ];
}

export function parseCoachDecision(raw: string): CoachRouteDecision {
  try {
    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as CoachRouteDecision;
    if (parsed.action === "invoke" && parsed.tool && parsed.tool in COACH_TOOL_TO_AGENT) {
      return { action: "invoke", tool: parsed.tool, args: parsed.args || {} };
    }
  } catch {
    /* fail-open → answer */
  }
  return { action: "answer" };
}

const inputSchema = z.object({ message: z.string().min(1) }).passthrough();

export interface CoachAgentOutput {
  markdown: string;
}

/** Definición del agente coach (orquestador del asistente). */
export const coachAgent: AgentDefinition<CoachAgentOutput> = {
  id: "coach",
  name: "Coach IA Hubio",
  description: "Orquestador del asistente: responde sobre la plataforma y delega en los agentes especializados cuando corresponde.",
  capabilities: [
    "Respuestas sobre toda la plataforma Hubio (herramientas, planes, panel, POS)",
    `Delegación en agentes especializados: ${Object.values(COACH_TOOL_TO_AGENT).join(", ")}`,
  ],
  inputSchema,
  temperature: 0.6,
  maxTokens: 2048,
  buildMessages(ctx) {
    const system = `Eres el Coach IA oficial de Hubio (hubio.lat): mentor de negocio profesional que ayuda a usuarios a crecer usando la plataforma.
Respondes en español, tono profesional y cercano, con markdown cuando ayude.
Solo temas de la plataforma Hubio: herramientas, SEO, precios, ROI, contratos, branding, marketing, ventas, POS y panel.
${ctx.userSummary ? `\nContexto del usuario:\n${ctx.userSummary}` : ""}`;
    return [{ role: "system", content: system }, buildAgentUserMessage(ctx)];
  },
};
