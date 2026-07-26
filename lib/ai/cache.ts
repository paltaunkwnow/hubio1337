// xd
/**
 * Caché de respuestas IA con interfaz Redis-ready.
 *
 * Implementación actual: en memoria (sin dependencias).
 * Para producción multi-instancia, definí AI_CACHE_URL (ej. redis://localhost:6379),
 * agregá `ioredis` a package.json y registrá una implementación de AiCacheStore
 * con `setAiCache()` — la interfaz ya es asíncrona y compatible.
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

let cacheInstance: AiCacheStore | null = null;

export function getAiCache(): AiCacheStore {
  if (!cacheInstance) {
    if (process.env.AI_CACHE_URL) {
      // Redis configurado pero sin cliente instalado: se usa memoria y se avisa una vez.
      console.warn(
        "[Hubio AI] AI_CACHE_URL definida pero no hay cliente Redis instalado (ioredis). Usando caché en memoria."
      );
    }
    cacheInstance = new MemoryAiCache();
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
