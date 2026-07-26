"use client";
// xd

/** Badge de origen del dato: dato_real / estimacion / prediccion. */
const STYLES: Record<string, { label: string; className: string }> = {
  dato_real: { label: "Real", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  estimacion: { label: "Estimación", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  prediccion: { label: "Predicción", className: "bg-purple-500/10 text-purple-300 border-purple-500/20" },
};

export function DataBadge({ label }: { label?: string | null }) {
  if (!label) return null;
  const normalized = String(label).toLowerCase().replace("ó", "o").trim();
  const style = STYLES[normalized];
  if (!style) return null;
  return (
    <span
      className={`inline-flex items-center text-[7.5px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${style.className}`}
    >
      {style.label}
    </span>
  );
}

/** Fila de badges a partir del mapa dataLabels que devuelve el agente. */
export function DataBadgeRow({ labels }: { labels?: Record<string, string> | null }) {
  if (!labels || typeof labels !== "object") return null;
  const entries = Object.entries(labels).slice(0, 8);
  if (!entries.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {entries.map(([field, label]) => (
        <span key={field} className="inline-flex items-center gap-1">
          <span className="text-[8px] text-gray-500 font-bold">{field}</span>
          <DataBadge label={label} />
        </span>
      ))}
    </div>
  );
}
