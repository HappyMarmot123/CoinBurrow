# 글로벌 시총 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** keyless CoinGecko `/global` 한 호출로 암호화폐 글로벌 시총 스냅샷(7개 지표)을 보여주는 독립 페이지 `/global`을 추가한다.

**Architecture:** 기존 `sentiment` 기능 풀스택 패턴을 복제한다. 서버는 `global/{types,schemas,provider}.ts` + `routes/global.ts`(degraded 200 폴백)로 CoinGecko `/api/v3/global`을 정규화하고 `cachedWithStale`로 캐싱한다. 웹은 `rest.ts` 클라이언트 + Pinia `stores/global.ts` + `features/global/GlobalPage.vue`(카드 그리드, 60s 폴링) + 라우터/네비를 추가한다.

**Tech Stack:** Fastify, zod, undici, Vue 3 `<script setup>` + TypeScript, Pinia, Vitest.

## Global Constraints

- keyless 동작 필수: CoinGecko demo key 환경변수 미설정 상태에서도 정상 동작해야 한다.
- 업스트림 장애 시 전체 500 금지: `FreeApiError`는 200 + `degraded:true`로 변환 (서버리스 부분실패 정책, `free-api-survey` 15절).
- WS·상시 background job 미사용: REST only + 짧은 TTL 캐시(`cachedWithStale`).
- 서버 신규 모듈은 `server/src`에 정적 import (`server/dist` 동적 import 금지).
- 응답 봉투 규칙: `provider` / `fetchedAt` / `cacheTtlMs` / `stale` / 선택적 `degraded` + `degradedReason` 포함.
- 캐시 정책: `GLOBAL_TTL_MS = 60_000`, `GLOBAL_STALE_TTL_MS = 30 * 60_000`.
- 모든 신규 사용자 노출 텍스트는 한국어.

---

### Task 1: 서버 — global 타입/스키마/프로바이더

**Files:**
- Create: `server/src/global/types.ts`
- Create: `server/src/global/schemas.ts`
- Create: `server/src/global/provider.ts`
- Test: `server/test/global.routes.test.ts` (이 태스크에서는 provider describe 블록만 추가)

**Interfaces:**
- Consumes: `requestJson` (`server/src/freeapi/http.ts`), `FreeApiError` (`server/src/freeapi/errors.js`).
- Produces:
  - `GlobalMarketResponse` 인터페이스 (아래 필드)
  - `globalResponseSchema` (zod), `GlobalApiResponse = z.output<typeof globalResponseSchema>`
  - `fetchGlobalMarket(): Promise<GlobalMarketResponse>`
  - `GLOBAL_TTL_MS: number`, `GLOBAL_STALE_TTL_MS: number`

- [ ] **Step 1: 타입 작성** — `server/src/global/types.ts`

```ts
export interface GlobalMarketResponse {
  provider: 'coingecko'
  totalMarketCapUsd: number | null
  totalVolumeUsd: number | null
  marketCapChangePct24h: number | null
  btcDominance: number | null
  ethDominance: number | null
  activeCryptocurrencies: number | null
  markets: number | null
  updatedAt?: number
  fetchedAt: number
  cacheTtlMs: number
  stale: boolean
  degraded?: boolean
  degradedReason?: string
}
```

- [ ] **Step 2: 스키마 작성** — `server/src/global/schemas.ts`

```ts
import { z } from 'zod'

export const globalResponseSchema = z.object({
  data: z.object({
    total_market_cap: z.record(z.string(), z.number()),
    total_volume: z.record(z.string(), z.number()).optional(),
    market_cap_percentage: z.record(z.string(), z.number()).optional(),
    market_cap_change_percentage_24h_usd: z.number().optional(),
    active_cryptocurrencies: z.number().optional(),
    markets: z.number().optional(),
    updated_at: z.number().optional(),
  }).passthrough(),
}).passthrough()

export type GlobalApiResponse = z.output<typeof globalResponseSchema>
```

- [ ] **Step 3: 프로바이더 작성** — `server/src/global/provider.ts`

