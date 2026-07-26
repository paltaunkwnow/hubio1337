"use client";
// xd

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { UsdtPaymentModal, CryptoOrderPayload } from "@/components/wallet/UsdtPaymentModal";
import { resolveSubscriptionAmountUSDT } from "@/lib/walletConfig";

const PLAN_LABELS: Record<string, string> = {
  PROFESSIONAL: "Profesional",
  EMPRESA: "Empresa",
  ELITE: "Elite",
};

export default function SubscriptionCryptoCheckoutPage() {
  const searchParams = useSearchParams();
  const plan = searchParams?.get("plan") || "PROFESSIONAL";
  const interval = searchParams?.get("interval") || "monthly";

  const [order, setOrder] = useState<CryptoOrderPayload | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const amount = resolveSubscriptionAmountUSDT(plan, interval);

  const startPayment = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/wallet/crypto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          purpose: "SUBSCRIPTION",
          plan,
          interval,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setOrder(json.data);
      setModalOpen(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (order?.status === "PAID") {
      window.location.href = "/dashboard?subscription=active";
    }
  }, [order?.status]);

  return (
    <main className="min-h-screen bg-black pt-24 pb-16 px-4">
      <div className="max-w-lg mx-auto text-center">
        <h1 className="text-3xl font-black text-white mb-2">
          Plan {PLAN_LABELS[plan] || plan}
        </h1>
        <p className="text-gray-400 mb-8">
          Paga con USDT (TRC20) · {interval === "annual" ? "Anual" : "Mensual"}
        </p>

        <div className="rounded-3xl border border-[#2563EB]/40 bg-[#1E3A8A]/20 p-8 mb-8">
          <p className="text-[10px] font-black uppercase text-gray-500">Total</p>
          <p className="text-5xl font-mono font-black text-[#3B82F6] mt-2">
            {amount.toFixed(2)} USDT
          </p>
        </div>

        {error && <p className="text-red-400 mb-4">{error}</p>}

        <button
          type="button"
          onClick={startPayment}
          disabled={loading}
          className="w-full h-14 rounded-2xl bg-[#2563EB] hover:bg-[#3B82F6] text-white font-bold mb-4"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Pagar con USDT TRC20"}
        </button>

        <Link href="/precios" className="text-sm text-gray-500 hover:text-[#3B82F6]">
          Volver a planes
        </Link>
        <p className="text-xs text-gray-600 mt-6">
          También puedes pagar con tarjeta vía{" "}
          <Link href={`/checkout?plan=${plan}&amount=${amount}`} className="text-[#3B82F6] underline">
            Stripe
          </Link>
        </p>
      </div>

      {order && (
        <UsdtPaymentModal
          order={order}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onUpdated={(o) => setOrder(o)}
        />
      )}
    </main>
  );
}
