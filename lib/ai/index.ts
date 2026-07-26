// xd
export { aiGenerate, aiStream } from "./engine";
export { getAiConfig, HUBIO_ASSISTANT_OFF_TOPIC_MESSAGE, PLAN_RATE_LIMITS } from "./config";
export type * from "./types";
export { buildToolPrompt, buildAssistantSystemPrompt, isLikelyOffTopic, isAmbiguousTopic, toolsCatalogForPrompt } from "./prompt-builder";
export { parseStructuredAiContent, ensureMarkdownSections } from "./response-formatter";
export { ContextManager } from "./context-manager";
export { loadUserAiContext, formatUserSummary, getToolsCatalogText } from "./loaders/user-context";
export { loadRecentToolResults, loadToolContextSummary } from "./loaders/tool-context";
export {
  loadConversationMessages,
  appendConversationMessage,
  getOrCreateAssistantConversation,
  loadConversationContext,
  ensureConversationTitle,
  maybeSummarizeConversation,
} from "./conversation-memory";
export { checkAiRateLimit } from "./rate-limiter";
export { runAgent, runAgentStream } from "./agents/run-agent";
export { getAgent, listAgents, resolveAgentForTool, TOOL_TO_AGENT } from "./agents/registry";
export type { AgentDefinition, AgentId, AgentResult } from "./agents/types";
