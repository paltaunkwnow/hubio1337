// xd
export type AiProviderId =
  | "openai"
  | "agentrouter"
  | "anthropic"
  | "google"
  | "deepseek"
  | "mistral"
  | "openrouter"
  | "groq"
  | "gemini"
  | "ollama";

export type AiMessageRole = "system" | "user" | "assistant";

export interface AiChatMessage {
  role: AiMessageRole;
  content: string;
}

export interface AiGenerateOptions {
  messages: AiChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  userId?: string;
  userPlan?: string;
  toolId?: string;
  cacheKey?: string;
  skipCache?: boolean;
}

export interface AiGenerateResult {
  content: string;
  provider: AiProviderId;
  model: string;
  usage?: { promptTokens?: number; completionTokens?: number };
  cached?: boolean;
}

export interface AiStreamChunk {
  type: "delta" | "done" | "error";
  content?: string;
  error?: string;
  provider?: AiProviderId;
}

export interface ToolPromptContext {
  toolId: string;
  input: Record<string, unknown>;
  crawlData?: Record<string, unknown>;
  userPlan?: string;
}

export interface UserAiContext {
  userId: string;
  name: string;
  plan: string;
  country?: string | null;
  recentToolUsage?: Array<{ toolName: string; createdAt: string }>;
}

export interface StructuredAiResponse<T = unknown> {
  markdown: string;
  json?: T;
  meta?: Record<string, unknown>;
}
