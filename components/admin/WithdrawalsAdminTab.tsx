"use client";
// xd

import { useEffect, useState } from "react";
import { Loader2, Check, X, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";

type WithdrawalRow = {
  id: string;
  amountBOB: string | number;
  feeBOB: string | number;
  netAmountBOB: string | number;
  method: string;
  status: string;
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolder?: string | null;
  qrImageUrl?: string | null;
  bankReference?: string | null;
  createdAt: string;
  user: { name: string; email: string; username: string };
};

export function WithdrawalsAdminTab() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<WithdrawalRow[]>([]);
  const [stats, setStats] = useState({
    pendingCount: 0,
    totalWithdrawnBOB: 0,
    totalFeesBOB: 0,
  });
  const [pendingCrypto, setPendingCrypto] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/withdrawals");
      const json = await res.json();
      if (json.success) {
        setRequests(json.data.requests);
        setStats(json.data.stats);
        setPendingCrypto(json.data.pendingCrypto || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const patch = async (body: Record<string, unknown>) => {
    setActionLoading(String(body.withdrawalId || body.cryptoOrderId));
    try {
      const res = await fetch("/api/admin/withdrawals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) alert(json.error);
      await load();
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-[10px] font-black uppercase text-gray-500">Pendientes</p>
          <p className="text-3xl font-black text-amber-400">{stats.pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-[10px] font-black uppercase text-gray-500">Total retirado</p>
          <p className="text-3xl font-black text-white">
            {stats.totalWithdrawnBOB.toFixed(2)} Bs
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-[10px] font-black uppercase text-gray-500">Comisiones</p>
          <p className="text-3xl font-black text-[#3B82F6]">
            {stats.totalFeesBOB.toFixed(2)} Bs
          </p>
        </div>
      </div>

      {pendingCrypto.length > 0 && (
        <div className="rounded-3xl border border-[#2563EB]/30 p-6 bg-[#1E3A8A]/10">
          <h3 className="font-bold mb-4">Pagos USDT pendientes de confirmación</h3>
          <div className="space-y-3">
            {pendingCrypto.map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-black/40"
              >
                <div>
                  <p className="text-sm font-bold">{o.user?.name}</p>
                  <p className="text-xs text-gray-500">
                    {Number(o.amountUSDT).toFixed(2)} USDT · TXID: {o.txid?.slice(0, 12)}…
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-emerald-600"
                  disabled={actionLoading === o.id}
                  onClick={() => patch({ cryptoOrderId: o.id })}
                >
                  Confirmar pago
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <Banknote className="h-5 w-5 text-brand" />
          <h3 className="font-bold">Retiros Bolivia</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase text-gray-500 bg-white/5">
              <tr>
                <th className="p-3 text-left">Usuario</th>
                <th className="p-3 text-left">Monto</th>
                <th className="p-3 text-left">Método</th>
                <th className="p-3 text-left">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="p-3">
                    <p className="font-medium">{r.user.name}</p>
                    <p className="text-[10px] text-gray-500">{r.user.email}</p>
                  </td>
                  <td className="p-3 font-mono">
                    {Number(r.amountBOB).toFixed(2)} Bs
                    <span className="block text-[10px] text-gray-500">
                      Neto {Number(r.netAmountBOB).toFixed(2)}
                    </span>
                  </td>
                  <td className="p-3 text-xs">{r.method}</td>
                  <td className="p-3">
                    <span className="text-xs font-bold uppercase">{r.status}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1 flex-wrap">
                      {r.status === "PENDING" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={actionLoading === r.id}
                            onClick={() =>
                              patch({ withdrawalId: r.id, action: "approve" })
                            }
                          >
                            <Check className="h-4 w-4 text-emerald-400" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={actionLoading === r.id}
                            onClick={() =>
                              patch({ withdrawalId: r.id, action: "reject" })
                            }
                          >
                            <X className="h-4 w-4 text-red-400" />
                          </Button>
                        </>
                      )}
                      {["APPROVED", "PROCESSING"].includes(r.status) && (
                        <Button
                          size="sm"
                          className="bg-brand text-black text-xs"
                          disabled={actionLoading === r.id}
                          onClick={() => {
                            const bankReference = prompt("Referencia bancaria (opcional)") || undefined;
                            patch({
                              withdrawalId: r.id,
                              action: "complete",
                              bankReference,
                            });
                          }}
                        >
                          Marcar pagado
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
