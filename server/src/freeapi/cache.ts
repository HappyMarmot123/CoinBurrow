interface CacheEntry<T> {
  value: T
  expiresAt: number
  staleUntil?: number
}

const cache = new Map<string, CacheEntry<unknown>>()
const inFlight = new Map<string, Promise<unknown>>()

export function clearFreeApiCacheForTest(): void {
  cache.clear()
  inFlight.clear()
}

export interface CachedValue<T> {
  value: T
  stale: boolean
}

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now()
  const current = cache.get(key) as CacheEntry<T> | undefined
  if (current && current.expiresAt > now) {
    return current.value
  }

  const inflight = inFlight.get(key) as Promise<T> | undefined
  if (inflight) {
    return inflight
  }

  const loading = loader()
    .then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + ttlMs })
      return value
    })
    .finally(() => {
      inFlight.delete(key)
    })

  inFlight.set(key, loading)
  return loading
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
    try {
      return { value: await existing, stale: false }
    } catch (error) {
      if (current && current.staleUntil !== undefined && current.staleUntil > now) {
        return { value: current.value, stale: true }
      }
      throw error
    }
  }

  const loading = loader()
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

  inFlight.set(key, loading)

  try {
    return { value: await loading, stale: false }
  } catch (error) {
    if (current && current.staleUntil !== undefined && current.staleUntil > now) {
      return { value: current.value, stale: true }
    }
    throw error
  }
}
