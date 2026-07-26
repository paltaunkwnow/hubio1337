// xd
import Redis from "ioredis";
import { PLAN_RATE_LIMITS } from "./config";
import { logAi } from "./observability";

type Bucket = { minute: { count: number; resetAt: number }; day: { count: number; resetAt: number } };

const buckets = new Map<string, Bucket>();

let redisClient: Redis | null = null;
if (process.env.AI_CACHE_URL) {
  redisClient = new Redis(process.env.AI_CACHE_URL, {
    maxRetriesPerRequest: 3,
  });
}

function getBucketLocal(userId: string): Bucket {
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

function checkAiRateLimitLocal(userId: string, plan: string): { allowed: boolean; message?: string } {
  const limits = PLAN_RATE_LIMITS[plan] || PLAN_RATE_LIMITS.FREE;
  const b = getBucketLocal(userId);
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

export async function checkAiRateLimit(userId: string, plan: string): Promise<{ allowed: boolean; message?: string }> {
  if (!redisClient) {
    return checkAiRateLimitLocal(userId, plan);
  }

  const limits = PLAN_RATE_LIMITS[plan] || PLAN_RATE_LIMITS.FREE;
  const keyMinute = `rate:${userId}:minute`;
  const keyDay = `rate:${userId}:day`;

  try {
    const [minuteCount, dayCount] = await Promise.all([
      redisClient.get(keyMinute),
      redisClient.get(keyDay)
    ]);

    if (minuteCount && parseInt(minuteCount, 10) >= limits.perMinute) {
      logAi({ event: "rate_limited", userId });
      return { allowed: false, message: "Demasiadas solicitudes de IA. Esperá un momento e intentá de nuevo." };
    }

    if (dayCount && parseInt(dayCount, 10) >= limits.perDay) {
      logAi({ event: "rate_limited", userId });
      return { allowed: false, message: "Alcanzaste el límite diario de IA de tu plan. Mejorá tu plan en Hubio para más uso." };
    }

    const pipeline = redisClient.pipeline();
    pipeline.incr(keyMinute);
    pipeline.expire(keyMinute, 60, "NX");
    pipeline.incr(keyDay);
    pipeline.expire(keyDay, 86400, "NX");
    await pipeline.exec();

    return { allowed: true };
  } catch (error) {
    console.error("[Redis RateLimiter Error] Connection failed:", error);
    return checkAiRateLimitLocal(userId, plan);
  }
}
