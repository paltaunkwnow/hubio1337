// xd
/** Wallet & withdrawal configuration (env overrides documented in .env.example) */

export const WALLET_TRON_ADDRESS =
  process.env.WALLET_TRON_ADDRESS || "TRX2F5eyZ2aMNrXYu4KskvuvTo9UomMyAt";

export const CRYPTO_PAYMENT_EXPIRY_MINUTES = Number(
  process.env.CRYPTO_PAYMENT_EXPIRY_MINUTES || "60"
);

export const WITHDRAWAL_MIN_BOB = Number(process.env.WITHDRAWAL_MIN_BOB || "45");

/** Fixed processing fee in BOB (or use WITHDRAWAL_FEE_PERCENT for percentage) */
export const WITHDRAWAL_FEE_BOB = Number(process.env.WITHDRAWAL_FEE_BOB || "5");

export const WITHDRAWAL_FEE_PERCENT = Number(
  process.env.WITHDRAWAL_FEE_PERCENT || "0"
);

export const POS_PLATFORM_COMMISSION_PERCENT = Number(
  process.env.POS_PLATFORM_COMMISSION_PERCENT || "2"
);

export const PLAN_PRICES_USDT: Record<string, number> = {
  PROFESSIONAL: 9.99,
  EMPRESA: 29,
  ELITE: 79,
};

export function calculateWithdrawalFee(amountBOB: number): number {
  if (WITHDRAWAL_FEE_PERCENT > 0) {
    return Math.round(amountBOB * (WITHDRAWAL_FEE_PERCENT / 100) * 100) / 100;
  }
  return WITHDRAWAL_FEE_BOB;
}

export function resolveSubscriptionAmountUSDT(plan: string, interval: string): number {
  const base = PLAN_PRICES_USDT[plan] ?? PLAN_PRICES_USDT.PROFESSIONAL;
  if (interval === "annual") return Math.round(base * 12 * 0.8 * 100) / 100;
  return base;
}

export function getWithdrawalNet(amountBOB: number): {
  fee: number;
  net: number;
} {
  const fee = calculateWithdrawalFee(amountBOB);
  return { fee, net: Math.max(0, amountBOB - fee) };
}
