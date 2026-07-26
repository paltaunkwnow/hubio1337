"use client";
// xd

import { useState } from "react";
import {
  Copy,
  CheckCircle2,
  Loader2,
  Clock,
  AlertCircle,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type CryptoOrderPayload = {
  id: string;
  reference: string;
  amountUSDT: number | string;
  walletAddress: string;
  expiresAt: string;
  status: string;
  txid?: string | null;
};

type Props = {
  order: CryptoOrderPayload;
  open: boolean;
  onClose: () => void;
  onUpdated?: (order: CryptoOrderPayload) => void;
};

export function UsdtPaymentModal({ order, open, onClose, onUpdated }: Props) {
  const [txid, setTxid] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const amount = Number(order.amountUSDT);
  const deadline = new Date(order.expiresAt);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(order.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submitTxid = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/wallet/crypto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_txid",
          orderId: order.id,
          txid,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Error");
      onUpdated?.({ ...order, ...json.data, txid });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al enviar TXID");
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/wallet/crypto?orderId=${order.id}`);
      const json = await res.json();
      if (json.success && json.data) onUpdated?.(json.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-[#2563EB]/30 bg-[#0a0f1a] p-8 shadow-2xl shadow-[#1E3A8A]/40">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-2xl bg-[#2563EB]/20 flex items-center justify-center">
            <Wallet className="h-6 w-6 text-[#3B82F6]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Pago USDT (TRC20)</h2>
            <p className="text-xs text-gray-500 uppercase tracking-widest">
              Ref: {order.reference}
            </p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <p className="text-[10px] font-black uppercase text-gray-500 mb-1">
              Monto exacto
            </p>
            <p className="text-3xl font-mono font-black text-[#3B82F6]">
              {amount.toFixed(2)} USDT
            </p>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <p className="text-[10px] font-black uppercase text-gray-500 mb-2">
              Wallet destino (TRC20)
            </p>
            <div className="flex gap-2">
              <code className="flex-1 text-xs break-all text-gray-300">
                {order.walletAddress}
              </code>
              <button
                type="button"
                onClick={copyAddress}
                className="shrink-0 h-9 w-9 rounded-xl bg-[#2563EB]/20 text-[#3B82F6] flex items-center justify-center"
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-amber-400/90">
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              Plazo: {deadline.toLocaleString("es-BO")} · Red TRC20 únicamente
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${
                order.status === "PAID"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : order.status === "PENDING"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-red-500/20 text-red-400"
              }`}
            >
              {order.status}
            </span>
            <Button
              type="button"
              variant="ghost"
              className="text-xs text-[#3B82F6]"
              onClick={refreshStatus}
              disabled={loading}
            >
              Actualizar estado
            </Button>
          </div>
        </div>

        {order.status === "PENDING" && (
          <div className="space-y-3 mb-6">
            <label className="text-[10px] font-black uppercase text-gray-500 ml-1">
              TXID de la transacción
            </label>
            <input
              value={txid}
              onChange={(e) => setTxid(e.target.value)}
              placeholder="Pega el hash TRC20..."
              className="w-full h-12 rounded-2xl bg-bg-tertiary border border-white/10 px-4 text-white text-sm outline-none focus:border-[#2563EB]/50"
            />
            {error && (
              <p className="text-sm text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> {error}
              </p>
            )}
            <Button
              type="button"
              className="w-full h-12 bg-[#2563EB] hover:bg-[#3B82F6] text-white font-bold rounded-2xl"
              onClick={submitTxid}
              disabled={loading || !txid.trim()}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Confirmar pago enviado"
              )}
            </Button>
          </div>
        )}

        <Button
          type="button"
          variant="ghost"
          className="w-full text-gray-400"
          onClick={onClose}
        >
          Cerrar
        </Button>
      </div>
    </div>
  );
}