```ts
import { requestJson } from '../freeapi/http.js'
import { FreeApiError } from '../freeapi/errors.js'
import { globalResponseSchema } from './schemas.js'
import type { GlobalMarketResponse } from './types.js'

const GLOBAL_URL = 'https://api.coingecko.com/api/v3/global'
const PROVIDER = 'coingecko' as const

export const GLOBAL_TTL_MS = 60_000 // 60초
export const GLOBAL_STALE_TTL_MS = 30 * 60_000 // 30분

const COINGECKO_DEMO_API_KEY = process.env.COINGECKO_DEMO_API_KEY
  ?? process.env.X_CG_DEMO_API_KEY
  ?? process.env.CG_DEMO_API_KEY

function pickNumber(record: Record<string, number> | undefined, key: string): number | null {
  const value = record?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function finiteOrNull(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export async function fetchGlobalMarket(): Promise<GlobalMarketResponse> {
  const url = COINGECKO_DEMO_API_KEY
    ? `${GLOBAL_URL}?x_cg_demo_api_key=${encodeURIComponent(COINGECKO_DEMO_API_KEY)}`
    : GLOBAL_URL

  const payload = await requestJson(url, globalResponseSchema)
  const data = payload.data

  const totalMarketCapUsd = pickNumber(data.total_market_cap, 'usd')
  if (totalMarketCapUsd === null) {
    throw new FreeApiError('invalid global total_market_cap.usd', 'SCHEMA_MISMATCH', { retryable: false })
  }

  return {
    provider: PROVIDER,
    totalMarketCapUsd,
    totalVolumeUsd: pickNumber(data.total_volume, 'usd'),
    marketCapChangePct24h: finiteOrNull(data.market_cap_change_percentage_24h_usd),
    btcDominance: pickNumber(data.market_cap_percentage, 'btc'),
    ethDominance: pickNumber(data.market_cap_percentage, 'eth'),
    activeCryptocurrencies: finiteOrNull(data.active_cryptocurrencies),
    markets: finiteOrNull(data.markets),
    updatedAt: typeof data.updated_at === 'number' ? data.updated_at * 1000 : undefined,
    fetchedAt: Date.now(),
    cacheTtlMs: GLOBAL_TTL_MS,
    stale: false,
  }
}
```

- [ ] **Step 4: provider 테스트 작성** — `server/test/global.routes.test.ts`

```ts
import {
  MockAgent,
  getGlobalDispatcher,
  setGlobalDispatcher,
  type Dispatcher,
} from 'undici'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FreeApiError } from '../src/freeapi/errors.js'
import { clearFreeApiCacheForTest } from '../src/freeapi/cache.js'
import { fetchGlobalMarket } from '../src/global/provider.js'
import { buildApp } from '../src/app.js'

const SAMPLE = {
  data: {
    total_market_cap: { usd: 2_410_000_000_000 },
    total_volume: { usd: 98_300_000_000 },
    market_cap_percentage: { btc: 54.2, eth: 17.1 },
    market_cap_change_percentage_24h_usd: -1.23,
    active_cryptocurrencies: 13567,
    markets: 1089,
    updated_at: 1_782_172_951,
  },
}

describe('fetchGlobalMarket provider', () => {
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

  it('normalizes all snapshot fields', async () => {
    mockAgent
      .get('https://api.coingecko.com')
      .intercept({ method: 'GET', path: '/api/v3/global' })
      .reply(200, SAMPLE)

    const result = await fetchGlobalMarket()
    expect(result.totalMarketCapUsd).toBe(2_410_000_000_000)
    expect(result.totalVolumeUsd).toBe(98_300_000_000)
    expect(result.marketCapChangePct24h).toBe(-1.23)
    expect(result.btcDominance).toBe(54.2)
    expect(result.ethDominance).toBe(17.1)
    expect(result.activeCryptocurrencies).toBe(13567)
    expect(result.markets).toBe(1089)
    expect(result.updatedAt).toBe(1_782_172_951 * 1000)
    expect(result.provider).toBe('coingecko')
  })

  it('returns null for missing optional fields', async () => {
    mockAgent
      .get('https://api.coingecko.com')
      .intercept({ method: 'GET', path: '/api/v3/global' })
      .reply(200, { data: { total_market_cap: { usd: 1_000 }, market_cap_percentage: { btc: 50 } } })

    const result = await fetchGlobalMarket()
    expect(result.totalMarketCapUsd).toBe(1_000)
    expect(result.ethDominance).toBeNull()
    expect(result.markets).toBeNull()
    expect(result.totalVolumeUsd).toBeNull()
  })

  it('throws SCHEMA_MISMATCH when total_market_cap.usd missing', async () => {
    mockAgent
      .get('https://api.coingecko.com')
      .intercept({ method: 'GET', path: '/api/v3/global' })
      .reply(200, { data: { total_market_cap: { eur: 1 } } })

    await expect(fetchGlobalMarket()).rejects.toBeInstanceOf(FreeApiError)
  })
})
```

