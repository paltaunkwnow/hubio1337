// xd
import { AiAssistantChat } from "@/components/ai/AiAssistantChat";
import { Sparkles } from "lucide-react";

export const metadata = {
  title: "Asistente IA | Hubio",
  description: "Asistente inteligente para herramientas y negocio en Hubio",
};

export default function AsistentePage() {
  return (
    <main className="container mx-auto px-4 pt-24 pb-16 max-w-3xl">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-sm text-brand mb-4">
          <Sparkles className="h-4 w-4" />
          Hubio AI
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Asistente Hubio</h1>
        <p className="text-gray-400 text-sm max-w-lg mx-auto">
          Consultas sobre SEO, precios, ROI, contratos, branding, marketing y tu panel. Solo temas de la plataforma Hubio.
        </p>
      </div>
      <AiAssistantChat />
    </main>
  );
}
