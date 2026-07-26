"use client";
// xd

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Download, FileDown, MessageSquarePlus, RefreshCw, Send, Star } from "lucide-react";
import { AiMarkdown } from "./AiMarkdown";
import { AiTypingIndicator } from "./AiTypingIndicator";

type ChatMessage = { role: "user" | "assistant"; content: string };
type ConversationRow = { id: string; title: string | null; favorite?: boolean; updatedAt: string };

export function AiAssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const refreshConversations = useCallback(() => {
    fetch("/api/ai/assistant")
      .then((r) => r.json())
      .then((d) => {
        if (d.conversations) setConversations(d.conversations);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  const loadConversation = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/ai/assistant?conversationId=${encodeURIComponent(id)}`);
    const data = await res.json();
    if (!res.ok || !data.conversation) {
      setError(data.error || "No se pudo cargar la conversación");
      return;
    }
    setConversationId(data.conversation.id);
    setMessages(
      (data.conversation.messages || []).map((m: { role: string; content: string }) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      }))
    );
  };

  const toggleFavorite = async (id: string, favorite: boolean) => {
    // Optimista: favoritas primero, luego por fecha.
    setConversations((prev) =>
      [...prev]
        .map((c) => (c.id === id ? { ...c, favorite } : c))
        .sort((a, b) => {
          if (Boolean(a.favorite) !== Boolean(b.favorite)) return a.favorite ? -1 : 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        })
    );
    try {
      await fetch("/api/ai/assistant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: id, favorite }),
      });
    } catch {
      refreshConversations();
    }
  };

  const startNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setInput("");
    setError(null);
  };

  const continueLast = () => {
    setInput("Continúa desarrollando tu respuesta anterior con más detalle y pasos accionables.");
  };

// Auto-scrolling disabled per user request

  const send = useCallback(
    async (regenerate = false) => {
      const text = input.trim();
      if (!text && !regenerate) return;
      setError(null);
      setStreaming(true);

      if (!regenerate) {
        setMessages((m) => [...m, { role: "user", content: text }]);
        setInput("");
      }

      let assistant = "";

      try {
        const res = await fetch("/api/ai/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: regenerate ? messages.filter((m) => m.role === "user").slice(-1)[0]?.content : text,
            conversationId,
            regenerate,
          }),
        });

        if (!res.ok) {
          const contentType = res.headers.get("content-type") || "";
          let errMsg = "Error del servidor";
          if (contentType.includes("application/json")) {
            const data = await res.json();
            errMsg = data.error || errMsg;
          } else {
            errMsg = await res.text() || errMsg;
          }
          throw new Error(errMsg);
        }

        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await res.json();
          if (data.conversationId) setConversationId(data.conversationId);
          setMessages((m) => [...m, { role: "assistant", content: data.content }]);
          setStreaming(false);
          return;
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        setMessages((m) => [...m, { role: "assistant", content: "" }]);

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data:")) continue;
            try {
              const payload = JSON.parse(line.slice(5).trim());
              if (payload.type === "meta" && payload.conversationId) {
                setConversationId(payload.conversationId);
              }
              if (payload.type === "delta" && payload.content) {
                assistant += payload.content;
                setMessages((prev) => {
                  const copy = [...prev];
                  copy[copy.length - 1] = { role: "assistant", content: assistant };
                  return copy;
                });
              }
              if (payload.type === "error") setError(payload.error);
            } catch {
              /* ignore */
            }
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error de conexión");
      } finally {
        setStreaming(false);
        refreshConversations();
      }
    },
    [input, conversationId, messages, refreshConversations]
  );

  const copyLast = () => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (last) navigator.clipboard.writeText(last.content);
  };

  const exportMd = () => {
    const md = messages.map((m) => `**${m.role === "user" ? "Tú" : "Asistente"}:**\n${m.content}`).join("\n\n---\n\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hubio-asistente.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    if (!messages.length) return;
    const { jsPDF } = require("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margin = 16;
    const maxW = 178;
    let y = 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.text("Hubio — Asistente IA", margin, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(new Date().toLocaleString("es-ES"), margin, y);
    y += 10;

    for (const m of messages) {
      const label = m.role === "user" ? "Tú" : "Asistente";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      const head = doc.splitTextToSize(label, maxW);
      doc.text(head, margin, y);
      y += head.length * 4 + 2;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      const body = doc.splitTextToSize(m.content.replace(/\*\*/g, ""), maxW);
      for (const line of body) {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin, y);
        y += 4.2;
      }
      y += 6;
    }
    doc.save("hubio-asistente.pdf");
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 h-[min(70vh,640px)]">
      <aside className="md:w-52 shrink-0 rounded-2xl border border-border bg-bg-secondary/60 p-3 flex flex-col gap-2 max-h-[200px] md:max-h-none overflow-y-auto">
        <Button type="button" variant="outline" size="sm" className="w-full justify-start gap-2" onClick={startNewChat}>
          <MessageSquarePlus className="h-4 w-4" /> Nueva
        </Button>
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`group flex items-center gap-1 rounded-lg transition-colors ${
              conversationId === c.id ? "bg-brand/15" : "hover:bg-bg-tertiary"
            }`}
          >
            <button
              type="button"
              onClick={() => loadConversation(c.id)}
              className={`flex-1 min-w-0 text-left text-xs px-2 py-2 truncate ${
                conversationId === c.id ? "text-brand" : "text-gray-400"
              }`}
            >
              {c.title || "Conversación"} · {new Date(c.updatedAt).toLocaleDateString("es-ES")}
            </button>
            <button
              type="button"
              onClick={() => toggleFavorite(c.id, !c.favorite)}
              title={c.favorite ? "Quitar de favoritas" : "Marcar como favorita"}
              className={`shrink-0 pr-2 transition-opacity ${
                c.favorite ? "text-brand opacity-100" : "text-gray-500 opacity-0 group-hover:opacity-100"
              }`}
            >
              <Star className={`h-3.5 w-3.5 ${c.favorite ? "fill-current" : ""}`} />
            </button>
          </div>
        ))}
      </aside>

      <div className="flex flex-col flex-1 min-h-0 rounded-2xl border border-border bg-bg-secondary/80 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {messages.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">
              Preguntá sobre herramientas Hubio, SEO, precios, ROI, contratos o tu panel.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col ${m.role === "user" ? "items-end ml-auto" : "items-start mr-auto"} max-w-[85%]`}
            >
              <div
                className={`rounded-2xl px-4 py-3.5 shadow-md border transition-all duration-200 ${
                  m.role === "user"
                    ? "bg-brand text-black rounded-tr-none border-brand/20 font-medium"
                    : "bg-[#1b2230] text-white rounded-tl-none border-slate-700/60"
                }`}
              >
                {m.role === "assistant" ? (
                  <AiMarkdown content={m.content} />
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
              <span className="text-[10px] text-gray-500 mt-1 px-1.5 font-medium">
                {m.role === "user" ? "Tú" : "Asistente Hubio"}
              </span>
            </div>
          ))}
          {streaming && messages[messages.length - 1]?.content === "" && <AiTypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {error && <p className="px-4 text-sm text-red-400">{error}</p>}

        <div className="border-t border-border p-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="icon" onClick={copyLast} title="Copiar última respuesta">
              <Copy className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => send(true)} disabled={streaming} title="Regenerar">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={continueLast} disabled={streaming || !messages.some((m) => m.role === "assistant")} title="Continuar respuesta">
              <Send className="h-4 w-4 rotate-180 opacity-70" />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={exportMd} title="Exportar markdown">
              <Download className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={exportPdf} disabled={!messages.length} title="Exportar PDF">
              <FileDown className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribí tu consulta sobre Hubio..."
              className="min-h-[44px] max-h-[160px] resize-none bg-[#1b2230] text-white placeholder:text-gray-400 border border-slate-700/80 focus:border-brand rounded-xl px-3 py-2.5 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(false);
                }
              }}
            />
            <Button onClick={() => send(false)} disabled={streaming || !input.trim()} className="shrink-0 bg-brand text-black">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
