# Codex Improvement Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `CODEX_IMPROVEMENT_SPEC.md`의 개선 지시를 기능/API/렌더 결과 변경 없이 단계별 리팩터링으로 적용한다.

**Architecture:** 먼저 프론트 공통 상수와 포맷터를 분리해 이후 SCSS 전환과 Vue 분해의 기반을 만든다. 서버는 Upbit REST 응답 shape를 유지하면서 경량 TTL 캐시와 압축을 더하고, 마지막으로 `ExchangePage.vue`를 composable과 하위 표현 컴포넌트로 분리한다.

**Tech Stack:** Vue 3, Vite, Pinia, SCSS/Sass, Fastify, undici, Vitest, TypeScript

---

## Execution Constraints

- 작업 전 현재 브랜치가 더러운지 확인한다.
- 기존 사용자 변경을 되돌리지 않는다.
- 응답 JSON shape, 화면 텍스트, 라우트 경로, 렌더 조건을 바꾸지 않는다.
- 각 태스크 후 해당 워크스페이스 테스트를 실행한다.
- 현재 WSL 세션에서는 사용자의 지시에 따라 `npm run build` / Vite build를 실행하지 않는다. 필요한 타입 검증은 `vue-tsc --noEmit`까지만 사용하고, build 검증은 Windows/CI에서 수행한다.
- 커밋은 사용자가 요청하거나 실행 세션에서 명시적으로 승인한 경우에만 만든다.

## Baseline Commands

Run from repo root:

```bash
npm run test --workspace coinburrow-server
npm run test --workspace coinburrow-web
```

Expected:

- Server Vitest passes.
- Web Vitest passes.
- WSL-local execution stops after tests. Workspace build is deferred to Windows/CI.

If Rollup optional native package is missing, run:

```bash
npm install
```

Then rerun the baseline commands.

---

## File Structure

Create:

- `web/src/constants/upbit.ts`: Upbit REST/WS URLs for web fallback and worker.
- `web/src/constants/market.ts`: default market code.
- `web/src/constants/candle.ts`: candle timeframe labels and web fallback paths.
- `web/src/constants/exchange.ts`: exchange UI options and caution labels.
- `web/src/constants/landing.ts`: Spline scene env fallback.
- `web/src/utils/format.ts`: shared `Intl.NumberFormat` helpers.
- `web/test/format.test.ts`: formatter unit tests.
- `web/src/styles/_variables.scss`: shared visual tokens.
- `web/src/styles/_mixins.scss`: repeated layout/scrollbar helpers.
- `web/src/styles/index.scss`: Sass forwards.
- `server/src/upbit/cache.ts`: small in-memory TTL cache with in-flight dedupe.
- `server/src/upbit/normalize.ts`: shared server-side quote/market normalization.
- `server/src/upbit/constants.ts`: server Upbit base URL and target coin constants.
- `web/src/composables/useExchangeData.ts`: exchange loading/subscription flow.
- `web/src/composables/useMarketMeta.ts`: quotes, summaries, status and derived labels.
- `web/src/features/exchange/ExchangeHero.vue`: hero metrics section.
- `web/src/features/exchange/MarketMovementPanel.vue`: gainers/losers/volume panels.
- `web/src/features/exchange/MarketSummaryPanel.vue`: selected market detail panel.

Modify:

- `web/src/api/rest.ts`
- `web/src/workers/marketSocket.worker.ts`
- `web/src/features/landing/LandingPage.vue`
- `web/src/features/landing/legacyHeroStars.css`
- `web/src/features/exchange/ExchangePage.vue`
- `web/src/features/exchange/CoinList.vue`
- `web/src/features/exchange/TradeList.vue`
- `web/src/features/exchange/OrderbookPanel.vue`
- `web/src/features/exchange/CandleChart.vue`
- `web/vite.config.ts`
- `web/package.json`
- `server/src/app.ts`
- `server/src/config.ts`
- `server/src/routes/market.ts`
- `server/src/upbit/upbitRest.ts`
- `server/package.json`
- `server/test/upbit-rest.test.ts`
- `server/test/routes.test.ts`

---

### Task 1: Baseline Verification And Dirty Tree Audit

**Files:**
- Read: `CODEX_IMPROVEMENT_SPEC.md`
- Read: `package.json`
- Read: `server/package.json`
- Read: `web/package.json`
- Read: `git status --short --untracked-files=all`

- [ ] **Step 1: Confirm current branch and worktree state**

Run:

