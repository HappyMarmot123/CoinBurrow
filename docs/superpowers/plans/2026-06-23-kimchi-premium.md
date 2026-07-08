# 김치 프리미엄(Kimchi Premium) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 업비트(KRW)와 바이낸스(USDT) 실시간 가격을 USD/KRW 환율로 환산해 코인별 김치 프리미엄(%)을 보여주는 독립 페이지 `/kimchi`를 추가한다.

**Architecture:** 서버는 환율(`/market/fx`)과 대상 코인 universe(`/market/kimchi/universe`) 두 REST 엔드포인트를 `cachedWithStale` + degraded 패턴으로 제공한다. 클라이언트는 기존 업비트 WS 스트림(가격·24h 거래대금)을 재사용하고, 동일한 워커+RxJS 패턴으로 바이낸스 WS 스트림을 신규 추가한 뒤, 두 스트림과 환율을 Pinia 파생 스토어에서 결합해 김프를 실시간 계산한다.

**Tech Stack:** Fastify 5 + zod + undici(server), Vue 3 `<script setup>` + Pinia + RxJS + Web Worker(web), Vitest.

## Global Constraints

- 스펙 출처: `docs/superpowers/specs/2026-06-23-kimchi-premium-design.md`
- 김프 계산식: `프리미엄(%) = upbitKRW / (binanceUSDT × USDKRW) − 1`, 백분율은 `× 100`.
- USDT ≈ USD 근사를 사용한다(UI 툴팁/푸터에 명시).
- 환율 소스: `https://open.er-api.com/v6/latest/USD` (API 키 불필요). 실패 시 업비트 `fetchExchangeRates` 폴백 → 그래도 실패 시 마지막 stale → 전부 실패 시 degraded.
- 환율은 **반드시 서버 경유**로 캐싱한다(레이트리밋 풀링: open.er-api는 IP당 시간당 1회 권장). 브라우저에서 직접 호출 금지.
- 출처 표기 의무: 페이지 푸터에 "Rates By Exchange Rate API"(→ https://www.exchangerate-api.com) 링크.
- 대상 코인: (업비트 KRW ∩ 바이낸스 USDT) 중 업비트 `accTradePrice24h` 상위 30개, 동적.
- 심볼 매핑: 업비트 `KRW-{BASE}` → 바이낸스 `{BASE}USDT`.
- ESM import는 확장자 `.js`를 붙인다(서버·웹 공통 기존 규칙).
- 서버 외부호출은 `freeapi/http.js`의 `requestJson` + `FreeApiError`를 사용한다.
- 라우트 소프트 장애는 200 degraded로 반환(news/sentiment와 동일 전략). 응답은 envelope 없이 평문 객체(sentiment 라우트와 동일).
- 모든 신규 모듈은 TDD: 실패 테스트 → 최소 구현 → 통과 → 커밋.

## File Structure

**서버 (server/src/)**
- `fx/types.ts` — FX 응답/내부 타입
- `fx/provider.ts` — open.er-api 호출 + 업비트 폴백 + zod 스키마
- `routes/fx.ts` — `GET /market/fx`
- `kimchi/binanceSymbols.ts` — 바이낸스 USDT 베이스 심볼 집합 조회(캐시)
- `kimchi/types.ts` — universe 아이템/응답 타입
- `kimchi/universe.ts` — 교집합 + 상위 30 + 매핑
- `routes/kimchi.ts` — `GET /market/kimchi/universe`
- `app.ts` — 라우트 2건 등록(수정)

**웹 (web/src/)**
- `shared/validation/schemas/ws/binance.ts` — 바이낸스 WS miniTicker zod 스키마
- `workers/binanceProtocol.ts` — 워커 명령/응답 타입 + 구독 URL/메시지 빌더
- `workers/binancePipeline.ts` — RxJS 정규화 파이프라인
- `workers/binanceSocket.worker.ts` — 바이낸스 WS 연결/구독 워커
- `stores/binance.ts` — 바이낸스 가격 store
- `stores/fx.ts` — 환율 store
- `stores/kimchi.ts` — universe + 파생 김프 계산 store
- `composables/useBinanceSocket.ts` — 워커 ↔ store 브리지
- `api/rest.ts` — `getFx`, `getKimchiUniverse` + 타입(수정)
- `features/kimchi/KimchiTable.vue` — 김프 표
- `features/kimchi/KimchiPage.vue` — 페이지 컨테이너
- `router/index.ts` — `/kimchi` 라우트(수정)
- `components/AppNav.vue` — 메뉴 추가(수정)

**테스트**
- `server/test/fx.routes.test.ts`, `server/test/kimchi-universe.test.ts`, `server/test/kimchi.routes.test.ts`
- `web/test/binance-pipeline.test.ts`, `web/test/kimchi-store.test.ts`, `web/test/fx-store.test.ts`

---

## Phase A — 서버: 환율 엔드포인트

### Task 1: FX provider (open.er-api + 업비트 폴백)

**Files:**
- Create: `server/src/fx/types.ts`
- Create: `server/src/fx/provider.ts`
- Test: `server/test/fx.routes.test.ts` (Task 2에서 라우트와 함께 검증; 본 태스크는 provider 단위 동작을 Task 2 테스트로 커버)

**Interfaces:**
- Consumes: `requestJson`, `FreeApiError` from `../freeapi/http.js` / `../freeapi/errors.js`; `fetchExchangeRates` from `../upbit/upbitRest.js`.
- Produces:
  - `interface FxResult { krw: number; source: 'exchangerate-api' | 'upbit'; fetchedAt: number; next?: number }`
  - `FX_TTL_MS: number`, `FX_STALE_TTL_MS: number`
  - `async function fetchUsdKrw(): Promise<FxResult>` — 1차 open.er-api, 실패 시 업비트 폴백, 둘 다 실패 시 throw `FreeApiError`.

- [ ] **Step 1: 타입 작성** — `server/src/fx/types.ts`

```ts
export interface FxResult {
  krw: number
  source: 'exchangerate-api' | 'upbit'
  fetchedAt: number
  next?: number
}

export interface FxResponse {
  base: 'USD'
  krw: number | null
  source: 'exchangerate-api' | 'upbit' | null
  fetchedAt: number
  cacheTtlMs: number
  next?: number
  stale: boolean
  degraded?: boolean
  degradedReason?: string
}
```

- [ ] **Step 2: 실패 테스트 작성** — `server/test/fx.routes.test.ts` (라우트 경유로 provider 검증; Task 2의 라우트가 아직 없으므로 이 테스트는 Task 2 완료 시 통과)

본 단계에서는 테스트 파일을 만들되, provider 직접 단위 테스트를 먼저 둔다:

```ts
import {
  MockAgent,
  getGlobalDispatcher,
  setGlobalDispatcher,
  type Dispatcher,
} from 'undici'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchUsdKrw } from '../src/fx/provider.js'
import { clearUpbitCacheForTest } from '../src/upbit/upbitRest.js'

describe('fetchUsdKrw provider', () => {
  let mockAgent: MockAgent
  let originalDispatcher: Dispatcher

  beforeEach(() => {
    clearUpbitCacheForTest()
    originalDispatcher = getGlobalDispatcher()
    mockAgent = new MockAgent()
    mockAgent.disableNetConnect()
    setGlobalDispatcher(mockAgent)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(async () => {
    setGlobalDispatcher(originalDispatcher)
    await mockAgent.close()
    vi.restoreAllMocks()
  })

  it('returns KRW from exchangerate-api on success', async () => {
    mockAgent
      .get('https://open.er-api.com')
      .intercept({ method: 'GET', path: '/v6/latest/USD' })
      .reply(200, {
        result: 'success',
        rates: { KRW: 1380.5 },
        time_last_update_unix: 1_782_172_951,
        time_next_update_unix: 1_782_260_141,
      })

    const result = await fetchUsdKrw()
    expect(result.krw).toBe(1380.5)
    expect(result.source).toBe('exchangerate-api')
    expect(result.next).toBe(1_782_260_141)
  })

  it('falls back to Upbit exchange rate when primary fails', async () => {
    mockAgent
      .get('https://open.er-api.com')
      .intercept({ method: 'GET', path: '/v6/latest/USD' })
      .reply(500, { result: 'error' })
    mockAgent
      .get('https://api.upbit.com')
      .intercept({ method: 'GET', path: '/v1/exchange-rates' })
      .reply(200, [{ currency: 'USD', base_price: '1400.5' }])

    const result = await fetchUsdKrw()
    expect(result.krw).toBe(1400.5)
    expect(result.source).toBe('upbit')
  })
})
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm --workspace server run test -- fx.routes`
Expected: FAIL — `fetchUsdKrw` 모듈 없음.

- [ ] **Step 4: provider 구현** — `server/src/fx/provider.ts`

```ts
import { z } from 'zod'

import { FreeApiError } from '../freeapi/errors.js'
import { requestJson } from '../freeapi/http.js'
import { fetchExchangeRates } from '../upbit/upbitRest.js'
import type { FxResult } from './types.js'

export const FX_TTL_MS = 60 * 60 * 1000 // 1시간 fresh
export const FX_STALE_TTL_MS = 24 * 60 * 60 * 1000 // 24시간 stale 폴백

const ERAPI_URL = 'https://open.er-api.com/v6/latest/USD'

const erApiSchema = z.object({
  result: z.string(),
  rates: z.object({ KRW: z.number() }).passthrough(),
  time_next_update_unix: z.number().optional(),
})

async function fetchFromExchangeRateApi(): Promise<FxResult> {
  const payload = await requestJson(ERAPI_URL, erApiSchema, { timeoutMs: 4000 })
  if (payload.result !== 'success') {
    throw new FreeApiError('exchangerate-api non-success', 'UPSTREAM_ERROR', { retryable: false })
  }
  return {
    krw: payload.rates.KRW,
    source: 'exchangerate-api',
    fetchedAt: Date.now(),
    next: payload.time_next_update_unix,
  }
}

function extractUsdKrwFromUpbit(rows: Record<string, unknown>[]): number | null {
  for (const row of rows) {
    const currency = typeof row.currency === 'string' ? row.currency.toUpperCase() : ''
    const isUsd = currency === 'USD' || currency === 'USDKRW'
    if (!isUsd) continue
    const raw = row.base_price ?? row.rate
    const value = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN
    if (Number.isFinite(value) && value > 0) return value
  }
  return null
}

async function fetchFromUpbit(): Promise<FxResult> {
  const rows = await fetchExchangeRates()
  const krw = extractUsdKrwFromUpbit(rows)
  if (krw === null) {
    throw new FreeApiError('upbit fx fallback empty', 'UPSTREAM_ERROR', { retryable: false })
  }
  return { krw, source: 'upbit', fetchedAt: Date.now() }
}

export async function fetchUsdKrw(): Promise<FxResult> {
  try {
    return await fetchFromExchangeRateApi()
  } catch (primaryError) {
    try {
      return await fetchFromUpbit()
    } catch {
      throw primaryError instanceof FreeApiError
        ? primaryError
        : new FreeApiError('fx unavailable', 'UPSTREAM_ERROR', { retryable: false })
    }
  }
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm --workspace server run test -- fx.routes`
Expected: PASS (provider 2건).

- [ ] **Step 6: 커밋**

```bash
git add server/src/fx/types.ts server/src/fx/provider.ts server/test/fx.routes.test.ts
git commit -m "feat(fx): add USD/KRW provider with exchangerate-api + upbit fallback"
```

---

### Task 2: `/market/fx` 라우트

**Files:**
- Create: `server/src/routes/fx.ts`
- Modify: `server/src/app.ts`
- Test: `server/test/fx.routes.test.ts` (Task 1 파일에 라우트 케이스 추가)

**Interfaces:**
- Consumes: `cachedWithStale` from `../freeapi/cache.js`; `FreeApiError` from `../freeapi/errors.js`; `fetchUsdKrw`, `FX_TTL_MS`, `FX_STALE_TTL_MS` from `../fx/provider.js`; `FxResponse` from `../fx/types.js`.
- Produces: `registerFxRoutes(app: FastifyInstance): void`; 라우트 `GET /market/fx` → `FxResponse`.

- [ ] **Step 1: 라우트 테스트 추가** — `server/test/fx.routes.test.ts` 하단에 추가

```ts
import { buildApp } from '../src/app.js'

describe('GET /market/fx', () => {
  let app: ReturnType<typeof buildApp>
  let mockAgent: MockAgent
  let originalDispatcher: Dispatcher

  beforeEach(() => {
    clearUpbitCacheForTest()
    originalDispatcher = getGlobalDispatcher()
    mockAgent = new MockAgent()
    mockAgent.disableNetConnect()
    setGlobalDispatcher(mockAgent)
    app = buildApp()
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(async () => {
    await app.close()
    setGlobalDispatcher(originalDispatcher)
    await mockAgent.close()
    vi.restoreAllMocks()
  })

  it('returns USD/KRW rate', async () => {
    mockAgent
      .get('https://open.er-api.com')
      .intercept({ method: 'GET', path: '/v6/latest/USD' })
      .reply(200, {
        result: 'success',
        rates: { KRW: 1380.5 },
        time_next_update_unix: 1_782_260_141,
      })

    const response = await app.inject({ method: 'GET', url: '/market/fx' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      base: 'USD',
      krw: 1380.5,
      source: 'exchangerate-api',
      stale: false,
    })
  })

  it('returns degraded when both sources fail', async () => {
    mockAgent
      .get('https://open.er-api.com')
      .intercept({ method: 'GET', path: '/v6/latest/USD' })
      .reply(500, { result: 'error' })
    mockAgent
      .get('https://api.upbit.com')
      .intercept({ method: 'GET', path: '/v1/exchange-rates' })
      .reply(200, [])
    mockAgent
      .get('https://api.upbit.com')
      .intercept({ method: 'GET', path: '/v1/exchange-rate' })
      .reply(200, [])

    const response = await app.inject({ method: 'GET', url: '/market/fx' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      base: 'USD',
      krw: null,
      degraded: true,
    })
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm --workspace server run test -- fx.routes`
Expected: FAIL — `/market/fx` 미등록(404).

- [ ] **Step 3: 라우트 구현** — `server/src/routes/fx.ts`

```ts
import type { FastifyInstance } from 'fastify'

import { cachedWithStale } from '../freeapi/cache.js'
import { FreeApiError } from '../freeapi/errors.js'
import { FX_STALE_TTL_MS, FX_TTL_MS, fetchUsdKrw } from '../fx/provider.js'
import type { FxResponse } from '../fx/types.js'

function toDegraded(reason: string): FxResponse {
  return {
    base: 'USD',
    krw: null,
    source: null,
    fetchedAt: Date.now(),
    cacheTtlMs: FX_TTL_MS,
    stale: false,
    degraded: true,
    degradedReason: reason,
  }
}

export function registerFxRoutes(app: FastifyInstance): void {
  app.get('/market/fx', async () => {
    try {
      const cached = await cachedWithStale('fx:usdkrw', FX_TTL_MS, FX_STALE_TTL_MS, fetchUsdKrw)
      const response: FxResponse = {
        base: 'USD',
        krw: cached.value.krw,
        source: cached.value.source,
        fetchedAt: cached.value.fetchedAt,
        cacheTtlMs: FX_TTL_MS,
        next: cached.value.next,
        stale: cached.stale,
      }
      return response
    } catch (error) {
      if (error instanceof FreeApiError) {
        return toDegraded(error.code)
      }
      throw error
    }
  })
}
```

- [ ] **Step 4: app.ts 등록** — `server/src/app.ts`

`import { registerSentimentRoutes } ...` 아래에 추가:

```ts
import { registerFxRoutes } from './routes/fx.js'
```

`registerSentimentRoutes(app)` 아래에 추가:

```ts
  registerFxRoutes(app)
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm --workspace server run test -- fx.routes`
Expected: PASS (provider 2 + 라우트 2).

- [ ] **Step 6: 커밋**

```bash
git add server/src/routes/fx.ts server/src/app.ts server/test/fx.routes.test.ts
git commit -m "feat(fx): add GET /market/fx route with degraded fallback"
```

---

## Phase B — 서버: 김프 universe

### Task 3: 바이낸스 USDT 심볼 집합 조회

**Files:**
- Create: `server/src/kimchi/binanceSymbols.ts`
- Test: `server/test/kimchi-universe.test.ts`

**Interfaces:**
- Consumes: `requestJson` from `../freeapi/http.js`; `cached` from `../freeapi/cache.js`.
- Produces: `BINANCE_SYMBOLS_TTL_MS: number`; `async function fetchBinanceUsdtBases(): Promise<Set<string>>` — `status==='TRADING'` 이고 `quoteAsset==='USDT'` 인 `baseAsset` 집합.

- [ ] **Step 1: 실패 테스트 작성** — `server/test/kimchi-universe.test.ts`

```ts
import {
  MockAgent,
  getGlobalDispatcher,
  setGlobalDispatcher,
  type Dispatcher,
} from 'undici'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchBinanceUsdtBases } from '../src/kimchi/binanceSymbols.js'
import { clearFreeApiCacheForTest } from '../src/freeapi/cache.js'

describe('fetchBinanceUsdtBases', () => {
  let mockAgent: MockAgent
  let originalDispatcher: Dispatcher

  beforeEach(() => {
    clearFreeApiCacheForTest()
    originalDispatcher = getGlobalDispatcher()
    mockAgent = new MockAgent()
    mockAgent.disableNetConnect()
    setGlobalDispatcher(mockAgent)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(async () => {
    setGlobalDispatcher(originalDispatcher)
    await mockAgent.close()
    vi.restoreAllMocks()
  })

  it('keeps only TRADING USDT bases', async () => {
    mockAgent
      .get('https://api.binance.com')
      .intercept({ method: 'GET', path: '/api/v3/exchangeInfo' })
      .reply(200, {
        symbols: [
          { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', status: 'TRADING' },
          { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', status: 'TRADING' },
          { symbol: 'XRPBTC', baseAsset: 'XRP', quoteAsset: 'BTC', status: 'TRADING' },
          { symbol: 'LUNAUSDT', baseAsset: 'LUNA', quoteAsset: 'USDT', status: 'BREAK' },
        ],
      })

    const bases = await fetchBinanceUsdtBases()
    expect([...bases].sort()).toEqual(['BTC', 'ETH'])
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm --workspace server run test -- kimchi-universe`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현** — `server/src/kimchi/binanceSymbols.ts`

```ts
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm --workspace server run test -- kimchi-universe`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add server/src/kimchi/binanceSymbols.ts server/test/kimchi-universe.test.ts
git commit -m "feat(kimchi): add Binance USDT base symbol fetch"
```

---

### Task 4: universe 해석기 (교집합 + 상위 30 + 매핑)

**Files:**
- Create: `server/src/kimchi/types.ts`
- Create: `server/src/kimchi/universe.ts`
- Test: `server/test/kimchi-universe.test.ts` (케이스 추가)

**Interfaces:**
- Consumes: `fetchMarkets`, `fetchTickers` from `../upbit/upbitRest.js`; `fetchBinanceUsdtBases` from `./binanceSymbols.js`.
- Produces:
  - `interface KimchiUniverseItem { upbitMarket: string; binanceSymbol: string; base: string; koreanName: string; accTradePrice24h: number }`
  - `KIMCHI_UNIVERSE_TTL_MS`, `KIMCHI_UNIVERSE_STALE_TTL_MS`, `KIMCHI_UNIVERSE_LIMIT`
  - `async function resolveKimchiUniverse(limit?: number): Promise<KimchiUniverseItem[]>`

- [ ] **Step 1: 타입 작성** — `server/src/kimchi/types.ts`

```ts
export interface KimchiUniverseItem {
  upbitMarket: string
  binanceSymbol: string
  base: string
  koreanName: string
  accTradePrice24h: number
}

export interface KimchiUniverseResponse {
  items: KimchiUniverseItem[]
  fetchedAt: number
  cacheTtlMs: number
  stale: boolean
  degraded?: boolean
  degradedReason?: string
}
```

- [ ] **Step 2: 실패 테스트 추가** — `server/test/kimchi-universe.test.ts`

```ts
import { resolveKimchiUniverse } from '../src/kimchi/universe.js'
import { clearUpbitCacheForTest } from '../src/upbit/upbitRest.js'

describe('resolveKimchiUniverse', () => {
  let mockAgent: MockAgent
  let originalDispatcher: Dispatcher

  beforeEach(() => {
    clearFreeApiCacheForTest()
    clearUpbitCacheForTest()
    originalDispatcher = getGlobalDispatcher()
    mockAgent = new MockAgent()
    mockAgent.disableNetConnect()
    setGlobalDispatcher(mockAgent)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(async () => {
    setGlobalDispatcher(originalDispatcher)
    await mockAgent.close()
    vi.restoreAllMocks()
  })

  it('intersects Upbit KRW and Binance USDT, sorted by 24h value desc', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({ method: 'GET', path: '/v1/market/all?isDetails=false' })
      .reply(200, [
        { market: 'KRW-BTC', korean_name: '비트코인', english_name: 'Bitcoin' },
        { market: 'KRW-ETH', korean_name: '이더리움', english_name: 'Ethereum' },
        { market: 'KRW-ONLYUPBIT', korean_name: '온리', english_name: 'Only' },
      ])
    mockAgent
      .get('https://api.upbit.com')
      .intercept({ method: 'GET', path: '/v1/ticker?markets=KRW-BTC,KRW-ETH,KRW-ONLYUPBIT' })
      .reply(200, [
        { market: 'KRW-BTC', trade_price: 1, signed_change_rate: 0, acc_trade_price_24h: 100 },
        { market: 'KRW-ETH', trade_price: 1, signed_change_rate: 0, acc_trade_price_24h: 300 },
        { market: 'KRW-ONLYUPBIT', trade_price: 1, signed_change_rate: 0, acc_trade_price_24h: 999 },
      ])
    mockAgent
      .get('https://api.binance.com')
      .intercept({ method: 'GET', path: '/api/v3/exchangeInfo' })
      .reply(200, {
        symbols: [
          { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', status: 'TRADING' },
          { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', status: 'TRADING' },
        ],
      })

    const items = await resolveKimchiUniverse(10)
    expect(items.map((item) => item.base)).toEqual(['ETH', 'BTC'])
    expect(items[0]).toEqual({
      upbitMarket: 'KRW-ETH',
      binanceSymbol: 'ETHUSDT',
      base: 'ETH',
      koreanName: '이더리움',
      accTradePrice24h: 300,
    })
  })
})
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm --workspace server run test -- kimchi-universe`
Expected: FAIL — `resolveKimchiUniverse` 없음.

- [ ] **Step 4: 구현** — `server/src/kimchi/universe.ts`

```ts
import { fetchMarkets, fetchTickers } from '../upbit/upbitRest.js'
import { fetchBinanceUsdtBases } from './binanceSymbols.js'
import type { KimchiUniverseItem } from './types.js'

export const KIMCHI_UNIVERSE_LIMIT = 30
export const KIMCHI_UNIVERSE_TTL_MS = 3 * 60 * 1000 // 3분
export const KIMCHI_UNIVERSE_STALE_TTL_MS = 30 * 60 * 1000 // 30분

function baseOf(market: string): string {
  return (market.split('-', 2)[1] ?? '').toUpperCase()
}

export async function resolveKimchiUniverse(
  limit: number = KIMCHI_UNIVERSE_LIMIT,
): Promise<KimchiUniverseItem[]> {
  const [markets, binanceBases] = await Promise.all([
    fetchMarkets({ quote: 'KRW' }),
    fetchBinanceUsdtBases(),
  ])

  const krwMarkets = markets.map((market) => market.market)
  if (krwMarkets.length === 0) return []

  const tickers = await fetchTickers(krwMarkets)
  const volumeByMarket = new Map(tickers.map((ticker) => [ticker.market, ticker.accTradePrice24h]))

  return markets
    .map((market) => {
      const base = baseOf(market.market)
      return {
        upbitMarket: market.market,
        binanceSymbol: `${base}USDT`,
        base,
        koreanName: market.koreanName,
        accTradePrice24h: volumeByMarket.get(market.market) ?? 0,
      }
    })
    .filter((item) => item.base.length > 0 && binanceBases.has(item.base))
    .sort((a, b) => b.accTradePrice24h - a.accTradePrice24h)
    .slice(0, limit)
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm --workspace server run test -- kimchi-universe`
Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add server/src/kimchi/types.ts server/src/kimchi/universe.ts server/test/kimchi-universe.test.ts
git commit -m "feat(kimchi): resolve top-N universe by Upbit 24h volume intersected with Binance"
```

---

### Task 5: `/market/kimchi/universe` 라우트

**Files:**
- Create: `server/src/routes/kimchi.ts`
- Modify: `server/src/app.ts`
- Test: `server/test/kimchi.routes.test.ts`

**Interfaces:**
- Consumes: `cachedWithStale`; `FreeApiError`; `resolveKimchiUniverse`, `KIMCHI_UNIVERSE_TTL_MS`, `KIMCHI_UNIVERSE_STALE_TTL_MS`, `KIMCHI_UNIVERSE_LIMIT` from `../kimchi/universe.js`; `KimchiUniverseResponse` from `../kimchi/types.js`.
- Produces: `registerKimchiRoutes(app: FastifyInstance): void`; 라우트 `GET /market/kimchi/universe` → `KimchiUniverseResponse`.

- [ ] **Step 1: 실패 테스트 작성** — `server/test/kimchi.routes.test.ts`

```ts
import {
  MockAgent,
  getGlobalDispatcher,
  setGlobalDispatcher,
  type Dispatcher,
} from 'undici'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildApp } from '../src/app.js'
import { clearFreeApiCacheForTest } from '../src/freeapi/cache.js'
import { clearUpbitCacheForTest } from '../src/upbit/upbitRest.js'

describe('GET /market/kimchi/universe', () => {
  let app: ReturnType<typeof buildApp>
  let mockAgent: MockAgent
  let originalDispatcher: Dispatcher

  beforeEach(() => {
    clearFreeApiCacheForTest()
    clearUpbitCacheForTest()
    originalDispatcher = getGlobalDispatcher()
    mockAgent = new MockAgent()
    mockAgent.disableNetConnect()
    setGlobalDispatcher(mockAgent)
    app = buildApp()
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(async () => {
    await app.close()
    setGlobalDispatcher(originalDispatcher)
    await mockAgent.close()
    vi.restoreAllMocks()
  })

  it('returns mapped universe items', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({ method: 'GET', path: '/v1/market/all?isDetails=false' })
      .reply(200, [{ market: 'KRW-BTC', korean_name: '비트코인', english_name: 'Bitcoin' }])
    mockAgent
      .get('https://api.upbit.com')
      .intercept({ method: 'GET', path: '/v1/ticker?markets=KRW-BTC' })
      .reply(200, [{ market: 'KRW-BTC', trade_price: 1, signed_change_rate: 0, acc_trade_price_24h: 100 }])
    mockAgent
      .get('https://api.binance.com')
      .intercept({ method: 'GET', path: '/api/v3/exchangeInfo' })
      .reply(200, {
        symbols: [{ symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', status: 'TRADING' }],
      })

    const response = await app.inject({ method: 'GET', url: '/market/kimchi/universe' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      stale: false,
      items: [
        {
          upbitMarket: 'KRW-BTC',
          binanceSymbol: 'BTCUSDT',
          base: 'BTC',
          koreanName: '비트코인',
          accTradePrice24h: 100,
        },
      ],
    })
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm --workspace server run test -- kimchi.routes`
Expected: FAIL — 404.

- [ ] **Step 3: 라우트 구현** — `server/src/routes/kimchi.ts`

```ts
import type { FastifyInstance } from 'fastify'

import { cachedWithStale } from '../freeapi/cache.js'
import { FreeApiError } from '../freeapi/errors.js'
import type { KimchiUniverseResponse } from '../kimchi/types.js'
import {
  KIMCHI_UNIVERSE_STALE_TTL_MS,
  KIMCHI_UNIVERSE_TTL_MS,
  resolveKimchiUniverse,
} from '../kimchi/universe.js'

function toDegraded(reason: string): KimchiUniverseResponse {
  return {
    items: [],
    fetchedAt: Date.now(),
    cacheTtlMs: KIMCHI_UNIVERSE_TTL_MS,
    stale: false,
    degraded: true,
    degradedReason: reason,
  }
}

export function registerKimchiRoutes(app: FastifyInstance): void {
  app.get('/market/kimchi/universe', async () => {
    try {
      const cached = await cachedWithStale(
        'kimchi:universe',
        KIMCHI_UNIVERSE_TTL_MS,
        KIMCHI_UNIVERSE_STALE_TTL_MS,
        () => resolveKimchiUniverse(),
      )
      const response: KimchiUniverseResponse = {
        items: cached.value,
        fetchedAt: Date.now(),
        cacheTtlMs: KIMCHI_UNIVERSE_TTL_MS,
        stale: cached.stale,
      }
      return response
    } catch (error) {
      if (error instanceof FreeApiError) {
        return toDegraded(error.code)
      }
      throw error
    }
  })
}
```

- [ ] **Step 4: app.ts 등록** — `server/src/app.ts`

import 추가:

```ts
import { registerKimchiRoutes } from './routes/kimchi.js'
```

`registerFxRoutes(app)` 아래에 추가:

```ts
  registerKimchiRoutes(app)
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm --workspace server run test -- kimchi.routes`
Expected: PASS.

- [ ] **Step 6: 전체 서버 테스트 회귀 확인 후 커밋**

```bash
npm --workspace server run test
git add server/src/routes/kimchi.ts server/src/app.ts server/test/kimchi.routes.test.ts
git commit -m "feat(kimchi): add GET /market/kimchi/universe route"
```

---

## Phase C — 클라이언트: 데이터 계층

### Task 6: rest.ts에 `getFx` / `getKimchiUniverse` 추가

**Files:**
- Modify: `web/src/api/rest.ts`
- Test: `web/test/rest.test.ts` (케이스 추가)

**Interfaces:**
- Produces (export):
  - `interface FxView { base: string; krw: number | null; source: string | null; fetchedAt: number; cacheTtlMs: number; next?: number; stale: boolean; degraded?: boolean; degradedReason?: string }`
  - `interface KimchiUniverseItemView { upbitMarket: string; binanceSymbol: string; base: string; koreanName: string; accTradePrice24h: number }`
  - `interface KimchiUniverseView { items: KimchiUniverseItemView[]; fetchedAt: number; cacheTtlMs: number; stale: boolean; degraded?: boolean; degradedReason?: string }`
  - `getFx(): Promise<FxView>`, `getKimchiUniverse(): Promise<KimchiUniverseView>`

- [ ] **Step 1: 테스트 추가** — `web/test/rest.test.ts` (기존 패턴 확인 후 동일 스타일로). 최소 케이스:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { getFx, getKimchiUniverse } from "../src/api/rest";

afterEach(() => vi.restoreAllMocks());

describe("getFx / getKimchiUniverse", () => {
  it("fetches fx", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ base: "USD", krw: 1380.5, source: "exchangerate-api", fetchedAt: 1, cacheTtlMs: 1, stale: false }),
    })) as unknown as typeof fetch);

    const fx = await getFx();
    expect(fx.krw).toBe(1380.5);
  });

  it("fetches kimchi universe", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        items: [{ upbitMarket: "KRW-BTC", binanceSymbol: "BTCUSDT", base: "BTC", koreanName: "비트코인", accTradePrice24h: 100 }],
        fetchedAt: 1, cacheTtlMs: 1, stale: false,
      }),
    })) as unknown as typeof fetch);

    const view = await getKimchiUniverse();
    expect(view.items[0].binanceSymbol).toBe("BTCUSDT");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm --workspace web run test -- rest`
Expected: FAIL — export 없음.

- [ ] **Step 3: 구현** — `web/src/api/rest.ts` 의 `getMarketSentiment` 정의 아래에 추가

```ts
export interface FxView {
  base: string;
  krw: number | null;
  source: string | null;
  fetchedAt: number;
  cacheTtlMs: number;
  next?: number;
  stale: boolean;
  degraded?: boolean;
  degradedReason?: string;
}

