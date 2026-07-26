// xd
import type { AiChatMessage, ToolPromptContext } from "./types";
import { TOOL_REQUIREMENTS } from "@/lib/toolPlanCatalog";

export function buildAssistantSystemPrompt(context: {
  toolsCatalog: string;
  userSummary: string;
  toolHistory: string;
}): string {
  return `Eres el Asistente IA oficial de Hubio (hubio.lat), marketplace de publicidad, servicios, empleo y herramientas para negocios.

ALCANCE ESTRICTO: Solo respondes sobre Hubio y temas relacionados: SEO, simulador de precios, ROI, contratos, branding, paletas, marketing, ventas, dashboard, planes, herramientas del catálogo y uso del POS.

Si la pregunta es off-topic (código ajeno, política, chistes, tareas escolares, etc.), responde EXACTAMENTE con una sola línea:
"Solo puedo ayudarte con temas de la plataforma Hubio: herramientas, SEO, precios, ROI, contratos, branding, marketing, ventas y tu panel. Reformulá tu pregunta en ese contexto."

Responde en español, tono profesional y cercano. Usa markdown cuando ayude (listas, tablas breves).

Contexto del usuario:
${context.userSummary}

Historial reciente de herramientas:
${context.toolHistory || "Sin uso reciente registrado."}

Catálogo Hubio Tools (planes requeridos):
${context.toolsCatalog}`;
}

/**
 * COMPAT: los prompts especializados viven ahora en lib/ai/agents/*-agent.ts.
 * buildToolPrompt delega en el agente registrado cuando existe y conserva
 * los prompts legados como fallback para toolIds sin agente.
 */
export function buildToolPrompt(ctx: ToolPromptContext): AiChatMessage[] {
  // Delegación al sistema de agentes (import diferido para evitar ciclos).
  try {
    const { resolveAgentForTool } = require("./agents/registry") as typeof import("./agents/registry");
    const agent = resolveAgentForTool(ctx.toolId);
    if (agent && agent.id !== "coach") {
      return agent.buildMessages({
        input: ctx.input,
        crawlData: ctx.crawlData,
        userPlan: ctx.userPlan,
      });
    }
  } catch {
    /* fallback a prompts legados */
  }

  const builders: Record<string, (c: ToolPromptContext) => string> = {
    "seo-analyzer": seoPrompt,
    "price-simulator": pricePrompt,
    "roi-calculator": roiPrompt,
    "contract-generator": contractPrompt,
    "prompt-generator": promptGenPrompt,
    "palette-generator": palettePrompt,
    "pos-insights": posPrompt,
    "dashboard-insights": dashboardPrompt,
  };

  const system = builders[ctx.toolId]?.(ctx) || defaultToolPrompt(ctx);
  return [
    { role: "system", content: system },
    {
      role: "user",
      content: `Datos de entrada:\n${JSON.stringify(ctx.input, null, 2)}\n\n${
        ctx.crawlData ? `Datos reales de análisis (crawl):\n${JSON.stringify(ctx.crawlData, null, 2)}` : ""
      }`,
    },
  ];
}

function defaultToolPrompt(ctx: ToolPromptContext): string {
  return `Eres un experto de Hubio Tools. Herramienta: ${ctx.toolId}. Responde en español con JSON válido y campo markdown.`;
}

function seoPrompt(ctx: ToolPromptContext): string {
  return `Eres auditor SEO senior para Hubio Tools. Analiza SOLO con base en datos reales del crawl provistos.
Etiqueta cada hallazgo como: "dato_real", "estimacion" o "prediccion".
Si falta un dato (ej. PageSpeed no disponible), indícalo explícitamente, no inventes métricas.

Responde JSON con esta estructura:
{
  "markdown": "informe en markdown",
  "executiveSummary": string,
  "seoScore": number 0-100,
  "optimizationLevel": "bajo"|"medio"|"alto",
  "issues": { "critical": [], "important": [], "minor": [] },
  "priorities": [],
  "actionPlan": [],
  "checklist": [],
  "recommendations": [],
  "dataLabels": { "field": "dato_real|estimacion|prediccion" }
}
Plan usuario: ${ctx.userPlan || "FREE"}`;
}

