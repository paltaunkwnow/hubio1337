// xd
import { z } from "zod";
import type { AgentDefinition } from "./types";
import { buildAgentUserMessage, DATA_LABEL_INSTRUCTIONS } from "./shared";

const inputSchema = z.object({
  url: z.string().min(4),
  competitors: z.array(z.string()).max(2).optional(),
  keywords: z.string().optional(),
}).passthrough();

export interface SeoAgentOutput {
  markdown: string;
  executiveSummary?: string;
  seoScore?: number;
  optimizationLevel?: "bajo" | "medio" | "alto";
  issues?: { critical: string[]; important: string[]; minor: string[] };
  priorities?: string[];
  actionPlan?: string[];
  checklist?: string[];
  recommendations?: string[];
  comparison?: { headers: string[]; rows: Array<{ metric: string; values: string[] }> };
  prediccion?: { text: string; assumptions: string[] };
  dataLabels?: Record<string, string>;
}

export const seoAgent: AgentDefinition<SeoAgentOutput> = {
  id: "seo",
  name: "Agente SEO Hubio",
  description: "Auditor SEO senior: analiza crawls reales, prioriza issues por severidad y compara contra competidores.",
  capabilities: [
    "Auditoría técnica on-page (metas, headings, canonical, OG, Twitter cards, schema.org)",
    "Clasificación de issues por severidad (crítico / importante / menor)",
    "Comparación contra hasta 2 competidores",
    "Plan de acción priorizado con etiquetas dato_real / estimacion / prediccion",
  ],
  inputSchema,
  temperature: 0.4,
  maxTokens: 4096,
  buildMessages(ctx) {
    const hasCompetitors = Array.isArray((ctx.crawlData as { competitors?: unknown[] } | undefined)?.competitors)
      && ((ctx.crawlData as { competitors: unknown[] }).competitors.length > 0);
    const system = `Eres el Agente SEO de Hubio Tools: auditor SEO senior con 15 años de experiencia técnica en LatAm.

REGLAS DURAS:
- Analiza SOLO con base en los datos reales del crawl provistos (title, metas, headings H1-H6, canonical, Open Graph, Twitter cards, JSON-LD, robots.txt, sitemap.xml, densidad de keywords, enlaces, imágenes, PageSpeed).
- Si un dato falta (ej. PageSpeed sin API key), dilo explícitamente; NUNCA inventes métricas.
- Cualquier proyección de crecimiento va SOLO en el campo "prediccion", etiquetada como tal y con supuestos explícitos.
${DATA_LABEL_INSTRUCTIONS}

${hasCompetitors ? `COMPARACIÓN CON COMPETIDORES:
Se incluyen crawls de competidores. Genera "comparison" con una tabla comparativa (headers = ["Métrica", "Tu sitio", ...dominios competidores]) usando métricas reales de ambos crawls: score, título, meta descripción, palabras, H1s, imágenes con ALT, enlaces, sitemap/robots, schema.org.` : ""}

Responde SOLO JSON válido con esta estructura exacta:
{
  "markdown": "informe completo en markdown, en español",
  "executiveSummary": "resumen ejecutivo de 2-4 frases",
  "seoScore": number 0-100,
  "optimizationLevel": "bajo"|"medio"|"alto",
  "issues": { "critical": ["..."], "important": ["..."], "minor": ["..."] },
  "priorities": ["prioridad 1", "..."],
  "actionPlan": ["paso accionable 1", "..."],
  "checklist": ["item verificable", "..."],
  "recommendations": ["recomendación", "..."],
  "comparison": { "headers": ["Métrica", "Tu sitio", "Competidor 1"], "rows": [{ "metric": "...", "values": ["...", "..."] }] } | null,
  "prediccion": { "text": "proyección etiquetada", "assumptions": ["supuesto 1"] } | null,
  "dataLabels": { "seoScore": "dato_real", "prediccion": "prediccion", ... }
}
Plan del usuario: ${ctx.userPlan || "FREE"}. Responde en español.`;
    return [{ role: "system", content: system }, buildAgentUserMessage(ctx)];
  },
};