export interface KimchiUniverseItemView {
  upbitMarket: string;
  binanceSymbol: string;
  base: string;
  koreanName: string;
  accTradePrice24h: number;
}

export interface KimchiUniverseView {
  items: KimchiUniverseItemView[];
  fetchedAt: number;
  cacheTtlMs: number;
  stale: boolean;
  degraded?: boolean;
  degradedReason?: string;
}

export const getFx = async (): Promise<FxView> => {
  return getJson<FxView>("/market/fx");
};

export const getKimchiUniverse = async (): Promise<KimchiUniverseView> => {
  return getJson<KimchiUniverseView>("/market/kimchi/universe");
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm --workspace web run test -- rest`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add web/src/api/rest.ts web/test/rest.test.ts
git commit -m "feat(web): add getFx and getKimchiUniverse REST clients"
```

---

### Task 7: 환율 store

**Files:**
- Create: `web/src/stores/fx.ts`
- Test: `web/test/fx-store.test.ts`

**Interfaces:**
- Consumes: `getFx`, `FxView` from `../api/rest.js`.
- Produces: `useFxStore` — state `{ krw: number | null, stale: boolean, degraded: boolean, loading: boolean, error: string }`, action `load(): Promise<void>`.

- [ ] **Step 1: 실패 테스트 작성** — `web/test/fx-store.test.ts`

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useFxStore } from "../src/stores/fx";

