"use client";
// xd

import { CheckCircle2 } from "lucide-react";

export function AiChecklist({ items }: { items: string[] }) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-2 rounded-xl border border-border bg-bg-tertiary/40 p-4">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-gray-300">
          <CheckCircle2 className="h-4 w-4 text-brand shrink-0 mt-0.5" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
