// xd
import Redis from "ioredis";

/**
 * Caché de respuestas IA con interfaz Redis-ready.
 */
export interface AiCacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

type Entry = { value: string; expiresAt: number };

class MemoryAiCache implements AiCacheStore {
  private store = new Map<string, Entry>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds = 3600): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

class RedisAiCache implements AiCacheStore {
  private redis: Redis;

  constructor(url: string) {
    this.redis = new Redis(url, {
      maxRetriesPerRequest: 3,
    });
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      console.error("[Redis Cache Error] Get failed:", error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds = 3600): Promise<void> {
    try {
      await this.redis.set(key, value, "EX", ttlSeconds);
    } catch (error) {
      console.error("[Redis Cache Error] Set failed:", error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error("[Redis Cache Error] Delete failed:", error);
    }
  }
}

let cacheInstance: AiCacheStore | null = null;

export function getAiCache(): AiCacheStore {
  if (!cacheInstance) {
    if (process.env.AI_CACHE_URL) {
      cacheInstance = new RedisAiCache(process.env.AI_CACHE_URL);
    } else {
      cacheInstance = new MemoryAiCache();
    }
  }
  return cacheInstance;
}

/** Permite inyectar una implementación externa (ej. Redis) manteniendo la misma interfaz. */
export function setAiCache(store: AiCacheStore) {
  cacheInstance = store;
}

export function hashCacheKey(parts: string[]): string {
  return parts.join("|");
}