beforeEach(() => setActivePinia(createPinia()));
afterEach(() => vi.restoreAllMocks());

describe("fx store", () => {
  it("loads krw rate", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ base: "USD", krw: 1380.5, source: "exchangerate-api", fetchedAt: 1, cacheTtlMs: 1, stale: false }),
    })) as unknown as typeof fetch);

    const store = useFxStore();
    await store.load();

    expect(store.krw).toBe(1380.5);
    expect(store.degraded).toBe(false);
  });

  it("marks degraded when payload is degraded", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ base: "USD", krw: null, source: null, fetchedAt: 1, cacheTtlMs: 1, stale: false, degraded: true }),
    })) as unknown as typeof fetch);

    const store = useFxStore();
    await store.load();

    expect(store.krw).toBeNull();
    expect(store.degraded).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm --workspace web run test -- fx-store`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현** — `web/src/stores/fx.ts`

```ts
import { defineStore } from "pinia";
import { getFx } from "../api/rest.js";

export const useFxStore = defineStore("fx", {
  state: () => ({
    krw: null as number | null,
    stale: false,
    degraded: false,
    loading: false,
    error: "",
  }),
  actions: {
    async load() {
      this.loading = true;
      try {
        const view = await getFx();
        this.krw = view.krw;
        this.stale = view.stale;
        this.degraded = view.degraded ?? false;
        this.error = "";
      } catch (error) {
        this.error = error instanceof Error ? error.message : "환율을 불러오지 못했습니다.";
      } finally {
        this.loading = false;
      }
    },
  },
});
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm --workspace web run test -- fx-store`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add web/src/stores/fx.ts web/test/fx-store.test.ts
git commit -m "feat(web): add fx store"
```