- [ ] **Step 5: 테스트 실행 (실패/통과 확인)**

Run: `cd server && npx vitest run test/global.routes.test.ts`
Expected: `fetchGlobalMarket provider` 3개 PASS. (route describe는 아직 없음.)

- [ ] **Step 6: 타입 체크**

Run: `cd server && npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 7: 커밋**

```bash
git add server/src/global/ server/test/global.routes.test.ts
git commit -m "feat(global): add CoinGecko /global provider, schema, types"
```

---

### Task 2: 서버 — `/market/global` 라우트 등록

**Files:**
- Create: `server/src/routes/global.ts`
- Modify: `server/src/app.ts`
- Test: `server/test/global.routes.test.ts` (route describe 블록 추가)

**Interfaces:**
- Consumes: `cachedWithStale` (`server/src/freeapi/cache.js`), `FreeApiError` (`server/src/freeapi/errors.js`), `fetchGlobalMarket`/`GLOBAL_TTL_MS`/`GLOBAL_STALE_TTL_MS` (Task 1), `GlobalMarketResponse` (Task 1).
- Produces: `registerGlobalRoutes(app: FastifyInstance): void`, route `GET /market/global`.

- [ ] **Step 1: 라우트 작성** — `server/src/routes/global.ts`

```ts
import type { FastifyInstance } from 'fastify'

import { cachedWithStale } from '../freeapi/cache.js'
import { FreeApiError } from '../freeapi/errors.js'
import {
  GLOBAL_STALE_TTL_MS,
  GLOBAL_TTL_MS,
  fetchGlobalMarket,
} from '../global/provider.js'
import type { GlobalMarketResponse } from '../global/types.js'

function toDegradedResponse(reason: string): GlobalMarketResponse {
  return {
    provider: 'coingecko',
    totalMarketCapUsd: null,
    totalVolumeUsd: null,
    marketCapChangePct24h: null,
    btcDominance: null,
    ethDominance: null,
    activeCryptocurrencies: null,
    markets: null,
    fetchedAt: Date.now(),
    cacheTtlMs: GLOBAL_TTL_MS,
    stale: false,
    degraded: true,
    degradedReason: reason,
  }
}

export function registerGlobalRoutes(app: FastifyInstance): void {
  app.get('/market/global', async (_req, _reply) => {
    try {
      const cached = await cachedWithStale(
        'global:coingecko',
        GLOBAL_TTL_MS,
        GLOBAL_STALE_TTL_MS,
        () => fetchGlobalMarket(),
      )
      return { ...cached.value, stale: cached.stale }
    } catch (error) {
      if (error instanceof FreeApiError) {
        return toDegradedResponse(error.code)
      }
      throw error
    }
  })
}
```

- [ ] **Step 2: app.ts에 등록** — `server/src/app.ts`

import 추가 (다른 register import 옆):

```ts
import { registerGlobalRoutes } from './routes/global.js'
```

`registerKimchiRoutes(app)` 다음 줄에 추가:

```ts
  registerGlobalRoutes(app)
