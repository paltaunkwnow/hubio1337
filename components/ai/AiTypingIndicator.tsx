"use client";
// xd

export function AiTypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 text-gray-400 text-sm">
      <span className="sr-only">Escribiendo</span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-brand/70 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