---

### Task 8: 바이낸스 WS 스키마 + RxJS 파이프라인

**Files:**
- Create: `web/src/shared/validation/schemas/ws/binance.ts`
- Create: `web/src/workers/binanceProtocol.ts`
- Create: `web/src/workers/binancePipeline.ts`
- Test: `web/test/binance-pipeline.test.ts`

**Interfaces:**
- Consumes: `rxjs` (`Observable`, `Subject`, operators).
- Produces:
  - `binanceProtocol.ts`: `interface BinancePriceUpdate { symbol: string; price: number }`; `type BinanceWorkerCommand = { type: 'subscribe' | 'unsubscribe'; symbols: string[] }`; `type BinanceWorkerResponse = { type: 'binance-ticker'; data: BinancePriceUpdate[] } | { type: 'status'; connected: boolean }`; `function buildStreamParams(symbols: string[]): string[]` (예: `['btcusdt@miniTicker']`).
  - `binancePipeline.ts`: `function normalizeBinance(raw: unknown): BinancePriceUpdate | null`; `function createBinanceOutputStream(raw$: Observable<unknown>): Observable<BinanceWorkerResponse>`.

- [ ] **Step 1: 스키마 작성** — `web/src/shared/validation/schemas/ws/binance.ts`

```ts
import { z } from "zod";

// 결합 스트림(wss://.../stream?streams=...) miniTicker 메시지
export const binanceMiniTickerSchema = z.object({
  stream: z.string(),
  data: z.object({
    s: z.string(), // 심볼 (예: BTCUSDT)
    c: z.string(), // 현재가(마지막 체결가)
  }),
});

export type BinanceMiniTickerMessage = z.infer<typeof binanceMiniTickerSchema>;
```

