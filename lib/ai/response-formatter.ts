// xd
import type { StructuredAiResponse } from "./types";

export function parseStructuredAiContent<T = Record<string, unknown>>(raw: string): StructuredAiResponse<T> {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/```json\s*([\s\S]*?)```/);
  const candidate = jsonMatch ? jsonMatch[1].trim() : trimmed;

  try {
    const parsed = JSON.parse(candidate) as Record<string, unknown>;
    const markdown =
      typeof parsed.markdown === "string"
        ? parsed.markdown
        : typeof parsed.contractText === "string"
          ? parsed.contractText
          : trimmed;
    return { markdown, json: parsed as T, meta: { parsed: true } };
  } catch {
    return { markdown: trimmed, meta: { parsed: false } };
  }
}

export function ensureMarkdownSections(sections: Record<string, string>): string {
  return Object.entries(sections)
    .filter(([, v]) => v)
    .map(([title, body]) => `## ${title}\n\n${body}`)
    .join("\n\n");
}