```bash
git status --short --untracked-files=all
git branch --show-current
```

Expected:

- Current branch is identified.
- Existing dirty files are listed and not reverted.

- [ ] **Step 2: Run server baseline**

Run:

```bash
npm run test --workspace coinburrow-server
```

Expected:

- Server tests pass.
- If failure is caused by missing optional native package, run `npm install` and retry.

- [ ] **Step 3: Run web baseline**

Run:

```bash
npm run test --workspace coinburrow-web
```

Expected:

- Web tests pass.
- If Rollup reports `Cannot find module @rollup/rollup-linux-x64-gnu`, run `npm install` and retry.

- [ ] **Step 4: Skip build baseline in WSL**

Do not run this command in the current WSL session:

```bash
npm run build --workspaces --if-present
```

Expected:

- Build verification is deferred to Windows/CI because local WSL build is known to cause environment issues.

---

### Task 2: Extract Web Constants And Formatters

**Files:**
- Create: `web/src/constants/upbit.ts`
- Create: `web/src/constants/market.ts`
- Create: `web/src/constants/candle.ts`
- Create: `web/src/constants/exchange.ts`
- Create: `web/src/constants/landing.ts`
- Create: `web/src/utils/format.ts`
- Create: `web/test/format.test.ts`
- Modify: `web/src/api/rest.ts`
- Modify: `web/src/workers/marketSocket.worker.ts`
- Modify: `web/src/features/landing/LandingPage.vue`
- Modify: `web/src/features/exchange/ExchangePage.vue`
- Modify: `web/src/features/exchange/CoinList.vue`
- Modify: `web/src/features/exchange/TradeList.vue`
- Modify: `web/src/features/exchange/OrderbookPanel.vue`
- Modify: `web/src/features/exchange/CandleChart.vue`

- [ ] **Step 1: Add formatter tests**

Create `web/test/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatCompact, formatNumber, formatPrice, formatRate, formatRatio, formatTime } from "../src/utils/format";

describe("format utilities", () => {
  it("formats KRW-like prices with rounded group separators", () => {
    expect(formatPrice(1234.56)).toBe("1,235");
    expect(formatPrice()).toBe("-");
  });

  it("formats compact market values using existing suffixes", () => {
    expect(formatCompact(1_500)).toBe("1.5K");
    expect(formatCompact(2_000_000)).toBe("2.0M");
    expect(formatCompact(3_000_000_000)).toBe("3.0B");
    expect(formatCompact(4_000_000_000_000)).toBe("4.0T");
  });

  it("formats rates and ratios with current signs and precision", () => {
    expect(formatRate(0.0123)).toBe("1.23%");
    expect(formatRatio(0.4567)).toBe("+0.457%");
    expect(formatRatio(-0.4567)).toBe("-0.457%");
    expect(formatRatio()).toBe("-");
  });

  it("formats plain numbers and timestamps", () => {
    expect(formatNumber(1234.56789)).toBe("1,234.5679");
    expect(formatTime(new Date("2026-06-18T09:10:11+09:00").getTime())).toMatch(/09.*10.*11|오전.*9.*10.*11/);
  });
});
```

- [ ] **Step 2: Run formatter test and confirm red state**

Run:

```bash
npm run test --workspace coinburrow-web -- test/format.test.ts
```

Expected:

- Test fails because `web/src/utils/format.ts` does not exist.

- [ ] **Step 3: Add constants**

Create `web/src/constants/upbit.ts`:

```ts
export const UPBIT_REST_BASE = "https://api.upbit.com/v1";
export const UPBIT_WS_URL = "wss://api.upbit.com/websocket/v1";
```

Create `web/src/constants/market.ts`:

```ts
export const DEFAULT_MARKET = "KRW-BTC";
```

Create `web/src/constants/candle.ts`:

```ts
import type { CandleTimeframe } from "../api/rest.js";

export const TIMEFRAME_LABELS: Readonly<Record<CandleTimeframe, string>> = {
  "1s": "1s",
  "1m": "1m",
  "3m": "3m",
  "5m": "5m",
  "10m": "10m",
  "15m": "15m",
  "30m": "30m",
  "60m": "60m",
  "240m": "240m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
  "1w": "1w",
  "1mo": "1M",
  "1M": "1M",
  "1y": "1Y",
};

export const CANDLE_FALLBACK_PATH: Readonly<Record<CandleTimeframe, string>> = {
  "1s": "/candles/seconds/1",
  "1m": "/candles/minutes/1",
  "3m": "/candles/minutes/3",
  "5m": "/candles/minutes/5",
  "10m": "/candles/minutes/10",
  "15m": "/candles/minutes/15",
  "30m": "/candles/minutes/30",
  "60m": "/candles/minutes/60",
  "240m": "/candles/minutes/240",
  "1h": "/candles/minutes/60",
  "4h": "/candles/minutes/240",
  "1d": "/candles/days",
  "1w": "/candles/weeks",
  "1mo": "/candles/months",
  "1M": "/candles/months",
  "1y": "/candles/years/1",
};
```

