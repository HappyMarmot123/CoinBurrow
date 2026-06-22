import { DEFAULT_REQUEST_POLICY, type RequestPolicy } from "./http.js"

export interface FreeApiProviderPolicy {
  provider: string
  capability: "meta"
  cacheTtlMs: number
  staleCacheTtlMs?: number
  requestPolicy: RequestPolicy
}

export interface FreeApiPolicyResponse {
  policies: FreeApiProviderPolicy[]
  generatedAt: number
}

export const COINGECKO_META_TTL_MS = 10 * 60_000
export const COINPAPRIKA_META_TTL_MS = 15 * 60_000
export const META_STALE_TTL_MS = 90 * 60_000

export const COIN_META_POLICIES: FreeApiProviderPolicy[] = [
  {
    provider: "coingecko",
    capability: "meta",
    cacheTtlMs: COINGECKO_META_TTL_MS,
    staleCacheTtlMs: META_STALE_TTL_MS,
    requestPolicy: DEFAULT_REQUEST_POLICY,
  },
  {
    provider: "coinpaprika",
    capability: "meta",
    cacheTtlMs: COINPAPRIKA_META_TTL_MS,
    staleCacheTtlMs: META_STALE_TTL_MS,
    requestPolicy: DEFAULT_REQUEST_POLICY,
  },
]

export function getFreeApiPolicy(): FreeApiPolicyResponse {
  return {
    generatedAt: Date.now(),
    policies: COIN_META_POLICIES,
  }
}
