"use client";
// xd

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  TrendingUp,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type WalletData = {
  balance: { balanceUSDT: string | number; balanceBOB: string | number };
  transactions: Array<{
    id: string;
    type: string;
    amount: string | number;
    currency: string;
    status: string;
    reference: string;
    createdAt: string;
  }>;
  pendingWithdrawals: number;
  financial: {
    totalSales: number;
    availableBalanceUSDT: number;
    availableBalanceBOB: number;
    pendingPayments: number;
  };
};

export function WalletClient() {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [convertAmount, setConvertAmount] = useState("");
  const [converting, setConverting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wallet");
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleConvert = async () => {
    setConverting(true);
    try {
      const res = await fetch("/api/wallet/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUSDT: Number(convertAmount) }),
      });
      const json = await res.json();
      if (json.success) {
        setConvertAmount("");
        await load();
      } else {
        alert(json.error);
      }
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-center text-gray-500 py-12">No se pudo cargar la billetera.</p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-[#2563EB]/30 bg-gradient-to-br from-[#1E3A8A]/40 to-black p-6">
          <div className="flex items-center gap-2 text-[#3B82F6] mb-2">
            <Wallet className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Saldo USDT
            </span>
          </div>
          <p className="text-3xl font-mono font-black text-white">
            {data.financial.availableBalanceUSDT.toFixed(2)}
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <TrendingUp className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Saldo BOB
            </span>
          </div>
          <p className="text-3xl font-mono font-black text-white">
            {data.financial.availableBalanceBOB.toFixed(2)} Bs
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <span className="text-[10px] font-black uppercase text-gray-500">
            Ventas POS
          </span>
          <p className="text-2xl font-black text-white mt-2">
            ${data.financial.totalSales.toFixed(2)}
          </p>
          {data.financial.pendingPayments > 0 && (
            <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {data.financial.pendingPayments} pagos USDT pendientes
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/wallet/withdraw">
          <Button className="bg-[#2563EB] hover:bg-[#3B82F6] text-white font-bold rounded-2xl h-12 px-8">
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Retirar a Bolivia
          </Button>
        </Link>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="USDT a convertir"
            value={convertAmount}
            onChange={(e) => setConvertAmount(e.target.value)}
            className="h-12 rounded-2xl bg-bg-tertiary border border-white/10 px-4 text-white w-40"
          />
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-2xl border-[#2563EB]/40"
            disabled={converting || !convertAmount}
            onClick={handleConvert}
          >
            {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : "→ BOB"}
          </Button>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-black/40 p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <ArrowDownLeft className="h-5 w-5 text-[#3B82F6]" />
          Historial de movimientos
        </h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {data.transactions.length === 0 && (
            <p className="text-sm text-gray-500">Sin movimientos aún.</p>
          )}
          {data.transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex justify-between items-center p-3 rounded-2xl bg-white/5 border border-white/5"
            >
              <div>
                <p className="text-sm font-bold text-white">{tx.type}</p>
                <p className="text-[10px] text-gray-500">{tx.reference}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[#3B82F6]">
                  {Number(tx.amount).toFixed(2)} {tx.currency}
                </p>
                <p className="text-[10px] uppercase text-gray-500">{tx.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
