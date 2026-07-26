"use client";
// xd

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Building2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

const MIN_BOB = 45;

export function WithdrawClient() {
  const [method, setMethod] = useState<"bank_account" | "qr">("bank_account");
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [preview, setPreview] = useState<{
    feeBOB: number;
    netAmountBOB: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("El archivo excede los 5MB");
      return;
    }
    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      setError("Solo JPG o PNG");
      return;
    }
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/pos/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setQrImageUrl(data.url);
      } else {
        setError(data.error || "Error al subir");
      }
    } catch {
      setError("Error de conexión al subir");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const amt = Number(amount);
    if (!amt || amt < MIN_BOB) {
      setPreview(null);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/wallet/withdraw?preview=${amt}`);
      const json = await res.json();
      if (json.success) {
        setPreview({
          feeBOB: json.data.feeBOB,
          netAmountBOB: json.data.netAmountBOB,
        });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [amount]);

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountBOB: Number(amount),
          method,
          bankName,
          accountNumber,
          accountHolder,
          qrImageUrl,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      window.location.href = "/dashboard/wallet";
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const amtNum = Number(amount);
  const belowMin = amount && amtNum < MIN_BOB;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Link
        href="/dashboard/wallet"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-[#3B82F6]"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a billetera
      </Link>

      <h1 className="text-3xl font-black">
        Retiro <span className="text-[#2563EB]">Bolivia</span>
      </h1>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMethod("bank_account")}
          className={`flex-1 h-14 rounded-2xl border flex items-center justify-center gap-2 font-bold text-sm ${
            method === "bank_account"
              ? "border-[#2563EB] bg-[#2563EB]/20 text-white"
              : "border-white/10 text-gray-500"
          }`}
        >
          <Building2 className="h-4 w-4" /> Cuenta bancaria
        </button>
        <button
          type="button"
          onClick={() => setMethod("qr")}
          className={`flex-1 h-14 rounded-2xl border flex items-center justify-center gap-2 font-bold text-sm ${
            method === "qr"
              ? "border-[#2563EB] bg-[#2563EB]/20 text-white"
              : "border-white/10 text-gray-500"
          }`}
        >
          <QrCode className="h-4 w-4" /> QR
        </button>
      </div>

      <div>
        <label className="text-[10px] font-black uppercase text-gray-500 ml-2">
          Monto (Bs)
        </label>
        <input
          type="number"
          min={MIN_BOB}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full h-14 mt-2 rounded-2xl bg-bg-tertiary border border-white/10 px-6 text-white text-xl font-mono outline-none focus:border-[#2563EB]/50"
        />
        {belowMin && (
          <p className="text-sm text-red-400 mt-2 ml-2">
            El monto mínimo de retiro es {MIN_BOB} Bs.
          </p>
        )}
      </div>

      {preview && !belowMin && (
        <div className="rounded-2xl border border-[#1E3A8A]/50 bg-[#1E3A8A]/10 p-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Monto</span>
            <span className="font-mono">{amtNum.toFixed(2)} Bs</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Fee</span>
            <span className="font-mono text-amber-400">
              -{preview.feeBOB.toFixed(2)} Bs
            </span>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-2 font-bold">
            <span>Recibirás</span>
            <span className="font-mono text-[#3B82F6]">
              {preview.netAmountBOB.toFixed(2)} Bs
            </span>
          </div>
        </div>
      )}

      {method === "bank_account" ? (
        <div className="space-y-3">
          <input
            placeholder="Banco"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className="w-full h-12 rounded-2xl bg-bg-tertiary border border-white/10 px-4 text-white"
          />
          <input
            placeholder="Número de cuenta"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className="w-full h-12 rounded-2xl bg-bg-tertiary border border-white/10 px-4 text-white"
          />
          <input
            placeholder="Titular"
            value={accountHolder}
            onChange={(e) => setAccountHolder(e.target.value)}
            className="w-full h-12 rounded-2xl bg-bg-tertiary border border-white/10 px-4 text-white"
          />
        </div>
      ) : (
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase text-gray-500 ml-2">
            Imagen del código QR
          </label>
          {qrImageUrl && (
            <img
              src={qrImageUrl}
              alt="QR de retiro"
              className="max-h-40 rounded-xl border border-white/10 mx-auto"
            />
          )}
          <label className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-bg-tertiary cursor-pointer hover:border-[#2563EB]/50 text-sm text-gray-400">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <QrCode className="h-4 w-4" /> Subir imagen QR
              </>
            )}
            <input
              type="file"
              className="hidden"
              accept="image/jpeg,image/png"
              onChange={handleQrUpload}
              disabled={uploading}
            />
          </label>
          <input
            value={qrImageUrl}
            onChange={(e) => setQrImageUrl(e.target.value)}
            placeholder="O pega URL de imagen"
            className="w-full h-12 rounded-2xl bg-bg-tertiary border border-white/10 px-4 text-white text-sm"
          />
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <Button
        type="button"
        className="w-full h-14 bg-[#2563EB] hover:bg-[#3B82F6] font-bold rounded-2xl"
        disabled={loading || belowMin || !amount}
        onClick={submit}
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirmar retiro"}
      </Button>
    </div>
  );
}
