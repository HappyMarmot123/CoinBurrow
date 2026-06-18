interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()
const inFlight = new Map<string, Promise<unknown>>()

export function clearCache(): void {
  cache.clear()
  inFlight.clear()
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

  const existing = inFlight.get(key) as Promise<T> | undefined
  if (existing) {
    return existing
  }

  const pending = loader()
    .then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + ttlMs })
      return value
    })
    .finally(() => {
      inFlight.delete(key)
    })

  inFlight.set(key, pending)
  return pending
}