- [ ] **Step 2: 프로토콜 작성** — `web/src/workers/binanceProtocol.ts`

```ts
export interface BinancePriceUpdate {
  symbol: string; // 업비트 매칭용 대문자 (예: BTCUSDT)
  price: number;
}

export interface BinanceWorkerCommand {
  type: "subscribe" | "unsubscribe";
  symbols: string[]; // 대문자 심볼 (예: ["BTCUSDT"])
}

export type BinanceWorkerResponse =
  | { type: "binance-ticker"; data: BinancePriceUpdate[] }
  | { type: "status"; connected: boolean };

// 심볼 → 바이낸스 결합 스트림 파라미터 (소문자 + @miniTicker)
export function buildStreamParams(symbols: string[]): string[] {
  return symbols
    .map((symbol) => symbol.trim().toLowerCase())
    .filter((symbol) => symbol.length > 0)
    .map((symbol) => `${symbol}@miniTicker`);
}
```

- [ ] **Step 3: 파이프라인 실패 테스트 작성** — `web/test/binance-pipeline.test.ts`

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Subject } from "rxjs";
import { normalizeBinance, createBinanceOutputStream } from "../src/workers/binancePipeline";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("normalizeBinance", () => {
  it("maps miniTicker to symbol/price", () => {
    const out = normalizeBinance({ stream: "btcusdt@miniTicker", data: { s: "BTCUSDT", c: "65000.1" } });
    expect(out).toEqual({ symbol: "BTCUSDT", price: 65000.1 });
  });

  it("returns null for invalid payload", () => {
    expect(normalizeBinance({ stream: "x", data: { s: "BTCUSDT" } })).toBeNull();
  });
});

describe("createBinanceOutputStream", () => {
  it("buffers per 100ms keeping latest per symbol", () => {
    const raw$ = new Subject<unknown>();
    const got: any[] = [];
    const sub = createBinanceOutputStream(raw$).subscribe((r) => got.push(r));

    raw$.next({ stream: "btcusdt@miniTicker", data: { s: "BTCUSDT", c: "1" } });
    raw$.next({ stream: "btcusdt@miniTicker", data: { s: "BTCUSDT", c: "2" } });
    raw$.next({ stream: "ethusdt@miniTicker", data: { s: "ETHUSDT", c: "9" } });

    vi.advanceTimersByTime(120);

    const tick = got.find((r) => r.type === "binance-ticker");
    expect(tick.data).toEqual(
      expect.arrayContaining([
        { symbol: "BTCUSDT", price: 2 },
        { symbol: "ETHUSDT", price: 9 },
      ]),
    );
    expect(tick.data).toHaveLength(2);
    sub.unsubscribe();
  });
});
```

- [ ] **Step 4: 테스트 실패 확인**

Run: `npm --workspace web run test -- binance-pipeline`
Expected: FAIL — 모듈 없음.

- [ ] **Step 5: 파이프라인 구현** — `web/src/workers/binancePipeline.ts`

```ts
import { type Observable } from "rxjs";
import { filter, map, bufferTime } from "rxjs/operators";
import { binanceMiniTickerSchema } from "../shared/validation/schemas/ws/binance.js";
import type { BinancePriceUpdate, BinanceWorkerResponse } from "./binanceProtocol.js";

export function normalizeBinance(raw: unknown): BinancePriceUpdate | null {
  const parsed = binanceMiniTickerSchema.safeParse(raw);
  if (!parsed.success) return null;

  const price = Number(parsed.data.data.c);
  if (!Number.isFinite(price)) return null;

  return { symbol: parsed.data.data.s.toUpperCase(), price };
}

export function createBinanceOutputStream(
  raw$: Observable<unknown>,
): Observable<BinanceWorkerResponse> {
  return raw$.pipe(
    map(normalizeBinance),
    filter((value): value is BinancePriceUpdate => value !== null),
    bufferTime(100),
    filter((batch) => batch.length > 0),
    map((batch) => {
      const latest = new Map<string, BinancePriceUpdate>();
      batch.forEach((update) => latest.set(update.symbol, update));
      return { type: "binance-ticker" as const, data: [...latest.values()] };
    }),
  );
}
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npm --workspace web run test -- binance-pipeline`
Expected: PASS.

- [ ] **Step 7: 커밋**

```bash
git add web/src/shared/validation/schemas/ws/binance.ts web/src/workers/binanceProtocol.ts web/src/workers/binancePipeline.ts web/test/binance-pipeline.test.ts
git commit -m "feat(web): add Binance WS schema and RxJS pipeline"
```

---

### Task 9: 바이낸스 WS 워커

**Files:**
- Create: `web/src/workers/binanceSocket.worker.ts`

**Interfaces:**
- Consumes: `Subject` from `rxjs`; `createBinanceOutputStream` from `./binancePipeline.js`; `BinanceWorkerCommand`, `buildStreamParams` from `./binanceProtocol.js`.
- Produces: 워커 — `subscribe`/`unsubscribe` 명령 수신, `BinanceWorkerResponse`를 postMessage.

설계 메모: 바이낸스 결합 스트림 베이스 `wss://stream.binance.com:9443/stream` 에 연결하고, 구독 변경은 `{ method: "SUBSCRIBE"|"UNSUBSCRIBE", params, id }` 메시지로 처리한다. 끊기면 3초 후 재연결하고 현재 구독 집합을 다시 SUBSCRIBE 한다. 이 워커는 브라우저 런타임 전용이라 단위 테스트 대상에서 제외하며, 검증은 Task 13의 페이지 통합과 수동 실행(`npm --workspace web run dev`)으로 확인한다.

