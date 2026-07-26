// xd
import type { AgentDefinition, AgentId } from "./types";
import { seoAgent } from "./seo-agent";
import { pricingAgent } from "./pricing-agent";
import { roiAgent } from "./roi-agent";
import { legalAgent } from "./legal-agent";
import { promptEngineerAgent } from "./prompt-engineer-agent";
import { brandAgent } from "./brand-agent";
import { retailPosAgent } from "./retail-pos-agent";
import { analyticsAgent } from "./analytics-agent";
import { coachAgent } from "./coach-agent";

const AGENTS: Record<AgentId, AgentDefinition<any>> = {
  seo: seoAgent,
  pricing: pricingAgent,
  roi: roiAgent,
  legal: legalAgent,
  "prompt-engineer": promptEngineerAgent,
  brand: brandAgent,
  "retail-pos": retailPosAgent,
  analytics: analyticsAgent,
  coach: coachAgent,
};

/** Mapa de toolId legado (rutas /api/tools y adaptadores) → agente especializado. */
export const TOOL_TO_AGENT: Record<string, AgentId> = {
  "seo-analyzer": "seo",
  "price-simulator": "pricing",
  "roi-calculator": "roi",
  "contract-generator": "legal",
  "prompt-generator": "prompt-engineer",
  "palette-generator": "brand",
  "pos-insights": "retail-pos",
  "dashboard-insights": "analytics",
  analytics: "analytics",
  assistant: "coach",
};

export function getAgent(id: AgentId): AgentDefinition<any> {
  const agent = AGENTS[id];
  if (!agent) throw new Error(`Agente IA desconocido: ${id}`);
  return agent;
}

export function listAgents(): AgentDefinition<any>[] {
  return Object.values(AGENTS);
}

export function resolveAgentForTool(toolId: string): AgentDefinition<any> | null {
  const agentId = TOOL_TO_AGENT[toolId];
  return agentId ? AGENTS[agentId] : null;
}
