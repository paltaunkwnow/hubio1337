"use client";
// xd

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, CheckCircle2, X, ArrowRight, Wallet, User, Search } from 'lucide-react';

interface POSPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (clientNit?: string, clientName?: string, paymentMethod?: string) => void;
  total: number;
  currency: string;
  receivedAmount: string;
  setReceivedAmount: (val: string) => void;
}

export default function POSPaymentModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  total, 
  currency,
  receivedAmount,
  setReceivedAmount
}: POSPaymentModalProps) {
  const [clientNit, setClientNit] = useState('');
  const [clientName, setClientName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isNewClient, setIsNewClient] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "USDT_TRC20">("CASH");

  const isUsdt = paymentMethod === "USDT_TRC20";
  const change = Math.max(0, Number(receivedAmount) - total);
  const isEnough = isUsdt || Number(receivedAmount) >= total;

  useEffect(() => {
    if (!isOpen) {
      setClientNit('');
      setClientName('');
      setIsNewClient(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const cleanNit = clientNit.trim();
    if (!cleanNit) {
      setClientName('');
      setIsNewClient(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/clients/${cleanNit}`);
        const json = await res.json();
        if (json.success && json.data) {
          setClientName(json.data.name);
          setIsNewClient(false);
        } else {
          setIsNewClient(true);
        }
      } catch (err) {
        setIsNewClient(true);
      } finally {
        setIsSearching(false);
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(delayDebounce);
  }, [clientNit]);

  const handleConfirmClick = async () => {
    if (!isEnough) return;
    
    const cleanNit = clientNit.trim();
    const cleanName = clientName.trim();

    if (cleanNit && cleanName && isNewClient) {
      try {
        await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nit: cleanNit, name: cleanName })
        });
      } catch (err) {
        console.error("Error registering client in background:", err);
      }
    }

    onConfirm(cleanNit || undefined, cleanName || undefined, paymentMethod);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={onClose} />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-bg-secondary border border-white/10 rounded-3xl lg:rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            <div className="p-6 lg:p-10 space-y-6 lg:space-y-8">
              <header className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
                    <Wallet className="w-5 h-5 lg:w-6 lg:h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl lg:text-2xl font-bold text-white">Procesar Pago</h2>
                    <p className="text-[10px] lg:text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                      {isUsdt ? "USDT TRC20" : "Recepción de efectivo"}
                    </p>
                  </div>
                </div>
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </header>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("CASH")}
                  className={`flex-1 h-11 rounded-xl text-xs font-bold uppercase ${
                    paymentMethod === "CASH"
                      ? "bg-brand text-black"
                      : "bg-white/5 text-gray-500"
                  }`}
                >
                  Efectivo
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("USDT_TRC20")}
                  className={`flex-1 h-11 rounded-xl text-xs font-bold uppercase ${
                    paymentMethod === "USDT_TRC20"
                      ? "bg-[#2563EB] text-white"
                      : "bg-white/5 text-gray-500"
                  }`}
                >
                  USDT TRC20
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                <div className="p-4 lg:p-6 bg-white/5 rounded-2xl lg:rounded-3xl border border-white/5">
                  <p className="text-[8px] lg:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 lg:mb-2 text-center">Total</p>
                  <p className="text-xl lg:text-3xl font-mono font-black text-white text-center">
                    <span className="text-brand mr-1">{currency}</span>
                    {total.toFixed(2)}
                  </p>
                </div>
                <div className={`p-4 lg:p-6 rounded-2xl lg:rounded-3xl border transition-all ${isEnough ? 'bg-green-500/10 border-green-500/20' : 'bg-white/5 border-white/5'}`}>
                  <p className="text-[8px] lg:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 lg:mb-2 text-center">Cambio</p>
                  <p className={`text-xl lg:text-3xl font-mono font-black text-center ${isEnough ? 'text-green-400' : 'text-gray-600'}`}>
                    <span className="mr-1">{currency}</span>
                    {change.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Universal NIT/CI Billing details */}
              <div className="p-5 bg-white/5 rounded-[1.5rem] border border-white/5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <User size={12} className="text-brand" />
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Datos de Facturación (Opcional)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">NIT o CI</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={clientNit}
                        onChange={(e) => setClientNit(e.target.value)}
                        placeholder="Ej: 12345678"
                        className="w-full h-12 bg-bg-primary border border-white/5 rounded-xl px-4 text-xs text-white outline-none focus:border-brand/30 transition-all font-mono"
                      />
                      {isSearching && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Razón Social</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder={isNewClient ? "Nombre Cliente Nuevo" : "Razón Social o Nombre"}
                      className={`w-full h-12 bg-bg-primary border rounded-xl px-4 text-xs text-white outline-none transition-all ${isNewClient ? 'border-brand/40 focus:border-brand' : 'border-white/5 focus:border-brand/30'}`}
                    />
                  </div>
                </div>
                {isNewClient && clientNit && (
                  <p className="text-[8px] text-brand font-black uppercase tracking-widest text-center mt-1 animate-pulse">
                    ✨ Cliente Nuevo. Escribe su Razón Social para registrarlo en el sistema universal.
                  </p>
                )}
                {!isNewClient && clientNit && clientName && (
                  <p className="text-[8px] text-green-400 font-black uppercase tracking-widest text-center mt-1">
                    ✓ Cliente verificado en el sistema universal.
                  </p>
                )}
              </div>

              {!isUsdt && (
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-brand uppercase tracking-[0.3em] px-1 text-center">Monto Recibido</label>
                <div className="relative">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-brand font-mono text-xl lg:text-2xl font-black">
                    {currency}
                  </div>
                  <input
                    autoFocus
                    type="number"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-16 lg:h-24 bg-bg-primary border-2 border-white/5 rounded-2xl lg:rounded-[2rem] pl-16 lg:pl-20 pr-6 text-white text-3xl lg:text-5xl font-mono font-black outline-none focus:border-brand transition-all text-right placeholder:opacity-10"
                  />
                </div>
              </div>
              )}

              {isUsdt && (
                <p className="text-center text-sm text-[#3B82F6] font-medium px-4">
                  Tras confirmar, se generará la orden USDT. El cliente debe pagar el total exacto en red TRC20.
                </p>
              )}

              {!isUsdt && (
              <div className="grid grid-cols-4 gap-2">
                {[10, 20, 50, 100].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setReceivedAmount(val.toString())}
                    className="h-10 lg:h-12 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] lg:text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all"
                  >
                    {val}
                  </button>
                ))}
              </div>
              )}

              <button
                onClick={handleConfirmClick}
                disabled={!isEnough}
                className={`w-full h-16 lg:h-20 rounded-2xl lg:rounded-[2rem] font-black uppercase tracking-[0.4em] text-[10px] lg:text-xs flex items-center justify-center gap-4 transition-all shadow-2xl ${isEnough ? 'bg-brand text-primary-foreground shadow-brand/20 hover:scale-[1.02] active:scale-95' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}
              >
                Confirmar Venta
                <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