```

- [ ] **Step 3: route 테스트 추가** — `server/test/global.routes.test.ts` 끝에 describe 추가

```ts
describe('GET /market/global', () => {
  let app: ReturnType<typeof buildApp>
  let mockAgent: MockAgent
  let originalDispatcher: Dispatcher

  beforeEach(() => {
    clearFreeApiCacheForTest()
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

  it('returns normalized snapshot', async () => {
    mockAgent
      .get('https://api.coingecko.com')
      .intercept({ method: 'GET', path: '/api/v3/global' })
      .reply(200, SAMPLE)

    const response = await app.inject({ method: 'GET', url: '/market/global' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      provider: 'coingecko',
      totalMarketCapUsd: 2_410_000_000_000,
      btcDominance: 54.2,
      stale: false,
    })
  })

  it('returns degraded when upstream fails', async () => {
    mockAgent
      .get('https://api.coingecko.com')
      .intercept({ method: 'GET', path: '/api/v3/global' })
      .reply(500, { error: 'boom' })

    const response = await app.inject({ method: 'GET', url: '/market/global' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      provider: 'coingecko',
      totalMarketCapUsd: null,
      degraded: true,
    })
  })
})
```

- [ ] **Step 4: 테스트 실행**

Run: `cd server && npx vitest run test/global.routes.test.ts`
Expected: provider 3개 + route 2개 모두 PASS. (degraded 테스트는 retry 후 500 폴백 — `UPSTREAM_ERROR` reason.)

- [ ] **Step 5: 타입 체크 + 전체 테스트**

Run: `cd server && npx tsc --noEmit && npm test`
Expected: 에러 없음, 전체 통과.

- [ ] **Step 6: 커밋**

```bash
git add server/src/routes/global.ts server/src/app.ts server/test/global.routes.test.ts
git commit -m "feat(global): add GET /market/global route with degraded fallback"
```

---

### Task 3: 웹 — REST 클라이언트 + Pinia store

**Files:**
- Modify: `web/src/api/rest.ts` (끝에 추가)
- Create: `web/src/stores/global.ts`
- Test: `web/test/global-store.test.ts`

**Interfaces:**
- Consumes: `getJson` (rest.ts 내부 헬퍼), `defineStore` (pinia).
- Produces:
  - `GlobalMarketView` 인터페이스 (서버 `GlobalMarketResponse`와 동형)
  - `getGlobalMarket(): Promise<GlobalMarketView>`
  - `useGlobalStore` — state `{ current: GlobalMarketView | null, loading: boolean, error: string }`, action `load(): Promise<void>`

- [ ] **Step 1: rest.ts에 뷰 타입 + fetch 추가** — `web/src/api/rest.ts` 끝에

```ts
export interface GlobalMarketView {
  provider: string;
  totalMarketCapUsd: number | null;
  totalVolumeUsd: number | null;
  marketCapChangePct24h: number | null;
  btcDominance: number | null;
  ethDominance: number | null;
  activeCryptocurrencies: number | null;
  markets: number | null;
  updatedAt?: number;
  fetchedAt: number;
  cacheTtlMs: number;
  stale: boolean;
  degraded?: boolean;
  degradedReason?: string;
}

export const getGlobalMarket = async (): Promise<GlobalMarketView> => {
  return getJson<GlobalMarketView>("/market/global");
};
```

- [ ] **Step 2: store 작성** — `web/src/stores/global.ts`

```ts
import { defineStore } from "pinia";
import { getGlobalMarket, type GlobalMarketView } from "../api/rest.js";

export const useGlobalStore = defineStore("global", {
  state: () => ({
    current: null as GlobalMarketView | null,
    loading: false,
    error: "",
  }),
  actions: {
    async load() {
      this.loading = true;
      try {
        this.current = await getGlobalMarket();
        this.error = "";
      } catch (error) {
        this.error =
          error instanceof Error ? error.message : "글로벌 시장 데이터를 불러오지 못했습니다.";
      } finally {
        this.loading = false;
      }
    },
  },
});
```

- [ ] **Step 3: store 테스트 작성** — `web/test/global-store.test.ts`

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useGlobalStore } from "../src/stores/global";

beforeEach(() => setActivePinia(createPinia()));
afterEach(() => vi.restoreAllMocks());

describe("global store", () => {
  it("loads global snapshot", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        provider: "coingecko",
        totalMarketCapUsd: 2_410_000_000_000,
        totalVolumeUsd: 98_300_000_000,
        marketCapChangePct24h: -1.23,
        btcDominance: 54.2,
        ethDominance: 17.1,
        activeCryptocurrencies: 13567,
        markets: 1089,
        fetchedAt: 1,
        cacheTtlMs: 60000,
        stale: false,
      }),
    })) as unknown as typeof fetch);

    const store = useGlobalStore();
    await store.load();

    expect(store.current?.totalMarketCapUsd).toBe(2_410_000_000_000);
    expect(store.current?.btcDominance).toBe(54.2);
    expect(store.error).toBe("");
  });

  it("sets error message on failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }) as unknown as typeof fetch);

    const store = useGlobalStore();
    await store.load();

    expect(store.current).toBeNull();
    expect(store.error).toBe("network down");
  });
});
```

- [ ] **Step 4: 테스트 실행**

Run: `cd web && npx vitest run test/global-store.test.ts`
Expected: 2개 PASS.

- [ ] **Step 5: 타입 체크**

Run: `cd web && npx vue-tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 6: 커밋**

```bash
git add web/src/api/rest.ts web/src/stores/global.ts web/test/global-store.test.ts
git commit -m "feat(web): add getGlobalMarket client and global store"
```

---

### Task 4: 웹 — GlobalPage 컴포넌트 + 라우터/네비

**Files:**
- Create: `web/src/features/global/GlobalPage.vue`
- Modify: `web/src/router/index.ts`
- Modify: `web/src/components/AppNav.vue`
- Test: `web/test/global-page.test.ts`

**Interfaces:**
- Consumes: `useGlobalStore` (Task 3), `formatCompact`/`formatNumber` (`web/src/utils/format.js`), `AppNav` 컴포넌트.
- Produces: `GlobalPage` 컴포넌트 (default export), route `{ path: '/global', name: 'global' }`.

- [ ] **Step 1: 페이지 컴포넌트 작성** — `web/src/features/global/GlobalPage.vue`

```vue
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import AppNav from "../../components/AppNav.vue";
import { useGlobalStore } from "../../stores/global.js";
import { formatCompact, formatNumber } from "../../utils/format.js";

const REFRESH_INTERVAL_MS = 60_000;

const store = useGlobalStore();
let pollTimer: number | undefined;

onMounted(() => {
  void store.load();
  pollTimer = window.setInterval(() => {
    if (store.loading) return;
    void store.load();
  }, REFRESH_INTERVAL_MS);
});

onBeforeUnmount(() => {
  if (pollTimer) window.clearInterval(pollTimer);
});

const current = computed(() => store.current);
const hasData = computed(() => typeof current.value?.totalMarketCapUsd === "number");

function usd(value: number | null | undefined): string {
  if (typeof value !== "number") return "-";
  return `$${formatCompact(value)}`;
}

function pct(value: number | null | undefined, digits = 1): string {
  if (typeof value !== "number") return "-";
  return `${value.toFixed(digits)}%`;
}

function signedPct(value: number | null | undefined): string {
  if (typeof value !== "number") return "-";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function intOrDash(value: number | null | undefined): string {
  if (typeof value !== "number") return "-";
  return formatNumber(value);
}

const changeClass = computed(() => {
  const v = current.value?.marketCapChangePct24h;
  if (typeof v !== "number" || v === 0) return "flat";
  return v > 0 ? "up" : "down";
});

const cards = computed(() => {
  const c = current.value;
  if (!c) return [];
  return [
    { key: "volume", label: "24h 거래량", value: usd(c.totalVolumeUsd) },
    { key: "btc", label: "BTC 도미넌스", value: pct(c.btcDominance) },
    { key: "eth", label: "ETH 도미넌스", value: pct(c.ethDominance) },
    { key: "coins", label: "활성 암호화폐", value: intOrDash(c.activeCryptocurrencies) },
    { key: "markets", label: "거래소 수", value: intOrDash(c.markets) },
  ];
});
</script>

<template>
  <main class="global-page">
    <AppNav class="global-nav" />

    <section class="global-layout">
      <p v-if="store.loading && !current" class="global-state">불러오는 중…</p>
      <p v-else-if="store.error" class="global-state global-state--error">{{ store.error }}</p>
      <p v-else-if="current?.degraded" class="global-state global-state--error">
        글로벌 시장 데이터를 일시적으로 가져올 수 없습니다. (사유: {{ current.degradedReason }})
      </p>

      <template v-if="hasData">
        <article class="panel panel-hero">
          <div class="panel-head">
            <h2>총 시가총액</h2>
            <p class="panel-sub">Total Crypto Market Cap (USD)</p>
          </div>
          <div class="hero-readout">
            <strong>{{ usd(current?.totalMarketCapUsd) }}</strong>
            <span class="hero-change" :class="changeClass">{{ signedPct(current?.marketCapChangePct24h) }} (24h)</span>
          </div>
        </article>

        <section class="grid">
          <article v-for="card in cards" :key="card.key" class="panel panel-stat">
            <span class="stat-label">{{ card.label }}</span>
            <span class="stat-value">{{ card.value }}</span>
          </article>
        </section>
      </template>
    </section>
  </main>
</template>

<style scoped lang="scss">
:global(body) {
  margin: 0;
}

.global-page {
  min-height: 100svh;
  padding: clamp(8px, 1.4vh, 14px) 0;
  color: var(--text);
  font-family: $font-sans;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(1100px 500px at 50% -120px, var(--bg-glow), transparent 65%),
    linear-gradient(to bottom right, var(--bg-page), var(--bg-page-mid) 38%, var(--bg-page-soft) 72%);
}

.global-nav {
  flex: 0 0 auto;
  width: min(1100px, calc(100% - 40px));
  margin: 0 auto clamp(8px, 1.2vh, 12px);
}

.global-layout {
  flex: 1;
  width: min(1100px, calc(100% - 40px));
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  padding: 14px;
  gap: clamp(10px, 1.6vh, 16px);
}

.global-state {
  margin: clamp(16px, 4vh, 40px) 0;
  text-align: center;
  color: var(--text-muted);
}

.global-state--error {
  color: var(--alert-text);
}

.panel {
  @include exchange-panel;
  padding: clamp(12px, 1.8vh, 18px);
}

.panel-head {
  @include panel-head;
}

.panel-head h2 {
  @include panel-title(18px);
  font-size: clamp(15px, 1.8vw, 18px);
}

.panel-sub {
  margin: 0;
  color: var(--text-muted);
  font-size: clamp(12px, 1.2vw, 13px);
  text-align: right;
}

.hero-readout {
  display: flex;
  align-items: baseline;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: clamp(6px, 1.4vh, 12px);
}

.hero-readout strong {
  font-size: clamp(34px, 6vw, 56px);
  font-weight: 900;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.hero-change {
  font-size: clamp(14px, 1.8vw, 18px);
  font-weight: 850;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: clamp(10px, 1.4vw, 14px);
}

.panel-stat {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-label {
  color: var(--text-muted);
  font-size: clamp(12px, 1.2vw, 13px);
  font-weight: 700;
}

.stat-value {
  font-size: clamp(20px, 2.4vw, 28px);
  font-weight: 850;
  font-variant-numeric: tabular-nums;
}

.up {
  color: var(--c-up);
}

.down {
  color: var(--c-down);
}

.flat {
  color: var(--c-flat);
}
</style>
```

- [ ] **Step 2: 라우터 등록** — `web/src/router/index.ts`

import 추가:

```ts
import GlobalPage from "../features/global/GlobalPage.vue";
```

routes 배열에 추가 (kimchi 다음):

```ts
    { path: "/global", name: "global", component: GlobalPage },
```

- [ ] **Step 3: 네비 링크 추가** — `web/src/components/AppNav.vue`

`김치프리미엄` 링크 다음 줄에 추가:

```html
        <router-link to="/global" class="app-nav__link">글로벌 시총</router-link>
```

- [ ] **Step 4: 페이지 테스트 작성** — `web/test/global-page.test.ts`

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import GlobalPage from "../src/features/global/GlobalPage.vue";

const router = createRouter({ history: createWebHistory(), routes: [{ path: "/", component: { template: "<div/>" } }] });

beforeEach(() => setActivePinia(createPinia()));
afterEach(() => vi.restoreAllMocks());

describe("GlobalPage", () => {
  it("renders total market cap when data loads", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        provider: "coingecko",
        totalMarketCapUsd: 2_410_000_000_000,
        totalVolumeUsd: 98_300_000_000,
        marketCapChangePct24h: -1.23,
        btcDominance: 54.2,
        ethDominance: 17.1,
        activeCryptocurrencies: 13567,
        markets: 1089,
        fetchedAt: 1,
        cacheTtlMs: 60000,
        stale: false,
      }),
    })) as unknown as typeof fetch);

    const wrapper = mount(GlobalPage, { global: { plugins: [router] } });
    await router.isReady();
    await new Promise((r) => setTimeout(r, 0));
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("총 시가총액");
    expect(wrapper.text()).toContain("$2.4T");
    expect(wrapper.text()).toContain("BTC 도미넌스");
  });

  it("shows degraded message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        provider: "coingecko",
        totalMarketCapUsd: null,
        totalVolumeUsd: null,
        marketCapChangePct24h: null,
        btcDominance: null,
        ethDominance: null,
        activeCryptocurrencies: null,
        markets: null,
        fetchedAt: 1,
        cacheTtlMs: 60000,
        stale: false,
        degraded: true,
        degradedReason: "UPSTREAM_ERROR",
      }),
    })) as unknown as typeof fetch);

    const wrapper = mount(GlobalPage, { global: { plugins: [router] } });
    await router.isReady();
    await new Promise((r) => setTimeout(r, 0));
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("일시적으로 가져올 수 없습니다");
  });
});
```

- [ ] **Step 5: 테스트 실행**

Run: `cd web && npx vitest run test/global-page.test.ts`
Expected: 2개 PASS. (참고: `@vue/test-utils`는 `kimchi-table.test.ts` 등에서 이미 사용 중 — 의존성 존재. 없으면 `web/test/kimchi-table.test.ts`의 mount 패턴을 따른다.)

- [ ] **Step 6: 타입 체크 + 전체 테스트 + 빌드**

Run: `cd web && npx vue-tsc --noEmit && npm test && npm run build`
Expected: 에러 없음, 전체 통과, 빌드 성공.

- [ ] **Step 7: 커밋**

```bash
git add web/src/features/global/ web/src/router/index.ts web/src/components/AppNav.vue web/test/global-page.test.ts
git commit -m "feat(web): add GlobalPage with snapshot cards, route and nav link"
```

---

### Task 5: 문서 업데이트 — README REST 엔드포인트

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: (없음)
- Produces: (없음 — 문서만)

- [ ] **Step 1: README REST 엔드포인트 목록에 추가** — `README.md`의 `## REST 엔드포인트` 섹션 끝에

```markdown
- `GET /market/global` (CoinGecko 글로벌 시총 스냅샷, keyless)
```

- [ ] **Step 2: 커밋**

```bash
git add README.md
git commit -m "docs: add /market/global endpoint to README"
```

---

## Self-Review

**1. Spec coverage:**
- 데이터 계약(spec §2) → Task 1 (provider/schema/types, 7개 필드 매핑) ✓
- 서버 설계(spec §3) → Task 1 + Task 2 (provider, route degraded, app 등록) ✓
- 웹 설계(spec §4) → Task 3 (client/store) + Task 4 (page/router/nav) ✓
- 데이터 흐름(spec §5) → Task 3+4 (page → store → getGlobalMarket → /market/global) ✓
- 에러/폴백(spec §6) → Task 2 (degraded 200) + Task 4 (degraded UI) ✓
- 테스트 계획(spec §7) → Task 1(provider 3) + Task 2(route 2) + Task 3(store 2) + Task 4(page 2) ✓
- DoD(spec §8): keyless(Task1 demo key optional), degraded(Task2/4), 폴링+언마운트(Task4), tsc/test/build(Task2/4), nav 링크(Task4) ✓
- 2차 후보(spec §9): 범위 밖 — 태스크 없음(의도적) ✓

**2. Placeholder scan:** "TBD"/"TODO"/"적절한 에러 처리" 없음 — 모든 코드 블록 완전 기재. ✓

**3. Type consistency:** `GlobalMarketResponse`(서버) ↔ `GlobalMarketView`(웹) 필드명 동일. `fetchGlobalMarket`/`getGlobalMarket`/`useGlobalStore`/`registerGlobalRoutes`/`GLOBAL_TTL_MS`/`GLOBAL_STALE_TTL_MS` 전 태스크 일관. 캐시 키 `'global:coingecko'` 일관. ✓
