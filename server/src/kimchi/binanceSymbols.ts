import { z } from 'zod'

import { cached } from '../freeapi/cache.js'
import { requestJson } from '../freeapi/http.js'

export const BINANCE_SYMBOLS_TTL_MS = 6 * 60 * 60 * 1000 // 6시간

const BINANCE_EXCHANGE_INFO_URL = 'https://api.binance.com/api/v3/exchangeInfo'

const exchangeInfoSchema = z.object({
  symbols: z.array(
    z.object({
      baseAsset: z.string(),
      quoteAsset: z.string(),
      status: z.string(),
    }),
  ),
})

export function fetchBinanceUsdtBases(): Promise<Set<string>> {
  return cached('kimchi:binance-usdt-bases', BINANCE_SYMBOLS_TTL_MS, async () => {
    const payload = await requestJson(BINANCE_EXCHANGE_INFO_URL, exchangeInfoSchema, {
      timeoutMs: 8000,
    })
    const bases = new Set<string>()
    for (const entry of payload.symbols) {
      if (entry.quoteAsset === 'USDT' && entry.status === 'TRADING') {
        bases.add(entry.baseAsset.toUpperCase())
      }
    }
    return bases
  })
}