- [ ] **Step 1: 구현** — `web/src/workers/binanceSocket.worker.ts`

```ts
import { Subject } from "rxjs";
import { createBinanceOutputStream } from "./binancePipeline.js";
import { buildStreamParams, type BinanceWorkerCommand } from "./binanceProtocol.js";

const BINANCE_STREAM_URL = "wss://stream.binance.com:9443/stream";

const subscribed = new Set<string>(); // 대문자 심볼
const raw$ = new Subject<unknown>();
let ws: WebSocket | null = null;
let nextId = 1;

createBinanceOutputStream(raw$).subscribe((response) => self.postMessage(response));

function connect() {
  ws = new WebSocket(BINANCE_STREAM_URL);
  ws.onopen = () => {
    self.postMessage({ type: "status", connected: true });
    sendSubscription("SUBSCRIBE", [...subscribed]);
  };
  ws.onclose = () => {
    self.postMessage({ type: "status", connected: false });
    setTimeout(connect, 3000);
  };
  ws.onerror = () => ws?.close();
  ws.onmessage = (event) => {
    try {
      raw$.next(JSON.parse(event.data as string));
    } catch {
      // 비정상 프레임 무시
    }
  };
}

function sendSubscription(method: "SUBSCRIBE" | "UNSUBSCRIBE", symbols: string[]) {
  if (ws?.readyState !== WebSocket.OPEN) return;
  const params = buildStreamParams(symbols);
  if (params.length === 0) return;
  ws.send(JSON.stringify({ method, params, id: nextId++ }));
}

self.onmessage = (event: MessageEvent<BinanceWorkerCommand>) => {
  const { type, symbols } = event.data;
  const upper = symbols.map((symbol) => symbol.toUpperCase());

  if (type === "subscribe") {
    const added = upper.filter((symbol) => !subscribed.has(symbol));
    added.forEach((symbol) => subscribed.add(symbol));
    sendSubscription("SUBSCRIBE", added);
  } else {
    const removed = upper.filter((symbol) => subscribed.has(symbol));
    removed.forEach((symbol) => subscribed.delete(symbol));
    sendSubscription("UNSUBSCRIBE", removed);
  }
};

connect();
```

- [ ] **Step 2: 타입체크 확인**

Run: `npm --workspace web run build`
Expected: 타입 에러 없음(빌드 성공).

- [ ] **Step 3: 커밋**

```bash
git add web/src/workers/binanceSocket.worker.ts
git commit -m "feat(web): add Binance WebSocket worker with dynamic subscription"
```

---

### Task 10: 바이낸스 store + useBinanceSocket 컴포저블

**Files:**
- Create: `web/src/stores/binance.ts`
- Create: `web/src/composables/useBinanceSocket.ts`
- Test: `web/test/kimchi-store.test.ts` (binance store 케이스 포함; 같은 파일에서 Task 11도 사용)

**Interfaces:**
- `stores/binance.ts`: `useBinanceStore` — state `{ bySymbol: Record<string, number> }`, action `applyPrices(list: BinancePriceUpdate[])`.
- `composables/useBinanceSocket.ts`: `useBinanceSocket()` → `{ subscribe(symbols: string[]): void, unsubscribe(symbols: string[]): void }`.

- [ ] **Step 1: binance store 실패 테스트 작성** — `web/test/kimchi-store.test.ts`

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useBinanceStore } from "../src/stores/binance";

beforeEach(() => setActivePinia(createPinia()));