Create `web/src/constants/exchange.ts`:

```ts
import type { CandleTimeframe } from "../api/rest.js";
import { TIMEFRAME_LABELS } from "./candle.js";

export interface TimeframeOption {
  value: CandleTimeframe;
  label: string;
}

export const TIMEFRAME_OPTIONS: TimeframeOption[] = [
  { value: "1s", label: TIMEFRAME_LABELS["1s"] },
  { value: "1m", label: `${TIMEFRAME_LABELS["1m"]} (기본)` },
  { value: "3m", label: TIMEFRAME_LABELS["3m"] },
  { value: "5m", label: TIMEFRAME_LABELS["5m"] },
  { value: "15m", label: TIMEFRAME_LABELS["15m"] },
  { value: "30m", label: TIMEFRAME_LABELS["30m"] },
  { value: "60m", label: TIMEFRAME_LABELS["60m"] },
  { value: "240m", label: TIMEFRAME_LABELS["240m"] },
  { value: "1h", label: TIMEFRAME_LABELS["1h"] },
  { value: "4h", label: TIMEFRAME_LABELS["4h"] },
  { value: "1d", label: TIMEFRAME_LABELS["1d"] },
  { value: "1w", label: TIMEFRAME_LABELS["1w"] },
  { value: "1M", label: TIMEFRAME_LABELS["1M"] },
  { value: "1mo", label: TIMEFRAME_LABELS["1mo"] },
  { value: "1y", label: TIMEFRAME_LABELS["1y"] },
];

export const CANDLE_COUNT_OPTIONS = [30, 50, 100, 200];

export const CAUTION_LABELS: Record<string, string> = {
  PRICE_FLUCTUATIONS: "가격 급변동",
  TRADING_VOLUME_SOARING: "거래량 급증",
  DEPOSIT_AMOUNT_SOARING: "예치량 급증",
  GLOBAL_PRICE_DIFFERENCES: "가격 괴리 확대",
  CONCENTRATION_OF_SMALL_ACCOUNTS: "소수 계정 집중",
};
```

Create `web/src/constants/landing.ts`:

```ts
export const DEFAULT_SPLINE_SCENE = "https://prod.spline.design/54XoC-XFGmLSkJ1e/scene.splinecode";
```

- [ ] **Step 4: Add formatter implementation**

Create `web/src/utils/format.ts`:

```ts
const priceFormatter = new Intl.NumberFormat("ko-KR");
const numberFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 4,
  minimumFractionDigits: 0,
});
const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function formatPrice(value?: number): string {
  if (typeof value !== "number") return "-";
  return priceFormatter.format(Math.round(value));
}

export function formatCompact(value?: number): string {
  if (typeof value !== "number") return "-";
  if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(1)}T`;
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return formatPrice(value);
}

export function formatRate(rate?: number): string {
  if (typeof rate !== "number") return "-";
  return `${(rate * 100).toFixed(2)}%`;
}

