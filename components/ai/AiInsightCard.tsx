"use client";
// xd

import { Sparkles } from "lucide-react";
import { AiMarkdown } from "./AiMarkdown";

export function AiInsightCard({
  title,
  markdown,
  loading,
}: {
  title: string;
  markdown?: string | null;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-brand/20 bg-gradient-to-br from-brand/5 to-transparent p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-brand" />
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      {loading ? (
        <p className="text-sm text-gray-400 animate-pulse">Generando insights...</p>
      ) : markdown ? (
        <AiMarkdown content={markdown} />
      ) : (
        <p className="text-sm text-gray-400">Sin datos de IA disponibles.</p>
      )}
    </div>
  );
}
