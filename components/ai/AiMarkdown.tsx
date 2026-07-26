"use client";
// xd

/** Lightweight markdown-ish renderer (headings, lists, code) without extra deps. */
export function AiMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="prose prose-invert prose-sm max-w-none text-gray-200 space-y-2">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <h3 key={i} className="text-white font-semibold mt-3 mb-1">
              {line.slice(3)}
            </h3>
          );
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <li key={i} className="ml-4 list-disc text-gray-300">
              {line.slice(2)}
            </li>
          );
        }
        if (line.startsWith("```")) return null;
        if (!line.trim()) return <br key={i} />;
        return (
          <p key={i} className="text-gray-300 leading-relaxed">
            {line}
          </p>
        );
      })}
    </div>
  );
}
