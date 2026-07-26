"use client";
// xd

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Loader2, RefreshCw, Sparkles, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";
import { AiMarkdown } from "./AiMarkdown";
import { AiChecklist } from "./AiChecklist";
import { DataBadgeRow } from "./DataBadge";
import { Button } from "@/components/ui/button";

type AnalyticsPayload = {
  metrics?: {
    periodDays?: number;
    current?: Record<string, number>;
    previous?: Record<string, number>;
    deltas?: Record<string, number | null>;
  };
  ai?: {
    naturalLanguageSummary?: string;
    patterns?: string[];
    anomalies?: string[];
    opportunities?: string[];
    alerts?: string[];
    dataLabels?: Record<string, string>;
    markdown?: string;
  } | null;
  markdown?: string | null;
};

const METRIC_LABELS: Record<string, string> = {
  usoHerramientas: "Uso de herramientas",
  pedidosComoCliente: "Pedidos (cliente)",
  pedidosComoProveedor: "Pedidos (proveedor)",
  publicaciones: "Publicaciones",
  ventasPos: "Ventas POS",
  ingresosPos: "Ingresos POS",
};

export function AnalyticsAiPanel() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/ai/analytics?days=30")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data as AnalyticsPayload);
        else {
          setData(null);
          setError(d.error || "No se pudieron cargar las analíticas");
        }
      })
      .catch(() => setError("Error de conexión"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const ai = data?.ai;
  const summary =
    ai?.naturalLanguageSummary ||
    data?.markdown ||
    (typeof ai?.markdown === "string" ? ai.markdown : null);

  return (
    <div className="rounded-[2rem] border border-white/5 bg-bg-secondary/40 p-5 md:p-8 space-y-6 glassmorphism">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-brand" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Analíticas IA</h3>
            <p className="text-[10px] text-gray-500 font-medium">
              Patrones, anomalías y oportunidades · últimos {data?.metrics?.periodDays ?? 30} días
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={load}
          disabled={loading}
          className="h-10 rounded-xl border-white/10 text-gray-300 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
          Actualizar
        </Button>
      </div>

      {loading && !data ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-brand" /> Analizando tu actividad…
        </div>
      ) : error && !data ? (
        <p className="text-sm text-red-400/90 py-4">{error}</p>
      ) : (
        <>
          {data?.metrics?.current && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(data.metrics.current).map(([key, value]) => {
                const delta = data.metrics?.deltas?.[key];
                return (
                  <div key={key} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-500 mb-1">
                      {METRIC_LABELS[key] || key}
                    </p>
                    <p className="text-lg font-mono font-black text-white">
                      {key === "ingresosPos" ? `$${Number(value).toLocaleString()}` : value}
                    </p>
                    {typeof delta === "number" && (
                      <p className={`text-[10px] font-bold mt-1 ${delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {delta >= 0 ? "+" : ""}
                        {delta}% vs período anterior
                      </p>
                    )}
                    {delta === null && <p className="text-[10px] text-gray-600 mt-1">Sin base previa</p>}
                  </div>
                );
              })}
            </div>
          )}

          {summary && (
            <div className="rounded-2xl border border-brand/20 bg-brand/5 p-5">
              <p className="text-[9px] font-black uppercase tracking-widest text-brand mb-2">Resumen en lenguaje natural</p>
              {summary.includes("#") || summary.includes("*") || summary.includes("\n") ? (
                <AiMarkdown content={summary} />
              ) : (
                <p className="text-sm text-gray-300 leading-relaxed">{summary}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Section
              icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
              title="Patrones"
              items={ai?.patterns}
              empty="Sin patrones claros aún."
            />
            <Section
              icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
              title="Anomalías"
              items={ai?.anomalies}
              empty="Sin anomalías detectadas."
            />
            <Section
              icon={<Lightbulb className="h-3.5 w-3.5 text-brand" />}
              title="Oportunidades"
              items={ai?.opportunities}
              empty="Generá más actividad para ver oportunidades."
            />
          </div>

          {Array.isArray(ai?.alerts) && ai!.alerts!.length > 0 && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-400 mb-2">Alertas</p>
              <AiChecklist items={ai!.alerts!.map(String)} />
            </div>
          )}

          {ai?.dataLabels && (
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-gray-500 mb-2">Origen de los datos</p>
              <DataBadgeRow labels={ai.dataLabels} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  items,
  empty,
}: {
  icon: ReactNode;
  title: string;
  items?: string[];
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest text-white">{title}</span>
      </div>
      {items?.length ? (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="text-[11px] text-gray-300 leading-relaxed">
              • {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[10px] text-gray-500">{empty}</p>
      )}
    </div>
  );
}
