// xd
import type { AiChatMessage } from "./types";

export class ContextManager {
  private maxMessages: number;

  constructor(maxMessages = 24) {
    this.maxMessages = maxMessages;
  }

  merge(system: string, history: AiChatMessage[], userMessage: string): AiChatMessage[] {
    const trimmed = this.trimHistory(history.filter((m) => m.role !== "system"));
    return [
      { role: "system", content: system },
      ...trimmed,
      { role: "user", content: userMessage },
    ];
  }

  trimHistory(messages: AiChatMessage[]): AiChatMessage[] {
    if (messages.length <= this.maxMessages) return messages;
    return messages.slice(-this.maxMessages);
  }
}
