interface CacheEntry<T> {
  value: T
  expiresAt: number
  staleUntil: number
}

export interface CachedValue<T> {
  value: T
  stale: boolean
}

const cache = new Map<string, CacheEntry<unknown>>()
const inFlight = new Map<string, Promise<unknown>>()

export function clearNewsCacheForTest(): void {
  cache.clear()
  inFlight.clear()
}

export async function cachedWithStale<T>(
  key: string,
  ttlMs: number,
  staleTtlMs: number,
  loader: () => Promise<T>,
): Promise<CachedValue<T>> {
  const now = Date.now()
  const current = cache.get(key) as CacheEntry<T> | undefined

  if (current && current.expiresAt > now) {
    return { value: current.value, stale: false }
  }

  const existing = inFlight.get(key) as Promise<T> | undefined
  if (existing) {
    return { value: await existing, stale: false }
  }

  const pending = loader()
    .then((value) => {
      cache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
        staleUntil: Date.now() + staleTtlMs,
      })
      return value
    })
    .finally(() => {
      inFlight.delete(key)
    })

  inFlight.set(key, pending)

  try {
    return { value: await pending, stale: false }
  } catch (error) {
    if (current && current.staleUntil > now) {
      return { value: current.value, stale: true }
    }
    throw error
  }
}