function pricePrompt(_ctx: ToolPromptContext): string {
  return `Eres consultor de precios freelance en LatAm para Hubio. Usa inputs: país, ciudad, inflación, moneda, experiencia, tipo cliente, complejidad, stack, urgencia, competencia.
Combina referencia numérica del sistema con justificación de mercado.
JSON:
{
  "markdown": string,
  "min": number,
  "recommended": number,
  "premium": number,
  "hourlyRate": number,
  "estimatedHours": number,
  "marginNotes": string,
  "justification": string,
  "labels": { "min": "estimacion", ... }
}`;
}

function roiPrompt(_ctx: ToolPromptContext): string {
  return `Analista ROI publicitario Hubio. Calcula escenarios optimista, realista, pesimista con métricas dadas.
JSON:
{
  "markdown": string,
  "scenarios": { "optimistic": {}, "realistic": {}, "pessimistic": {} },
  "risks": [],
  "recommendations": [],
  "chartData": [{ "name": string, "inversion": number, "ingresos": number }]
}`;
}

function contractPrompt(_ctx: ToolPromptContext): string {
  return `Abogado redactor de contratos de servicios en español para Hubio. Detecta campos faltantes en "missingFields".
Incluye cláusulas de riesgo sugeridas en "riskClauses". Respeta país y moneda.
JSON: { "markdown": string, "contractText": string, "missingFields": [], "riskClauses": [], "countryNotes": string }`;
}

function promptGenPrompt(_ctx: ToolPromptContext): string {
  return `Experto en prompts multi-plataforma (ChatGPT, Claude, Gemini, Cursor, Copilot, Midjourney, Flux, SD, Runway, etc.).
JSON: { "markdown": string, "prompts": [{ "platform": string, "level": string, "prompt": string, "creativity": string, "role": string, "constraints": string }] }`;
}

function palettePrompt(_ctx: ToolPromptContext): string {
  return `Diseñador de marca Hubio. Analiza sector/marca, propone paleta con WCAG, modos claro/oscuro, psicología del color.
JSON: { "markdown": string, "colors": [{ "hex": string, "role": string, "wcagOnWhite": string, "wcagOnDark": string }], "psychology": string }`;
}

function posPrompt(_ctx: ToolPromptContext): string {
  return `Analista retail POS Hubio. Identifica productos estrella, baja rotación, alertas de stock, predicciones simples basadas en ventas provistas.
JSON: { "markdown": string, "starProducts": [], "lowRotation": [], "alerts": [], "predictions": [] }`;
}

function dashboardPrompt(_ctx: ToolPromptContext): string {
  return `Analista de negocio Hubio. Resume actividad diaria/semanal/mensual en lenguaje natural y alertas accionables.
JSON: { "markdown": string, "daily": string, "weekly": string, "monthly": string, "alerts": [] }`;
}

export function toolsCatalogForPrompt(): string {
  return Object.entries(TOOL_REQUIREMENTS)
    .map(([tool, plans]) => `- ${tool}: planes ${plans.join(", ")}`)
    .join("\n");
}

const HUBIO_HINTS = [
  "hubio",
  "seo",
  "roi",
  "contrato",
  "precio",
  "tarifa",
  "paleta",
  "marca",
  "pos",
  "venta",
  "dashboard",
  "herramienta",
  "marketing",
  "plan",
  "elite",
  "professional",
  "prompt",
  "cliente",
  "negocio",
  "inventario",
  "stock",
  "asistente",
  "analítica",
  "analitica",
];

const OFF_TOPIC_PATTERNS = [
  /receta de/,
  /quién ganó/,
  /política de/,
  /homework|tarea escolar/,
  /traduce este texto sin hubio/,
];

export function isLikelyOffTopic(message: string): boolean {
  const lower = message.toLowerCase();
  if (HUBIO_HINTS.some((h) => lower.includes(h))) return false;
  return OFF_TOPIC_PATTERNS.some((r) => r.test(lower));
}

/**
 * Zona gris del guardrail: sin pistas de Hubio pero tampoco claramente off-topic.
 * En estos casos el asistente puede hacer una clasificación LLM barata (fail-open).
 */
export function isAmbiguousTopic(message: string): boolean {
  const lower = message.toLowerCase();
  if (HUBIO_HINTS.some((h) => lower.includes(h))) return false;
  if (OFF_TOPIC_PATTERNS.some((r) => r.test(lower))) return false;
  // Mensajes muy cortos (saludos, "gracias") no ameritan clasificación.
  return lower.trim().split(/\s+/).length >= 4;
}