describe("binance store", () => {
  it("indexes price by symbol", () => {
    const store = useBinanceStore();
    store.applyPrices([{ symbol: "BTCUSDT", price: 65000 }]);
    expect(store.bySymbol["BTCUSDT"]).toBe(65000);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm --workspace web run test -- kimchi-store`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: binance store 구현** — `web/src/stores/binance.ts`

```ts
import { defineStore } from "pinia";
import type { BinancePriceUpdate } from "../workers/binanceProtocol.js";

export const useBinanceStore = defineStore("binance", {
  state: () => ({ bySymbol: {} as Record<string, number> }),
  actions: {
    applyPrices(list: BinancePriceUpdate[]) {
      list.forEach((update) => {
        this.bySymbol[update.symbol] = update.price;
      });
    },
  },
});
```

- [ ] **Step 4: 컴포저블 구현** — `web/src/composables/useBinanceSocket.ts`

```ts
import { onUnmounted } from "vue";
import { useBinanceStore } from "../stores/binance.js";
import type {
  BinancePriceUpdate,
  BinanceWorkerCommand,
  BinanceWorkerResponse,
} from "../workers/binanceProtocol.js";

export function useBinanceSocket() {
  const worker = new Worker(
    new URL("../workers/binanceSocket.worker.ts", import.meta.url),
    { type: "module" },
  );
  const binance = useBinanceStore();

  worker.onmessage = (event: MessageEvent<BinanceWorkerResponse>) => {
    const message = event.data;
    if (message.type === "binance-ticker") {
      binance.applyPrices(message.data as BinancePriceUpdate[]);
    }
  };

  const post = (command: BinanceWorkerCommand) => worker.postMessage(command);
  const subscribe = (symbols: string[]) => post({ type: "subscribe", symbols });
  const unsubscribe = (symbols: string[]) => post({ type: "unsubscribe", symbols });

  onUnmounted(() => worker.terminate());
  return { subscribe, unsubscribe };
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm --workspace web run test -- kimchi-store`
Expected: PASS (binance store 케이스).

- [ ] **Step 6: 커밋**

```bash
git add web/src/stores/binance.ts web/src/composables/useBinanceSocket.ts web/test/kimchi-store.test.ts
git commit -m "feat(web): add binance store and useBinanceSocket bridge"
```

---

### Task 11: 김프 파생 store

**Files:**
- Create: `web/src/stores/kimchi.ts`
- Test: `web/test/kimchi-store.test.ts` (케이스 추가)

**Interfaces:**
- Consumes: `getKimchiUniverse`, `KimchiUniverseItemView` from `../api/rest.js`; `useTickerStore`; `useBinanceStore`; `useFxStore`.
- Produces:
  - `interface KimchiRow { base: string; koreanName: string; upbitMarket: string; binanceSymbol: string; accTradePrice24h: number; upbitKrw: number | null; binanceKrw: number | null; premiumPercent: number | null }`
  - `useKimchiStore` — state `{ items: KimchiUniverseItemView[], loading: boolean, error: string, degraded: boolean }`; action `loadUniverse(): Promise<void>`; getter `rows: KimchiRow[]`; getters `upbitMarkets: string[]`, `binanceSymbols: string[]`.

- [ ] **Step 1: 실패 테스트 추가** — `web/test/kimchi-store.test.ts`

```ts
import { useKimchiStore } from "../src/stores/kimchi";
import { useTickerStore } from "../src/stores/ticker";
import { useFxStore } from "../src/stores/fx";

describe("kimchi store rows", () => {
  it("computes premium percent from upbit, binance, fx", () => {
    const kimchi = useKimchiStore();
    kimchi.items = [
      {
        upbitMarket: "KRW-BTC",
        binanceSymbol: "BTCUSDT",
        base: "BTC",
        koreanName: "비트코인",
        accTradePrice24h: 100,
      },
    ];

    useTickerStore().applyTicker([
      { market: "KRW-BTC", tradePrice: 138_500_000, signedChangeRate: 0, accTradePrice24h: 100 },
    ]);
    useBinanceStore().applyPrices([{ symbol: "BTCUSDT", price: 100_000 }]);
    useFxStore().krw = 1380;

    const row = kimchi.rows[0];
    // binanceKrw = 100000 * 1380 = 138,000,000 ; premium = 138.5M/138M - 1 = 0.3623...%
    expect(row.binanceKrw).toBe(138_000_000);
    expect(row.premiumPercent).toBeCloseTo(0.36231, 4);
    expect(kimchi.binanceSymbols).toEqual(["BTCUSDT"]);
    expect(kimchi.upbitMarkets).toEqual(["KRW-BTC"]);
  });

  it("leaves premium null when fx missing", () => {
    const kimchi = useKimchiStore();
    kimchi.items = [
      { upbitMarket: "KRW-BTC", binanceSymbol: "BTCUSDT", base: "BTC", koreanName: "비트코인", accTradePrice24h: 100 },
    ];
    useTickerStore().applyTicker([
      { market: "KRW-BTC", tradePrice: 138_500_000, signedChangeRate: 0, accTradePrice24h: 100 },
    ]);
    useBinanceStore().applyPrices([{ symbol: "BTCUSDT", price: 100_000 }]);
    useFxStore().krw = null;

    expect(kimchi.rows[0].premiumPercent).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm --workspace web run test -- kimchi-store`
Expected: FAIL — `useKimchiStore` 없음.

- [ ] **Step 3: 구현** — `web/src/stores/kimchi.ts`

```ts
import { defineStore } from "pinia";
import { getKimchiUniverse, type KimchiUniverseItemView } from "../api/rest.js";
import { useTickerStore } from "./ticker.js";
import { useBinanceStore } from "./binance.js";
import { useFxStore } from "./fx.js";

export interface KimchiRow {
  base: string;
  koreanName: string;
  upbitMarket: string;
  binanceSymbol: string;
  accTradePrice24h: number;
  upbitKrw: number | null;
  binanceKrw: number | null;
  premiumPercent: number | null;
}

export const useKimchiStore = defineStore("kimchi", {
  state: () => ({
    items: [] as KimchiUniverseItemView[],
    loading: false,
    error: "",
    degraded: false,
  }),
  getters: {
    upbitMarkets: (state): string[] => state.items.map((item) => item.upbitMarket),
    binanceSymbols: (state): string[] => state.items.map((item) => item.binanceSymbol),
    rows(state): KimchiRow[] {
      const ticker = useTickerStore();
      const binance = useBinanceStore();
      const fx = useFxStore();

      return state.items.map((item) => {
        const upbitKrw = ticker.byMarket[item.upbitMarket]?.tradePrice ?? null;
        const binanceUsdt = binance.bySymbol[item.binanceSymbol] ?? null;
        const krw = fx.krw;

        const binanceKrw = binanceUsdt !== null && krw !== null ? binanceUsdt * krw : null;
        const premiumPercent =
          upbitKrw !== null && binanceKrw !== null && binanceKrw > 0
            ? (upbitKrw / binanceKrw - 1) * 100
            : null;

        return {
          base: item.base,
          koreanName: item.koreanName,
          upbitMarket: item.upbitMarket,
          binanceSymbol: item.binanceSymbol,
          accTradePrice24h: item.accTradePrice24h,
          upbitKrw,
          binanceKrw,
          premiumPercent,
        };
      });
    },
  },
  actions: {
    async loadUniverse() {
      this.loading = true;
      try {
        const view = await getKimchiUniverse();
        this.items = view.items;
        this.degraded = view.degraded ?? false;
        this.error = "";
      } catch (error) {
        this.error = error instanceof Error ? error.message : "김프 목록을 불러오지 못했습니다.";
      } finally {
        this.loading = false;
      }
    },
  },
});
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm --workspace web run test -- kimchi-store`
Expected: PASS (binance + kimchi rows).

- [ ] **Step 5: 커밋**

```bash
git add web/src/stores/kimchi.ts web/test/kimchi-store.test.ts
git commit -m "feat(web): add kimchi derived store computing premium"
```

---

## Phase D — 클라이언트: UI

### Task 12: 김프 표 컴포넌트

**Files:**
- Create: `web/src/features/kimchi/KimchiTable.vue`
- Test: `web/test/kimchi-table.test.ts`

**Interfaces:**
- Consumes: `KimchiRow` from `../../stores/kimchi.js`; `formatNumber` 등은 `../../utils/format.js`가 제공하는 헬퍼를 사용(없으면 인라인 `toLocaleString`).
- Produces: `KimchiTable.vue` — props `{ rows: KimchiRow[] }`, 내부 정렬 상태(기본 `premiumPercent` 내림차순), 헤더 클릭으로 정렬 키/방향 토글.

- [ ] **Step 1: 실패 테스트 작성** — `web/test/kimchi-table.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import KimchiTable from "../src/features/kimchi/KimchiTable.vue";
import type { KimchiRow } from "../src/stores/kimchi";

const rows: KimchiRow[] = [
  { base: "BTC", koreanName: "비트코인", upbitMarket: "KRW-BTC", binanceSymbol: "BTCUSDT", accTradePrice24h: 100, upbitKrw: 138_500_000, binanceKrw: 138_000_000, premiumPercent: 0.36 },
  { base: "ETH", koreanName: "이더리움", upbitMarket: "KRW-ETH", binanceSymbol: "ETHUSDT", accTradePrice24h: 300, upbitKrw: 5_000_000, binanceKrw: 4_900_000, premiumPercent: 2.04 },
];

describe("KimchiTable", () => {
  it("renders one row per item, sorted by premium desc by default", () => {
    const wrapper = mount(KimchiTable, { props: { rows } });
    const bodyRows = wrapper.findAll("tbody tr");
    expect(bodyRows).toHaveLength(2);
    // 기본 정렬: premium 내림차순 → ETH(2.04) 먼저
    expect(bodyRows[0].text()).toContain("이더리움");
  });

  it("renders dash when premium is null", () => {
    const wrapper = mount(KimchiTable, {
      props: { rows: [{ ...rows[0], premiumPercent: null, binanceKrw: null }] },
    });
    expect(wrapper.find("tbody tr").text()).toContain("—");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm --workspace web run test -- kimchi-table`
Expected: FAIL — 컴포넌트 없음.

- [ ] **Step 3: 구현** — `web/src/features/kimchi/KimchiTable.vue`

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import type { KimchiRow } from "../../stores/kimchi.js";

const props = defineProps<{ rows: KimchiRow[] }>();

type SortKey = "premiumPercent" | "accTradePrice24h" | "upbitKrw";
const sortKey = ref<SortKey>("premiumPercent");
const sortDesc = ref(true);

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDesc.value = !sortDesc.value;
  } else {
    sortKey.value = key;
    sortDesc.value = true;
  }
}

const sortedRows = computed(() => {
  const factor = sortDesc.value ? -1 : 1;
  return [...props.rows].sort((a, b) => {
    const av = a[sortKey.value];
    const bv = b[sortKey.value];
    const an = av === null ? Number.NEGATIVE_INFINITY : av;
    const bn = bv === null ? Number.NEGATIVE_INFINITY : bv;
    return (an - bn) * factor;
  });
});

function fmtKrw(value: number | null): string {
  return value === null ? "—" : `₩${Math.round(value).toLocaleString("ko-KR")}`;
}

function fmtPercent(value: number | null): string {
  return value === null ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function fmtValue(value: number): string {
  return `₩${Math.round(value).toLocaleString("ko-KR")}`;
}
</script>

<template>
  <table class="kimchi-table">
    <thead>
      <tr>
        <th>코인</th>
        <th>업비트(KRW)</th>
        <th>바이낸스(KRW 환산)</th>
        <th class="kimchi-table__sortable" @click="toggleSort('premiumPercent')">김프 %</th>
        <th class="kimchi-table__sortable" @click="toggleSort('accTradePrice24h')">24h 거래대금</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in sortedRows" :key="row.upbitMarket">
        <td>{{ row.koreanName }} <span class="kimchi-table__symbol">{{ row.base }}</span></td>
        <td>{{ fmtKrw(row.upbitKrw) }}</td>
        <td :title="`바이낸스 ${row.binanceSymbol} · USDT≈USD 근사`">{{ fmtKrw(row.binanceKrw) }}</td>
        <td :class="{ 'is-up': (row.premiumPercent ?? 0) > 0, 'is-down': (row.premiumPercent ?? 0) < 0 }">
          {{ fmtPercent(row.premiumPercent) }}
        </td>
        <td>{{ fmtValue(row.accTradePrice24h) }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped lang="scss">
.kimchi-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.kimchi-table th,
.kimchi-table td {
  padding: 8px 10px;
  text-align: right;
  border-bottom: 1px solid var(--panel-border);
}
.kimchi-table th:first-child,
.kimchi-table td:first-child {
  text-align: left;
}
.kimchi-table__sortable {
  cursor: pointer;
  user-select: none;
}
.kimchi-table__symbol {
  color: var(--text-muted);
  font-size: 11px;
}
.is-up { color: var(--brand-lime, #d9ff66); }
.is-down { color: #ff5d5d; }
</style>
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm --workspace web run test -- kimchi-table`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add web/src/features/kimchi/KimchiTable.vue web/test/kimchi-table.test.ts
git commit -m "feat(web): add KimchiTable with sortable columns"
```

---

### Task 13: 김프 페이지 컨테이너

**Files:**
- Create: `web/src/features/kimchi/KimchiPage.vue`

**Interfaces:**
- Consumes: `useKimchiStore`; `useFxStore`; `useMarketSocket` from `../../composables/useMarketSocket.js`; `useBinanceSocket` from `../../composables/useBinanceSocket.js`; `KimchiTable.vue`.
- Produces: 라우트 `/kimchi`에 마운트되는 페이지. onMounted에서 universe·fx 로드 후 업비트 ticker + 바이낸스 구독 시작, fx 30분 폴링.

설계 메모: 이 컴포넌트는 워커(WebSocket)를 생성하므로 jsdom 단위 테스트 대신 Task 14 이후 수동 실행으로 검증한다.

- [ ] **Step 1: 구현** — `web/src/features/kimchi/KimchiPage.vue`

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, computed } from "vue";
import { storeToRefs } from "pinia";
import { useKimchiStore } from "../../stores/kimchi.js";
import { useFxStore } from "../../stores/fx.js";
import { useMarketSocket } from "../../composables/useMarketSocket.js";
import { useBinanceSocket } from "../../composables/useBinanceSocket.js";
import KimchiTable from "./KimchiTable.vue";

const FX_POLL_MS = 30 * 60 * 1000;

const kimchi = useKimchiStore();
const fx = useFxStore();
const { loading, error, degraded } = storeToRefs(kimchi);
const rows = computed(() => kimchi.rows);

const upbit = useMarketSocket();
const binance = useBinanceSocket();

let fxTimer: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  await Promise.all([kimchi.loadUniverse(), fx.load()]);

  if (kimchi.upbitMarkets.length > 0) {
    upbit.subscribe("ticker", kimchi.upbitMarkets);
    binance.subscribe(kimchi.binanceSymbols);
  }

  fxTimer = setInterval(() => {
    void fx.load();
  }, FX_POLL_MS);
});

onUnmounted(() => {
  if (fxTimer) clearInterval(fxTimer);
});
</script>

<template>
  <section class="kimchi-page">
    <header class="kimchi-page__head">
      <h1>김치 프리미엄</h1>
      <p class="kimchi-page__subtitle">업비트(KRW) vs 바이낸스(USDT) 실시간 가격 괴리율</p>
    </header>

    <p v-if="fx.degraded || degraded" class="kimchi-page__banner">
      일부 데이터를 일시적으로 불러오지 못했습니다. 표시된 값이 지연될 수 있습니다.
    </p>

    <p v-if="loading && rows.length === 0">불러오는 중…</p>
    <p v-else-if="error">{{ error }}</p>
    <KimchiTable v-else :rows="rows" />

    <footer class="kimchi-page__footer">
      USDT ≈ USD 근사로 환산했습니다. ·
      <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer">
        Rates By Exchange Rate API
      </a>
    </footer>
  </section>
</template>

<style scoped lang="scss">
.kimchi-page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.kimchi-page__subtitle {
  color: var(--text-muted);
  font-size: 13px;
}
.kimchi-page__banner {
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  font-size: 12px;
  color: var(--text-muted);
}
.kimchi-page__footer {
  color: var(--text-muted);
  font-size: 11px;
}
.kimchi-page__footer a {
  color: inherit;
  text-decoration: underline;
}
</style>
```

- [ ] **Step 2: 타입체크/빌드 확인**

Run: `npm --workspace web run build`
Expected: 빌드 성공.

- [ ] **Step 3: 커밋**

```bash
git add web/src/features/kimchi/KimchiPage.vue
git commit -m "feat(web): add KimchiPage wiring streams, fx polling, attribution"
```

---

### Task 14: 라우트 + 내비게이션 연결

**Files:**
- Modify: `web/src/router/index.ts`
- Modify: `web/src/components/AppNav.vue`
- Test: `web/test/smoke.test.ts` (라우트 존재 확인 케이스 추가 — 기존 스타일 확인 후 적용)

**Interfaces:**
- Consumes: `KimchiPage.vue`.
- Produces: 라우트 `{ path: "/kimchi", name: "kimchi", component: KimchiPage }`; AppNav에 "김치프리미엄" 링크.

- [ ] **Step 1: 라우트 등록** — `web/src/router/index.ts`

import 추가(다른 페이지 import 아래):

```ts
import KimchiPage from "../features/kimchi/KimchiPage.vue";
```

`routes` 배열에 추가(`sentiment` 라우트 아래):

```ts
    { path: "/kimchi", name: "kimchi", component: KimchiPage },
```

- [ ] **Step 2: 내비게이션 링크 추가** — `web/src/components/AppNav.vue`

`<router-link to="/sentiment" ...>시장심리</router-link>` 아래에 추가:

```html
        <router-link to="/kimchi" class="app-nav__link">김치프리미엄</router-link>
```

- [ ] **Step 3: 라우트 스모크 테스트** — `web/test/smoke.test.ts` 에 라우트 등록 확인(기존 파일 스타일에 맞춰 추가). 예:

```ts
import { router } from "../src/router/index";

it("registers the kimchi route", () => {
  expect(router.hasRoute("kimchi")).toBe(true);
});
```

- [ ] **Step 4: 웹 전체 테스트 + 빌드 확인**

Run: `npm --workspace web run test`
Run: `npm --workspace web run build`
Expected: 모두 통과/성공.

- [ ] **Step 5: 커밋**

```bash
git add web/src/router/index.ts web/src/components/AppNav.vue web/test/smoke.test.ts
git commit -m "feat(web): add /kimchi route and nav link"
```

---

### Task 15: 수동 통합 검증

**Files:** (없음 — 실행 검증)

- [ ] **Step 1: 서버 + 웹 동시 실행**

Run: `npm --workspace server run dev` (별도 터미널) + `npm --workspace web run dev`

- [ ] **Step 2: `/kimchi` 접속 후 확인**
  - 30개 행이 렌더되고 김프 %가 실시간으로 갱신되는지(업비트·바이낸스 가격이 흐르는지)
  - 김프 내림차순 기본 정렬, 헤더 클릭 시 정렬 토글
  - 푸터에 "Rates By Exchange Rate API" 링크 노출
  - 네트워크 탭에서 `/market/fx`, `/market/kimchi/universe`가 200, 바이낸스 WS 연결 확인

- [ ] **Step 3: degraded 동작 스폿 체크**
  - (선택) 서버 환율 호출 차단 시 김프 열이 "—" + 배너 표시되는지

---

## Self-Review

**1. Spec coverage:**
- 노출 형태(독립 페이지 `/kimchi` + AppNav) → Task 13, 14 ✅
- 대상 코인(KRW∩USDT 상위 30, 업비트 거래대금 정렬) → Task 3, 4 ✅
- 실시간(업비트 스트림 재사용 + 바이낸스 WS 워커 + RxJS) → Task 8, 9, 10 ✅
- 환율(키리스 open.er-api + 서버 캐싱 + 업비트 폴백 + degraded) → Task 1, 2 ✅
- 김프 계산식 + USDT≈USD 근사 → Task 11(계산), Task 12/13(근사 명시) ✅
- 표 구성/정렬/툴팁/출처 푸터 → Task 12, 13 ✅
- degraded 처리(fx "—" + 배너, WS 재연결) → Task 13(배너/—), Task 9(재연결) ✅
- 비목표(알림/과거 차트 등) → 계획에 미포함(준수) ✅

**2. Placeholder scan:** "TBD"/"적절히"/"등 처리" 류 없음. 각 코드 스텝에 실제 코드 포함. ✅

**3. Type consistency:**
- `KimchiUniverseItem`(서버) ↔ `KimchiUniverseItemView`(웹): 필드 동일(upbitMarket, binanceSymbol, base, koreanName, accTradePrice24h) ✅
- `BinancePriceUpdate { symbol, price }`: 파이프라인(Task 8)·store(Task 10)·kimchi store(Task 11) 동일 ✅
- `FxResult`(provider) → `FxResponse`(route) → `FxView`(web): `krw`/`source`/`next`/`stale`/`degraded` 일관 ✅
- `applyPrices`/`applyTicker`/`bySymbol`/`byMarket` 명칭 store-소비처 일치 ✅
- WS 구독 채널: 업비트 `subscribe("ticker", markets)`(기존 시그니처), 바이낸스 `subscribe(symbols)` — 각 컴포저블 시그니처와 일치 ✅

이상 없음.
