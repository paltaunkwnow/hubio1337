// xd
import { PLAN_RATE_LIMITS } from "./config";
import { logAi } from "./observability";

type Bucket = { minute: { count: number; resetAt: number }; day: { count: number; resetAt: number } };

const buckets = new Map<string, Bucket>();

function getBucket(userId: string, plan: string): Bucket {
  let b = buckets.get(userId);
  if (!b) {
    b = {
      minute: { count: 0, resetAt: Date.now() + 60_000 },
      day: { count: 0, resetAt: Date.now() + 86_400_000 },
    };
    buckets.set(userId, b);
  }
  const now = Date.now();
  if (now > b.minute.resetAt) {
    b.minute = { count: 0, resetAt: now + 60_000 };
  }
  if (now > b.day.resetAt) {
    b.day = { count: 0, resetAt: now + 86_400_000 };
  }
  return b;
}

export function checkAiRateLimit(userId: string, plan: string): { allowed: boolean; message?: string } {
  const limits = PLAN_RATE_LIMITS[plan] || PLAN_RATE_LIMITS.FREE;
  const b = getBucket(userId, plan);
  if (b.minute.count >= limits.perMinute) {
    logAi({ event: "rate_limited", userId });
    return { allowed: false, message: "Demasiadas solicitudes de IA. Esperá un momento e intentá de nuevo." };
  }
  if (b.day.count >= limits.perDay) {
    logAi({ event: "rate_limited", userId });
    return { allowed: false, message: "Alcanzaste el límite diario de IA de tu plan. Mejorá tu plan en Hubio para más uso." };
  }
  b.minute.count += 1;
  b.day.count += 1;
  return { allowed: true };
}
