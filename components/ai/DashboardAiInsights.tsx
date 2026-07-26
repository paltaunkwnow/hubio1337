"use client";
// xd

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { AiInsightCard } from "./AiInsightCard";

type Period = "daily" | "weekly" | "monthly";

const PERIOD_LABELS: Record<Period, string> = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
};

export function DashboardAiInsights() {
  const [period, setPeriod] = useState<Period>("weekly");
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback((p: Period) => {
    setLoading(true);
    fetch(`/api/ai/insights?period=${p}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const ai = d.data?.ai;
          const fromPeriod =
            p === "daily" ? ai?.daily : p === "monthly" ? ai?.monthly : ai?.weekly;
          const md =
            (typeof fromPeriod === "string" && fromPeriod) ||
            d.data?.markdown ||
            (typeof ai?.markdown === "string" ? ai.markdown : null);
          setMarkdown(typeof md === "string" ? md : null);
        } else {
          setMarkdown(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(period);
  }, [period, load]);

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-xl border border-border bg-bg-tertiary p-1">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-medium transition-colors",
              period === p ? "bg-bg-secondary text-white shadow" : "text-gray-400 hover:text-white"
            )}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>
      <AiInsightCard title={`Resumen ${PERIOD_LABELS[period].toLowerCase()} (IA)`} markdown={markdown} loading={loading} />
    </div>
  );
}