export function formatRatio(ratio?: number): string {
  if (typeof ratio !== "number") return "-";
  return `${ratio >= 0 ? "+" : ""}${ratio.toFixed(3)}%`;
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatTime(timestamp: number): string {
  return timeFormatter.format(timestamp);
}
```

- [ ] **Step 5: Replace local constants and formatters**

Modify:

- `web/src/api/rest.ts`: import `UPBIT_REST_BASE`, `TIMEFRAME_LABELS`, `CANDLE_FALLBACK_PATH`.
- `web/src/workers/marketSocket.worker.ts`: import `UPBIT_WS_URL`.
- `web/src/features/landing/LandingPage.vue`: import `DEFAULT_SPLINE_SCENE`.
- `web/src/features/exchange/ExchangePage.vue`: import `DEFAULT_MARKET`, `TIMEFRAME_OPTIONS`, `CANDLE_COUNT_OPTIONS`, `CAUTION_LABELS`, and formatter helpers.
- `TradeList.vue`, `OrderbookPanel.vue`, `CandleChart.vue`, `CoinList.vue`: replace duplicate `Intl.NumberFormat`/`Intl.DateTimeFormat` helpers with imports from `web/src/utils/format.ts` where output is identical.

Use these imports in `ExchangePage.vue`:

```ts
import { DEFAULT_MARKET } from "../../constants/market.js";
import { CAUTION_LABELS, CANDLE_COUNT_OPTIONS, TIMEFRAME_OPTIONS } from "../../constants/exchange.js";
import { formatCompact, formatPrice, formatRate, formatRatio } from "../../utils/format.js";
```

- [ ] **Step 6: Run web tests**

Run:

```bash
npm run test --workspace coinburrow-web
```

Expected:

- Existing tests pass.
- New `format.test.ts` passes.

---

### Task 3: Add SCSS Infrastructure And Convert Component Styles

**Files:**
- Modify: `web/package.json`
- Modify: `package-lock.json`
- Modify: `web/vite.config.ts`
- Create: `web/src/styles/_variables.scss`
- Create: `web/src/styles/_mixins.scss`
- Create: `web/src/styles/index.scss`
- Modify: all Vue SFCs under `web/src/features/**`
- Rename or absorb: `web/src/features/landing/legacyHeroStars.css`

- [ ] **Step 1: Install Sass**

Run:

```bash
npm install --workspace coinburrow-web --save-dev sass
```

Expected:

- `web/package.json` has `sass` in `devDependencies`.
- `package-lock.json` updates.

- [ ] **Step 2: Configure Vite aliases and SCSS globals**

Modify `web/vite.config.ts`:

```ts
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables" as *;\n@use "@/styles/mixins" as *;\n`,
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/market": "http://localhost:4000",
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
```

- [ ] **Step 3: Add SCSS partials**

Create `web/src/styles/_variables.scss`:

```scss
$font-sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
$color-page: #111827;
$color-panel: rgba(255, 255, 255, 0.08);
$color-border: rgba(255, 255, 255, 0.14);
$color-text: #f2f0dd;
$color-text-strong: #ffffff;
$color-muted: #9fb0c6;
$color-up: #6cb5ff;
$color-down: #f97373;
$color-accent: #a8d1a3;
$radius-panel: 12px;
$shadow-soft: 0 18px 60px rgba(0, 0, 0, 0.45);
```

Create `web/src/styles/_mixins.scss`:

```scss
@mixin flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

@mixin panel-surface {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
}

@mixin thin-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.28) transparent;
}
```

Create `web/src/styles/index.scss`:

```scss
@forward "variables";
@forward "mixins";
```

- [ ] **Step 4: Convert Vue styles to SCSS without visual changes**

For every Vue file under `web/src/features/**`, change:

```vue
<style scoped>
```

to:

```vue
<style scoped lang="scss">
```

Then replace repeated values only where the rendered CSS stays identical:

```scss
font-family: $font-sans;
color: $color-text;
border-color: $color-border;
```

Do not change dimensions, breakpoints, layout, text, or selectors in this task.

- [ ] **Step 5: Convert legacy hero stars**

Rename `web/src/features/landing/legacyHeroStars.css` to `web/src/features/landing/legacyHeroStars.scss`.

Modify `LandingPage.vue`:

```ts
import "./legacyHeroStars.scss";
```

- [ ] **Step 6: Build and test web**

Run only the test command in WSL:

```bash
npm run test --workspace coinburrow-web
```

Expected:

- Vue tests pass.
- Landing page tests still pass.
- Sass build verification is deferred to Windows/CI.

---

### Task 4: Add Server Normalize Utilities, Constants, Compression, And TTL Cache

**Files:**
- Modify: `server/package.json`
- Modify: `package-lock.json`
- Create: `server/src/upbit/constants.ts`
- Create: `server/src/upbit/normalize.ts`
- Create: `server/src/upbit/cache.ts`
- Modify: `server/src/config.ts`
- Modify: `server/src/app.ts`
- Modify: `server/src/routes/market.ts`
- Modify: `server/src/upbit/upbitRest.ts`
- Modify: `server/test/upbit-rest.test.ts`
- Modify: `server/test/routes.test.ts`

- [ ] **Step 1: Install response compression**

Run:

```bash
npm install --workspace coinburrow-server @fastify/compress
```

Expected:

- `server/package.json` includes `@fastify/compress`.
- `package-lock.json` updates.

- [ ] **Step 2: Add cache tests**

In `server/test/upbit-rest.test.ts`, import `clearUpbitCacheForTest`:

```ts
import { clearUpbitCacheForTest, fetchMarketStatus } from "../src/upbit/upbitRest.js";
```

Add to `beforeEach`:

```ts
clearUpbitCacheForTest();
```

Add test:

```ts
it("reuses cached market details for repeated market status requests", async () => {
  mockAgent
    .get("https://api.upbit.com")
    .intercept({
      method: "GET",
      path: "/v1/market/all?isDetails=true",
    })
    .reply(200, [{ market: "KRW-BTC", market_warning: "NONE" }]);

  await expect(fetchMarketStatus(["KRW-BTC"])).resolves.toEqual([
    { market: "KRW-BTC", market_warning: "NONE" },
  ]);
  await expect(fetchMarketStatus(["KRW-BTC"])).resolves.toEqual([
    { market: "KRW-BTC", market_warning: "NONE" },
  ]);
});
```

- [ ] **Step 3: Run server test and confirm red state**

Run:

```bash
npm run test --workspace coinburrow-server -- test/upbit-rest.test.ts
```

Expected:

- Test fails because `clearUpbitCacheForTest` and caching do not exist.

- [ ] **Step 4: Add normalize helper**

Create `server/src/upbit/normalize.ts`:

```ts
export function normalizeQuote(quote: string | undefined): string | undefined {
  return quote?.trim().toUpperCase();
}

export function normalizeMarkets(value: string[] | string | undefined): string[] {
  const source = Array.isArray(value) ? value : (value ?? "").split(",");
  return [...new Set(
    source
      .map((market) => market.trim())
      .filter((market) => market.length > 0),
  )];
}
```

- [ ] **Step 5: Add server constants**

Create `server/src/upbit/constants.ts`:

```ts
export const UPBIT_REST_URL = "https://api.upbit.com/v1";

export const TARGET_COINS = [
  "KRW-BTC",
  "KRW-ETH",
  "KRW-XRP",
  "KRW-SOL",
  "KRW-ADA",
  "KRW-DOGE",
  "KRW-DOT",
  "KRW-TRX",
] as const;
```

Modify `server/src/config.ts`:

```ts
import { TARGET_COINS, UPBIT_REST_URL } from "./upbit/constants.js";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  upbitRestUrl: UPBIT_REST_URL,
  targetCoins: TARGET_COINS,
};
```

- [ ] **Step 6: Add TTL cache utility**

Create `server/src/upbit/cache.ts`:

```ts
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export function clearCache(): void {
  cache.clear();
  inFlight.clear();
}

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const current = cache.get(key) as CacheEntry<T> | undefined;
  if (current && current.expiresAt > now) {
    return current.value;
  }

  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }

  const pending = loader()
    .then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, pending);
  return pending;
}
```

- [ ] **Step 7: Use cache in Upbit REST**

Modify `server/src/upbit/upbitRest.ts`:

```ts
import { cached, clearCache } from "./cache.js";
import { normalizeMarkets, normalizeQuote } from "./normalize.js";

const MARKET_DETAILS_CACHE_KEY = "market:all:details";
const MARKET_DETAILS_TTL_MS = 60_000;
const EXCHANGE_RATE_CACHE_KEY = "exchange-rates";
const EXCHANGE_RATE_TTL_MS = 30_000;

export function clearUpbitCacheForTest(): void {
  clearCache();
}
```

Update `fetchMarketStatus`:

```ts
const allMarkets = await cached(
  MARKET_DETAILS_CACHE_KEY,
  MARKET_DETAILS_TTL_MS,
  () => getJson("/market/all?isDetails=true", marketDetailsSchema),
);
```

Update `fetchMarketSummaries` and `fetchAvailableQuotes` only for `/market/all?isDetails=true` calls. Do not cache ticker, orderbook, trade, or candle.

Update `fetchExchangeRates`:

```ts
return cached(EXCHANGE_RATE_CACHE_KEY, EXCHANGE_RATE_TTL_MS, async () => {
  const paths = ["/exchange-rates", "/exchange-rate"];
  for (const path of paths) {
    try {
      return await getJson(path, exchangeRateSchema);
    } catch {
      // Try fallback endpoint.
    }
  }
  return [];
});
```

- [ ] **Step 8: Register compression**

Modify `server/src/app.ts`:

```ts
import compress from "@fastify/compress";
```

Inside `buildApp`, register after CORS:

```ts
void app.register(compress);
```

- [ ] **Step 9: Run server tests**

Run:

```bash
npm run test --workspace coinburrow-server
```

Expected:

- Existing route and Upbit tests pass.
- The cache test proves repeated market status calls use one upstream interceptor.

---

### Task 5: Split Exchange Data And Market Metadata Composables

**Files:**
- Create: `web/src/composables/useMarketMeta.ts`
- Create: `web/src/composables/useExchangeData.ts`
- Modify: `web/src/features/exchange/ExchangePage.vue`
- Modify: `web/test/rest.test.ts`
- Modify: `web/test/stores.test.ts`

- [ ] **Step 1: Add market meta composable tests through existing API tests**

No new component behavior is introduced. Keep test coverage focused on existing REST and store behavior:

```bash
npm run test --workspace coinburrow-web -- test/rest.test.ts test/stores.test.ts
```

Expected:

- Tests pass before extraction.

- [ ] **Step 2: Create `useMarketMeta.ts`**

Create `web/src/composables/useMarketMeta.ts`:

```ts
import { computed, ref } from "vue";
import {
  getAvailableQuotes,
  getExchangeRates,
  getMarketStatus,
  getMarketSummaries,
  type ExchangeRateView,
  type MarketStatusView,
  type MarketSummaryView,
} from "../api/rest.js";
import { CAUTION_LABELS } from "../constants/exchange.js";

export function useMarketMeta(selectedQuote: { value: string }, market: { value: string }) {
  const marketStatus = ref<MarketStatusView[]>([]);
  const exchangeRates = ref<ExchangeRateView[]>([]);
  const availableQuotes = ref<string[]>(["KRW"]);
  const marketSummaries = ref<Record<string, MarketSummaryView>>({});
  const statusError = ref("");
  const quoteLoadError = ref("");

  const selectedMarketSummary = computed(() => marketSummaries.value[market.value]);
  const selectedMarketStatus = computed(() =>
    marketStatus.value.find((status) => status.market === market.value || status.code === market.value),
  );

  const marketStatusCautions = computed(() => {
    const caution = selectedMarketStatus.value?.caution;
    if (!caution || typeof caution !== "object") return [];
    return Object.entries(caution)
      .filter(([, active]) => active)
      .map(([key]) => CAUTION_LABELS[key] ?? key)
      .sort();
  });

  const selectedMarketTradeCurrency = computed(() => {
    const fromSummary = selectedMarketSummary.value?.trade_currency;
    if (typeof fromSummary === "string" && fromSummary.length > 0) return fromSummary;
    const fromStatus = selectedMarketStatus.value?.trade_currency;
    if (typeof fromStatus === "string" && fromStatus.length > 0) return fromStatus;
    return "-";
  });

  function parseLegacyMarketWarning(value: unknown): string {
    if (typeof value !== "string") return "";
    const normalized = value.trim();
    if (!normalized || normalized.toUpperCase() === "NONE") return "";
    return normalized;
  }

  function parseLegacyMarketRestriction(value: unknown): string {
    if (typeof value !== "string") return "";
    const normalized = value.trim();
    if (!normalized) return "";
    if (normalized.toUpperCase() === "NONE") return "없음";
    return normalized;
  }

  const marketState = computed(() => {
    const current = selectedMarketStatus.value;
    if (!current) return "확인중";

    if (typeof current.warning === "boolean") {
      const warningText = current.warning
        ? "제재 경보"
        : marketStatusCautions.value.length > 0
          ? "주의 항목"
          : "정상";
      return marketStatusCautions.value.length > 0
        ? `${warningText} (${marketStatusCautions.value.join(", ")})`
        : warningText;
    }

    if (marketStatusCautions.value.length > 0) {
      return `주의 항목 (${marketStatusCautions.value.join(", ")})`;
    }

    const fallbackWarning =
      parseLegacyMarketWarning(current.market_warning_message) ||
      parseLegacyMarketWarning(current.market_warning) ||
      "";
    if (fallbackWarning.length > 0) return fallbackWarning;

    const event = current.market_event;
    if (typeof event === "string" && event.length > 0) return event;

    return "정상";
  });

  const marketRestriction = computed(() => {
    const current = selectedMarketStatus.value;
    if (!current) return "-";
    if (typeof current.warning === "boolean") return current.warning ? "있음" : "없음";
    const rawWarning = parseLegacyMarketRestriction(current.market_warning);
    if (rawWarning) return rawWarning;
    return "-";
  });

  const usdKrwRate = computed(() => {
    const rate = exchangeRates.value.find((entry) => entry.currency === "USD");
    if (!rate) return null;
    const raw = rate.base_price ?? rate.rate ?? "";
    const normalized = Number(String(raw).replaceAll(",", ""));
    if (Number.isNaN(normalized)) return null;
    return normalized;
  });

  async function loadAvailableQuotes() {
    try {
      const summaries = await getAvailableQuotes();
      const quotes = summaries.map((summary) => summary.quote).filter(Boolean);
      availableQuotes.value = quotes.length > 0 ? quotes : ["KRW"];
      if (!availableQuotes.value.includes(selectedQuote.value)) {
        selectedQuote.value = availableQuotes.value[0];
      }
      quoteLoadError.value = "";
    } catch {
      availableQuotes.value = ["KRW"];
      selectedQuote.value = "KRW";
      quoteLoadError.value = "지원 가능한 마켓 기준통화 목록을 불러오지 못했습니다.";
    }
  }

  async function loadMeta() {
    try {
      exchangeRates.value = await getExchangeRates();
    } catch {
      exchangeRates.value = [];
    }

    try {
      const summariesPayload = await getMarketSummaries({
        quote: selectedQuote.value,
        isDetails: true,
      });
      marketSummaries.value = Object.fromEntries(summariesPayload.map((item) => [item.market, item]));
    } catch {
      marketSummaries.value = {};
    }
  }

  async function loadMarketStatus(nextMarket: string) {
    try {
      marketStatus.value = await getMarketStatus([nextMarket]);
      statusError.value = "";
    } catch (error) {
      marketStatus.value = [];
      statusError.value = `마켓 상태 로딩 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`;
    }
  }

  return {
    availableQuotes,
    marketSummaries,
    marketStatus,
    exchangeRates,
    statusError,
    quoteLoadError,
    selectedMarketSummary,
    selectedMarketStatus,
    marketStatusCautions,
    selectedMarketTradeCurrency,
    marketState,
    marketRestriction,
    usdKrwRate,
    loadAvailableQuotes,
    loadMeta,
    loadMarketStatus,
  };
}
```

- [ ] **Step 3: Create `useExchangeData.ts`**

Create `web/src/composables/useExchangeData.ts` with the existing loader/subscription logic moved from `ExchangePage.vue`. Keep these returned fields:

```ts
return {
  market,
  selectedQuote,
  candleTimeframe,
  candleCount,
  exchangeError,
  activeCandleChannel,
  activeTickerMarkets,
  selectedMarketLabel,
  liveTicker,
  selectedOrderbook,
  selectedMarketSpread,
  topByVolume,
  topGainers,
  topLosers,
  resolveMarketName,
  loadMarketsByQuote,
  loadMarket,
};
```

The implementation must preserve:

- `DEFAULT_MARKET` fallback.
- `resolveCandleSubscriptionChannel` mapping.
- `subscribe("orderbook", [nextMarket])`.
- `subscribe("trade", [nextMarket])`.
- candle channel unsubscribe before resubscribe.
- trade snapshot fallback to `tradeStore.setInitial([])`.

- [ ] **Step 4: Wire composables in `ExchangePage.vue`**

Keep `ExchangePage.vue` as orchestration:

```ts
const meta = useMarketMeta(selectedQuote, market);
const exchange = useExchangeData({
  selectedQuote,
  candleTimeframe,
  candleCount,
  loadMarketStatus: meta.loadMarketStatus,
});
```

Replace local refs/computed/functions with composable returns. Keep template bindings unchanged where possible.

- [ ] **Step 5: Run type check and tests**

Run:

```bash
npx vue-tsc -p web/tsconfig.json --noEmit
npm run test --workspace coinburrow-web
```

Expected:

- Type check passes.
- Web tests pass.

---

### Task 6: Split Exchange Presentation Components

**Files:**
- Create: `web/src/features/exchange/ExchangeHero.vue`
- Create: `web/src/features/exchange/MarketMovementPanel.vue`
- Create: `web/src/features/exchange/MarketSummaryPanel.vue`
- Modify: `web/src/features/exchange/ExchangePage.vue`

- [ ] **Step 1: Create `ExchangeHero.vue`**

Props:

```ts
import type { OrderbookView, TickerView } from "../../stores/types.js";

defineProps<{
  exchangeError: string;
  statusError: string;
  selectedMarketLabel: string;
  marketState: string;
  quote: string;
  liveTicker?: TickerView;
  spreadRatio?: number;
  usdKrwRate: number | null;
}>();
```

Template content comes from the existing `.exchange-hero` section. Use `formatPrice` and `formatRatio` imports from `../../utils/format.js`.

- [ ] **Step 2: Create `MarketMovementPanel.vue`**

Props:

```ts
import type { TickerView } from "../../stores/types.js";

defineProps<{
  topGainers: TickerView[];
  topLosers: TickerView[];
  topByVolume: TickerView[];
  resolveMarketName: (marketCode: string) => string;
}>();
```

Template content comes from existing `마켓 무브먼트` and `거래대금 TOP` panels. Use `formatRate` and `formatCompact`.

- [ ] **Step 3: Create `MarketSummaryPanel.vue`**

Props:

```ts
import type { MarketStatusView, MarketSummaryView } from "../../api/rest.js";

defineProps<{
  market: string;
  selectedMarketStatus?: MarketStatusView;
  selectedMarketSummary?: MarketSummaryView;
  marketState: string;
  selectedMarketTradeCurrency: string;
  marketRestriction: string;
  marketStatusCautions: string[];
}>();
```

Template content comes from existing `선택 마켓 상세` panel.

- [ ] **Step 4: Replace sections in `ExchangePage.vue`**

Use the new components:

```vue
<ExchangeHero
  :exchange-error="exchangeError"
  :status-error="statusError"
  :selected-market-label="selectedMarketLabel"
  :market-state="marketState"
  :quote="selectedMarketSummary?.quote ?? 'KRW'"
  :live-ticker="liveTicker"
  :spread-ratio="selectedOrderbook ? selectedMarketSpread?.ratio : undefined"
  :usd-krw-rate="usdKrwRate"
/>
```

```vue
<MarketMovementPanel
  :top-gainers="topGainers"
  :top-losers="topLosers"
  :top-by-volume="topByVolume"
  :resolve-market-name="resolveMarketName"
/>
```

```vue
<MarketSummaryPanel
  :market="market"
  :selected-market-status="selectedMarketStatus"
  :selected-market-summary="selectedMarketSummary"
  :market-state="marketState"
  :selected-market-trade-currency="selectedMarketTradeCurrency"
  :market-restriction="marketRestriction"
  :market-status-cautions="marketStatusCautions"
/>
```

- [ ] **Step 5: Run web verification**

Run:

```bash
npx vue-tsc -p web/tsconfig.json --noEmit
npm run test --workspace coinburrow-web
```

Expected:

- No type errors.
- Existing web tests pass.
- Build verification is deferred to Windows/CI.

---

### Task 7: Final Verification

**Files:**
- Review: all modified files

- [ ] **Step 1: Search for remaining hardcoded values**

Run:

```bash
rg -n "https://api\\.upbit\\.com|wss://api\\.upbit\\.com|KRW-BTC|54XoC-XFGmLSkJ1e|PRICE_FLUCTUATIONS|new Intl\\.NumberFormat|new Intl\\.DateTimeFormat" web/src server/src
```

Expected:

- URLs and default market live in constants.
- `Intl` construction lives in `web/src/utils/format.ts`.
- Caution labels live in `web/src/constants/exchange.ts`.
- Server target coins live in `server/src/upbit/constants.ts`.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm run test --workspace coinburrow-server
npm run test --workspace coinburrow-web
```

Expected:

- Both workspaces pass.

- [ ] **Step 3: Defer full build outside WSL**

Do not run this command in the current WSL session:

```bash
npm run build --workspaces --if-present
```

Expected:

- Server and web build are verified later on Windows/CI.

- [ ] **Step 4: Review diff**

Run:

```bash
git diff --stat
git diff -- web/src/features/exchange/ExchangePage.vue
git diff -- server/src/upbit/upbitRest.ts
```

Expected:

- Diff matches Tasks 2-6 only.
- No unrelated user changes are reverted.
- `ExchangePage.vue` is substantially smaller.

---

## Spec Coverage Review

- 작업 1 backend performance/clean code: covered by Task 4 and Task 7.
- 작업 2 SCSS introduction: covered by Task 3.
- 작업 3 common constants/util extraction: covered by Task 2 and server portions of Task 4.
- 작업 4 Vue clean code: covered by Task 5 and Task 6.
- Final verification commands: covered by Task 7.
