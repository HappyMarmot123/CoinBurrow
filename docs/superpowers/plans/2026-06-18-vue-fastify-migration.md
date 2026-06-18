# Vue + Fastify 서버리스 마이그레이션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CoinBurrow를 Vue 3 SPA(프론트) + Fastify REST 서버리스(백엔드)로 마이그레이션하고, 실시간 시세는 프론트 Web Worker가 Upbit 공개 WS에 직결해 RxJS로 처리한다.

**Architecture:** 백엔드는 Upbit 공개 REST를 정규화하는 Fastify REST 5종이며 `buildApp()`을 테스트와 Vercel 서버리스 함수가 공유한다. 프론트는 Vue 3+Vite+Pinia SPA로, Web Worker가 Upbit WS에 직결하고 인-워커 RxJS로 throttle/통합 후 Pinia에 반영한다. DB·계정·이메일·상시 WS 서버는 없다.

**Tech Stack:** Node 20+, TypeScript, Fastify 5, undici, zod, Vitest, Vue 3, Vite, Pinia, vue-router, RxJS, highcharts/highcharts-vue, GSAP, @splinetool/runtime, Vercel.

## Global Constraints

- Node 버전: 20 이상.
- 언어: TypeScript (백엔드·프론트 모두), `strict: true`.
- API 키·DB·계정·이메일 사용 금지. Upbit 공개 REST/WS만 사용.
- 테스트 러너: Vitest (백엔드·프론트 공통).
- 백엔드 REST 베이스 경로: `/market/coin-list`, `/market/exchange/{ticker,candle,orderbook,trade-ticks}`.
- Upbit REST 베이스: `https://api.upbit.com/v1`. Upbit WS: `wss://api.upbit.com/websocket/v1`.
- 대상 코인(`TARGET_COINS`): `["KRW-BTC","KRW-ETH","KRW-XRP","KRW-SOL","KRW-ADA","KRW-DOGE","KRW-DOT","KRW-TRX"]`.
- DTO 필드는 camelCase로 정규화(Upbit snake_case → camelCase). Upbit WS 메시지의 `code`는 `market`으로 매핑.
- 모든 코드 단위는 단일 책임. 파일이 커지면 분리.
- 커밋 메시지 말미: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure

```
/
├─ vercel.json
├─ web/                         # Vue 3 + Vite + Pinia SPA
│  ├─ index.html
│  ├─ vite.config.ts
│  ├─ vitest.config.ts
│  ├─ tsconfig.json
│  └─ src/
│     ├─ main.ts
│     ├─ App.vue
│     ├─ router/index.ts
│     ├─ workers/
│     │  ├─ protocol.ts          # 워커 ↔ 메인 메시지 타입 + Upbit 구독 메시지 빌더
│     │  ├─ pipeline.ts          # 순수 RxJS 파이프라인 (테스트 대상)
│     │  └─ marketSocket.worker.ts
│     ├─ composables/useMarketSocket.ts
│     ├─ stores/{ticker,orderbook,candle,trade,market}.ts
│     ├─ api/rest.ts             # 백엔드 REST 호출
│     ├─ features/exchange/{ExchangePage.vue,CandleChart.vue,OrderbookPanel.vue,TradeList.vue,CoinList.vue}
│     └─ features/landing/{LandingPage.vue,SplineScene.vue}
├─ server/                      # Fastify REST
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ vitest.config.ts
│  └─ src/
│     ├─ config.ts
│     ├─ app.ts                  # buildApp()
│     ├─ server.ts               # 로컬 listen
│     ├─ upbit/{types.ts,upbitRest.ts}
│     └─ routes/market.ts
│  └─ test/{coin-list,ticker,candle,orderbook,trade-ticks}.test.ts
└─ api/
   └─ [...path].ts               # Vercel 서버리스 진입 → server buildApp()
```

---

## PHASE A — 백엔드 (Fastify REST + Vitest)

### Task A1: 백엔드 스캐폴드 + `buildApp()` + 헬스 라우트

**Files:**
- Create: `server/package.json`, `server/tsconfig.json`, `server/vitest.config.ts`
- Create: `server/src/config.ts`, `server/src/app.ts`, `server/src/server.ts`
- Test: `server/test/health.test.ts`

**Interfaces:**
- Produces: `buildApp(): FastifyInstance` (in `server/src/app.ts`); `config` object (in `server/src/config.ts`).

- [ ] **Step 1: 패키지/설정 파일 생성**

`server/package.json`:
```json
{
  "name": "coinburrow-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "test": "vitest run"
  },
  "dependencies": {
    "@fastify/cors": "^10.0.1",
    "fastify": "^5.1.0",
    "undici": "^6.21.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

`server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src", "test"]
}
```

`server/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node" } });
```

- [ ] **Step 2: config + buildApp + server 작성**

`server/src/config.ts`:
```ts
export const config = {
  port: Number(process.env.PORT ?? 4000),
  upbitRestUrl: "https://api.upbit.com/v1",
  targetCoins: [
    "KRW-BTC", "KRW-ETH", "KRW-XRP", "KRW-SOL",
    "KRW-ADA", "KRW-DOGE", "KRW-DOT", "KRW-TRX",
  ] as const,
};
```

`server/src/app.ts`:
```ts
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.register(cors, { origin: true });
  app.get("/health", async () => ({ status: "ok" }));
  return app;
}
```

`server/src/server.ts`:
```ts
import { buildApp } from "./app.js";
import { config } from "./config.js";

const app = buildApp();
app.listen({ port: config.port, host: "0.0.0.0" })
  .then((addr) => console.log(`server listening on ${addr}`))
  .catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 3: 실패 테스트 작성**

`server/test/health.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildApp } from "../src/app.js";

describe("health", () => {
  it("returns ok", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
    await app.close();
  });
});
```

- [ ] **Step 4: 의존성 설치 후 테스트 실행**

Run: `cd server && npm install && npm test`
Expected: `health > returns ok` PASS.

- [ ] **Step 5: 커밋**

```bash
git add server vercel.json 2>/dev/null; git add server
git commit -m "feat(server): scaffold Fastify app with health route"
```

---

### Task A2: Upbit REST 클라이언트 + DTO 타입

**Files:**
- Create: `server/src/upbit/types.ts`, `server/src/upbit/upbitRest.ts`
- Test: `server/test/upbit-rest.test.ts`

**Interfaces:**
- Produces (`upbit/types.ts`): `MarketDto { market: string; koreanName: string; englishName: string }`, `TickerDto { market: string; tradePrice: number; signedChangeRate: number; accTradePrice24h: number }`, `CandleDto { market: string; timestamp: number; open: number; high: number; low: number; close: number; volume: number }`, `OrderbookUnit { askPrice: number; bidPrice: number; askSize: number; bidSize: number }`, `OrderbookDto { market: string; timestamp: number; units: OrderbookUnit[] }`, `TradeDto { market: string; price: number; volume: number; side: "ASK" | "BID"; timestamp: number }`.
- Produces (`upbit/upbitRest.ts`): `fetchMarkets(): Promise<MarketDto[]>`, `fetchTickers(markets: string[]): Promise<TickerDto[]>`, `fetchCandles(market: string, count?: number): Promise<CandleDto[]>`, `fetchOrderbook(market: string): Promise<OrderbookDto[]>`, `fetchTradeTicks(market: string, count?: number): Promise<TradeDto[]>`.

- [ ] **Step 1: DTO 타입 작성**

`server/src/upbit/types.ts`:
```ts
export interface MarketDto { market: string; koreanName: string; englishName: string; }
export interface TickerDto { market: string; tradePrice: number; signedChangeRate: number; accTradePrice24h: number; }
export interface CandleDto { market: string; timestamp: number; open: number; high: number; low: number; close: number; volume: number; }
export interface OrderbookUnit { askPrice: number; bidPrice: number; askSize: number; bidSize: number; }
export interface OrderbookDto { market: string; timestamp: number; units: OrderbookUnit[]; }
export interface TradeDto { market: string; price: number; volume: number; side: "ASK" | "BID"; timestamp: number; }
```

- [ ] **Step 2: 실패 테스트 작성 (undici MockAgent)**

`server/test/upbit-rest.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MockAgent, setGlobalDispatcher } from "undici";
import { fetchMarkets, fetchTickers, fetchCandles, fetchOrderbook, fetchTradeTicks } from "../src/upbit/upbitRest.js";

let agent: MockAgent;
beforeEach(() => { agent = new MockAgent(); agent.disableNetConnect(); setGlobalDispatcher(agent); });
afterEach(async () => { await agent.close(); });

const pool = () => agent.get("https://api.upbit.com");

describe("upbitRest", () => {
  it("fetchMarkets returns KRW markets normalized", async () => {
    pool().intercept({ path: "/v1/market/all?isDetails=false", method: "GET" })
      .reply(200, [
        { market: "KRW-BTC", korean_name: "비트코인", english_name: "Bitcoin" },
        { market: "BTC-ETH", korean_name: "이더리움", english_name: "Ethereum" },
      ]);
    const out = await fetchMarkets();
    expect(out).toEqual([{ market: "KRW-BTC", koreanName: "비트코인", englishName: "Bitcoin" }]);
  });

  it("fetchTickers maps fields", async () => {
    pool().intercept({ path: "/v1/ticker?markets=KRW-BTC", method: "GET" })
      .reply(200, [{ market: "KRW-BTC", trade_price: 100, signed_change_rate: 0.01, acc_trade_price_24h: 5 }]);
    const out = await fetchTickers(["KRW-BTC"]);
    expect(out).toEqual([{ market: "KRW-BTC", tradePrice: 100, signedChangeRate: 0.01, accTradePrice24h: 5 }]);
  });

  it("fetchCandles maps OHLCV", async () => {
    pool().intercept({ path: "/v1/candles/minutes/1?market=KRW-BTC&count=200", method: "GET" })
      .reply(200, [{ market: "KRW-BTC", timestamp: 111, opening_price: 1, high_price: 4, low_price: 0, trade_price: 3, candle_acc_trade_volume: 9 }]);
    const out = await fetchCandles("KRW-BTC");
    expect(out).toEqual([{ market: "KRW-BTC", timestamp: 111, open: 1, high: 4, low: 0, close: 3, volume: 9 }]);
  });

  it("fetchOrderbook maps units", async () => {
    pool().intercept({ path: "/v1/orderbook?markets=KRW-BTC", method: "GET" })
      .reply(200, [{ market: "KRW-BTC", timestamp: 222, orderbook_units: [{ ask_price: 10, bid_price: 9, ask_size: 1, bid_size: 2 }] }]);
    const out = await fetchOrderbook("KRW-BTC");
    expect(out).toEqual([{ market: "KRW-BTC", timestamp: 222, units: [{ askPrice: 10, bidPrice: 9, askSize: 1, bidSize: 2 }] }]);
  });

  it("fetchTradeTicks maps side", async () => {
    pool().intercept({ path: "/v1/trades/ticks?market=KRW-BTC&count=50", method: "GET" })
      .reply(200, [{ market: "KRW-BTC", trade_price: 7, trade_volume: 0.5, ask_bid: "BID", timestamp: 333 }]);
    const out = await fetchTradeTicks("KRW-BTC");
    expect(out).toEqual([{ market: "KRW-BTC", price: 7, volume: 0.5, side: "BID", timestamp: 333 }]);
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `cd server && npm test -- upbit-rest`
Expected: FAIL ("Cannot find module ../src/upbit/upbitRest").

- [ ] **Step 4: 구현 작성**

`server/src/upbit/upbitRest.ts`:
```ts
import { request } from "undici";
import { config } from "../config.js";
import type { MarketDto, TickerDto, CandleDto, OrderbookDto, TradeDto } from "./types.js";

async function getJson<T>(path: string): Promise<T> {
  const res = await request(`${config.upbitRestUrl}${path}`, { method: "GET" });
  if (res.statusCode >= 400) throw new Error(`Upbit ${path} -> ${res.statusCode}`);
  return (await res.body.json()) as T;
}

export async function fetchMarkets(): Promise<MarketDto[]> {
  const raw = await getJson<any[]>("/market/all?isDetails=false");
  return raw
    .filter((m) => typeof m.market === "string" && m.market.startsWith("KRW-"))
    .map((m) => ({ market: m.market, koreanName: m.korean_name, englishName: m.english_name }));
}

export async function fetchTickers(markets: string[]): Promise<TickerDto[]> {
  const raw = await getJson<any[]>(`/ticker?markets=${markets.join(",")}`);
  return raw.map((t) => ({
    market: t.market, tradePrice: t.trade_price,
    signedChangeRate: t.signed_change_rate, accTradePrice24h: t.acc_trade_price_24h,
  }));
}

export async function fetchCandles(market: string, count = 200): Promise<CandleDto[]> {
  const raw = await getJson<any[]>(`/candles/minutes/1?market=${market}&count=${count}`);
  return raw.map((c) => ({
    market: c.market, timestamp: c.timestamp,
    open: c.opening_price, high: c.high_price, low: c.low_price,
    close: c.trade_price, volume: c.candle_acc_trade_volume,
  }));
}

export async function fetchOrderbook(market: string): Promise<OrderbookDto[]> {
  const raw = await getJson<any[]>(`/orderbook?markets=${market}`);
  return raw.map((o) => ({
    market: o.market, timestamp: o.timestamp,
    units: (o.orderbook_units ?? []).map((u: any) => ({
      askPrice: u.ask_price, bidPrice: u.bid_price, askSize: u.ask_size, bidSize: u.bid_size,
    })),
  }));
}

export async function fetchTradeTicks(market: string, count = 50): Promise<TradeDto[]> {
  const raw = await getJson<any[]>(`/trades/ticks?market=${market}&count=${count}`);
  return raw.map((t) => ({
    market: t.market, price: t.trade_price, volume: t.trade_volume,
    side: t.ask_bid as "ASK" | "BID", timestamp: t.timestamp,
  }));
}
```

- [ ] **Step 5: 통과 확인 후 커밋**

Run: `cd server && npm test -- upbit-rest` → 5 PASS.
```bash
git add server/src/upbit server/test/upbit-rest.test.ts
git commit -m "feat(server): add Upbit REST client with normalized DTOs"
```

---

### Task A3: 마켓/거래소 라우트 5종

**Files:**
- Create: `server/src/routes/market.ts`
- Modify: `server/src/app.ts` (라우트 등록)
- Test: `server/test/routes.test.ts`

**Interfaces:**
- Consumes: `fetchMarkets/fetchTickers/fetchCandles/fetchOrderbook/fetchTradeTicks` (Task A2), `config.targetCoins` (Task A1).
- Produces: `registerMarketRoutes(app: FastifyInstance): void`.

- [ ] **Step 1: 실패 테스트 작성**

`server/test/routes.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MockAgent, setGlobalDispatcher } from "undici";
import { buildApp } from "../src/app.js";

let agent: MockAgent;
beforeEach(() => { agent = new MockAgent(); agent.disableNetConnect(); setGlobalDispatcher(agent); });
afterEach(async () => { await agent.close(); });
const pool = () => agent.get("https://api.upbit.com");

describe("market routes", () => {
  it("GET /market/coin-list", async () => {
    pool().intercept({ path: "/v1/market/all?isDetails=false", method: "GET" })
      .reply(200, [{ market: "KRW-BTC", korean_name: "비트코인", english_name: "Bitcoin" }]);
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/market/coin-list" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([{ market: "KRW-BTC", koreanName: "비트코인", englishName: "Bitcoin" }]);
    await app.close();
  });

  it("GET /market/exchange/ticker uses target coins", async () => {
    pool().intercept({ path: /\/v1\/ticker\?markets=.+/, method: "GET" })
      .reply(200, [{ market: "KRW-BTC", trade_price: 1, signed_change_rate: 0, acc_trade_price_24h: 0 }]);
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/market/exchange/ticker" });
    expect(res.statusCode).toBe(200);
    expect(res.json()[0].market).toBe("KRW-BTC");
    await app.close();
  });

  it("GET /market/exchange/candle requires market", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/market/exchange/candle" });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("GET /market/exchange/candle?market=KRW-BTC", async () => {
    pool().intercept({ path: "/v1/candles/minutes/1?market=KRW-BTC&count=200", method: "GET" })
      .reply(200, [{ market: "KRW-BTC", timestamp: 1, opening_price: 1, high_price: 2, low_price: 0, trade_price: 1, candle_acc_trade_volume: 3 }]);
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/market/exchange/candle?market=KRW-BTC" });
    expect(res.statusCode).toBe(200);
    expect(res.json()[0].close).toBe(1);
    await app.close();
  });

  it("GET /market/exchange/orderbook?market=KRW-BTC", async () => {
    pool().intercept({ path: "/v1/orderbook?markets=KRW-BTC", method: "GET" })
      .reply(200, [{ market: "KRW-BTC", timestamp: 1, orderbook_units: [{ ask_price: 1, bid_price: 1, ask_size: 1, bid_size: 1 }] }]);
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/market/exchange/orderbook?market=KRW-BTC" });
    expect(res.statusCode).toBe(200);
    expect(res.json()[0].units).toHaveLength(1);
    await app.close();
  });

  it("GET /market/exchange/trade-ticks?market=KRW-BTC", async () => {
    pool().intercept({ path: "/v1/trades/ticks?market=KRW-BTC&count=50", method: "GET" })
      .reply(200, [{ market: "KRW-BTC", trade_price: 1, trade_volume: 1, ask_bid: "ASK", timestamp: 1 }]);
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/market/exchange/trade-ticks?market=KRW-BTC" });
    expect(res.statusCode).toBe(200);
    expect(res.json()[0].side).toBe("ASK");
    await app.close();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd server && npm test -- routes`
Expected: FAIL (라우트 미등록 → 404/모듈 없음).

- [ ] **Step 3: 라우트 구현 + 등록**

`server/src/routes/market.ts`:
```ts
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { config } from "../config.js";
import { fetchMarkets, fetchTickers, fetchCandles, fetchOrderbook, fetchTradeTicks } from "../upbit/upbitRest.js";

const marketQuery = z.object({ market: z.string().min(1) });

export function registerMarketRoutes(app: FastifyInstance): void {
  app.get("/market/coin-list", async () => fetchMarkets());

  app.get("/market/exchange/ticker", async () => fetchTickers([...config.targetCoins]));

  app.get("/market/exchange/candle", async (req, reply) => {
    const parsed = marketQuery.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: "market is required" });
    return fetchCandles(parsed.data.market);
  });

  app.get("/market/exchange/orderbook", async (req, reply) => {
    const parsed = marketQuery.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: "market is required" });
    return fetchOrderbook(parsed.data.market);
  });

  app.get("/market/exchange/trade-ticks", async (req, reply) => {
    const parsed = marketQuery.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: "market is required" });
    return fetchTradeTicks(parsed.data.market);
  });
}
```

`server/src/app.ts` 수정 — `registerMarketRoutes` 등록:
```ts
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { registerMarketRoutes } from "./routes/market.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.register(cors, { origin: true });
  app.get("/health", async () => ({ status: "ok" }));
  registerMarketRoutes(app);
  return app;
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd server && npm test`
Expected: 모든 테스트 PASS (health + upbit-rest + routes).

- [ ] **Step 5: 커밋**

```bash
git add server/src/routes server/src/app.ts server/test/routes.test.ts
git commit -m "feat(server): add market/exchange REST routes with validation"
```

---

### Task A4: Vercel 서버리스 진입점 + vercel.json

**Files:**
- Create: `api/[...path].ts`, `vercel.json`
- Modify: `server/package.json` (서버리스 의존성 추가)

**Interfaces:**
- Consumes: `buildApp()` (Task A1/A3).

- [ ] **Step 1: 서버리스 핸들러 작성**

`api/[...path].ts`:
```ts
import type { IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "../server/src/app.js";

const app = buildApp();
let ready: Promise<void> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!ready) ready = app.ready().then(() => undefined);
  await ready;
  app.server.emit("request", req, res);
}
```

- [ ] **Step 2: vercel.json 작성**

`vercel.json`:
```json
{
  "buildCommand": "cd web && npm install && npm run build",
  "outputDirectory": "web/dist",
  "rewrites": [
    { "source": "/market/(.*)", "destination": "/api/market/$1" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

- [ ] **Step 3: 로컬 빌드 확인**

Run: `cd server && npm run build`
Expected: 타입 에러 없이 `dist/` 생성.

- [ ] **Step 4: 커밋**

```bash
git add api vercel.json server/package.json
git commit -m "feat(server): add Vercel serverless entrypoint and routing"
```

---

## PHASE B — 프론트엔드 (Vue + Worker/RxJS + Pinia)

### Task B1: 프론트 스캐폴드 (Vite + Vue + Pinia + router + Vitest)

**Files:**
- Create: `web/package.json`, `web/tsconfig.json`, `web/vite.config.ts`, `web/vitest.config.ts`, `web/index.html`
- Create: `web/src/main.ts`, `web/src/App.vue`, `web/src/router/index.ts`
- Test: `web/test/smoke.test.ts`

**Interfaces:**
- Produces: 부팅 가능한 Vue 앱, `router` 인스턴스.

- [ ] **Step 1: 패키지/설정 생성**

`web/package.json`:
```json
{
  "name": "coinburrow-web",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "@splinetool/runtime": "^1.9.0",
    "gsap": "^3.12.5",
    "highcharts": "^11.4.6",
    "highcharts-vue": "^2.0.1",
    "pinia": "^2.2.6",
    "rxjs": "^7.8.1",
    "vue": "^3.5.13",
    "vue-router": "^4.4.5"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.1",
    "@vue/test-utils": "^2.4.6",
    "jsdom": "^25.0.1",
    "typescript": "^5.7.2",
    "vite": "^6.0.3",
    "vitest": "^2.1.8",
    "vue-tsc": "^2.1.10"
  }
}
```

`web/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "preserve",
    "lib": ["ES2022", "DOM", "DOM.Iterable", "WebWorker"],
    "types": ["vite/client"],
    "skipLibCheck": true
  },
  "include": ["src", "test"]
}
```

`web/vite.config.ts`:
```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    proxy: { "/market": "http://localhost:4000" },
  },
});
```

`web/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: { environment: "jsdom", globals: true },
});
```

`web/index.html`:
```html
<!doctype html>
<html lang="ko">
  <head><meta charset="UTF-8" /><title>CoinBurrow</title></head>
  <body><div id="app"></div><script type="module" src="/src/main.ts"></script></body>
</html>
```

- [ ] **Step 2: 앱 진입/라우터/App 작성**

`web/src/router/index.ts`:
```ts
import { createRouter, createWebHistory } from "vue-router";
import LandingPage from "../features/landing/LandingPage.vue";
import ExchangePage from "../features/exchange/ExchangePage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "landing", component: LandingPage },
    { path: "/exchange", name: "exchange", component: ExchangePage },
  ],
});
```

`web/src/App.vue`:
```vue
<template><router-view /></template>
```

`web/src/main.ts`:
```ts
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { router } from "./router/index.js";

createApp(App).use(createPinia()).use(router).mount("#app");
```

플레이스홀더 페이지 생성 (이후 태스크에서 교체):
`web/src/features/landing/LandingPage.vue`:
```vue
<template><main><h1>CoinBurrow</h1><router-link to="/exchange">거래소</router-link></main></template>
```
`web/src/features/exchange/ExchangePage.vue`:
```vue
<template><main><h1>Exchange</h1></main></template>
```

- [ ] **Step 3: 스모크 테스트 작성**

`web/test/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import LandingPage from "../src/features/landing/LandingPage.vue";

describe("smoke", () => {
  it("renders landing heading", () => {
    const wrapper = mount(LandingPage, { global: { stubs: { "router-link": true } } });
    expect(wrapper.text()).toContain("CoinBurrow");
  });
});
```

- [ ] **Step 4: 설치 후 테스트**

Run: `cd web && npm install && npm test`
Expected: smoke PASS.

- [ ] **Step 5: 커밋**

```bash
git add web
git commit -m "feat(web): scaffold Vue 3 + Vite + Pinia + router SPA"
```

---

### Task B2: 워커 프로토콜 + Upbit 구독 메시지 빌더

**Files:**
- Create: `web/src/workers/protocol.ts`
- Test: `web/test/protocol.test.ts`

**Interfaces:**
- Produces: 타입 `Channel = "ticker" | "orderbook" | "candle" | "trade"`; `WorkerCommand = { type: "subscribe" | "unsubscribe"; channel: Channel; markets: string[] }`; `WorkerResponse = { type: Channel; data: unknown[] } | { type: "status"; connected: boolean }`; 함수 `buildUpbitSubscription(subs: Record<Channel, Set<string>>): unknown[]`.

- [ ] **Step 1: 실패 테스트 작성**

`web/test/protocol.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildUpbitSubscription, type Channel } from "../src/workers/protocol";

describe("buildUpbitSubscription", () => {
  it("builds ticket + typed entries + format", () => {
    const subs: Record<Channel, Set<string>> = {
      ticker: new Set(["KRW-BTC"]),
      orderbook: new Set(["KRW-BTC"]),
      candle: new Set(),
      trade: new Set(),
    };
    const msg = buildUpbitSubscription(subs) as any[];
    expect(msg[0]).toHaveProperty("ticket");
    expect(msg).toEqual(expect.arrayContaining([
      { type: "ticker", codes: ["KRW-BTC"] },
      { type: "orderbook", codes: ["KRW-BTC"] },
    ]));
    expect(msg).not.toEqual(expect.arrayContaining([{ type: "candle.1s", codes: [] }]));
    expect(msg[msg.length - 1]).toEqual({ format: "DEFAULT" });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd web && npm test -- protocol`
Expected: FAIL (모듈 없음).

- [ ] **Step 3: 구현 작성**

`web/src/workers/protocol.ts`:
```ts
export type Channel = "ticker" | "orderbook" | "candle" | "trade";

export interface WorkerCommand { type: "subscribe" | "unsubscribe"; channel: Channel; markets: string[]; }
export type WorkerResponse =
  | { type: Channel; data: unknown[] }
  | { type: "status"; connected: boolean };

const UPBIT_TYPE: Record<Channel, string> = {
  ticker: "ticker", orderbook: "orderbook", candle: "candle.1s", trade: "trade",
};

export function buildUpbitSubscription(subs: Record<Channel, Set<string>>): unknown[] {
  const msg: unknown[] = [{ ticket: crypto.randomUUID() }];
  (Object.keys(subs) as Channel[]).forEach((ch) => {
    const codes = [...subs[ch]];
    if (codes.length > 0) msg.push({ type: UPBIT_TYPE[ch], codes });
  });
  msg.push({ format: "DEFAULT" });
  return msg;
}
```

- [ ] **Step 4: 통과 확인 후 커밋**

Run: `cd web && npm test -- protocol` → PASS.
```bash
git add web/src/workers/protocol.ts web/test/protocol.test.ts
git commit -m "feat(web): add worker protocol and Upbit subscription builder"
```

---

### Task B3: 순수 RxJS 파이프라인 (throttle/통합)

**Files:**
- Create: `web/src/workers/pipeline.ts`
- Test: `web/test/pipeline.test.ts`

**Interfaces:**
- Consumes: `Channel`, `WorkerResponse` (Task B2).
- Produces: `normalizeUpbit(raw: any): { channel: Channel; item: any } | null`; `createOutputStream(raw$: Observable<any>): Observable<WorkerResponse>` (ticker는 100ms 윈도우로 market별 최신값 통합, orderbook/trade는 100ms throttle, candle 패스스루).

- [ ] **Step 1: 실패 테스트 작성 (fake timers)**

`web/test/pipeline.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Subject } from "rxjs";
import { normalizeUpbit, createOutputStream } from "../src/workers/pipeline";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("normalizeUpbit", () => {
  it("maps ticker code to market", () => {
    const out = normalizeUpbit({ type: "ticker", code: "KRW-BTC", trade_price: 5, signed_change_rate: 0.1, acc_trade_price_24h: 9 });
    expect(out).toEqual({ channel: "ticker", item: { market: "KRW-BTC", tradePrice: 5, signedChangeRate: 0.1, accTradePrice24h: 9 } });
  });
  it("maps candle.1s type to candle channel", () => {
    const out = normalizeUpbit({ type: "candle.1s", code: "KRW-BTC", timestamp: 1, opening_price: 1, high_price: 2, low_price: 0, trade_price: 1, candle_acc_trade_volume: 3 });
    expect(out?.channel).toBe("candle");
  });
  it("returns null for unknown type", () => {
    expect(normalizeUpbit({ type: "myOrder" })).toBeNull();
  });
});

describe("createOutputStream", () => {
  it("consolidates ticker updates per 100ms window keeping latest per market", () => {
    const raw$ = new Subject<any>();
    const got: any[] = [];
    const sub = createOutputStream(raw$).subscribe((r) => got.push(r));
    raw$.next({ type: "ticker", code: "KRW-BTC", trade_price: 1, signed_change_rate: 0, acc_trade_price_24h: 0 });
    raw$.next({ type: "ticker", code: "KRW-BTC", trade_price: 2, signed_change_rate: 0, acc_trade_price_24h: 0 });
    raw$.next({ type: "ticker", code: "KRW-ETH", trade_price: 9, signed_change_rate: 0, acc_trade_price_24h: 0 });
    vi.advanceTimersByTime(120);
    const tick = got.find((g) => g.type === "ticker");
    expect(tick.data).toEqual(expect.arrayContaining([
      { market: "KRW-BTC", tradePrice: 2, signedChangeRate: 0, accTradePrice24h: 0 },
      { market: "KRW-ETH", tradePrice: 9, signedChangeRate: 0, accTradePrice24h: 0 },
    ]));
    expect(tick.data).toHaveLength(2);
    sub.unsubscribe();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd web && npm test -- pipeline`
Expected: FAIL (모듈 없음).

- [ ] **Step 3: 구현 작성**

`web/src/workers/pipeline.ts`:
```ts
import { type Observable, merge } from "rxjs";
import { filter, map, groupBy, mergeMap, bufferTime, throttleTime } from "rxjs/operators";
import type { Channel, WorkerResponse } from "./protocol.js";

export function normalizeUpbit(raw: any): { channel: Channel; item: any } | null {
  const t: string = raw?.type ?? "";
  const market = raw.code ?? raw.market;
  if (t === "ticker") {
    return { channel: "ticker", item: { market, tradePrice: raw.trade_price, signedChangeRate: raw.signed_change_rate, accTradePrice24h: raw.acc_trade_price_24h } };
  }
  if (t === "orderbook") {
    return { channel: "orderbook", item: { market, timestamp: raw.timestamp, units: (raw.orderbook_units ?? []).map((u: any) => ({ askPrice: u.ask_price, bidPrice: u.bid_price, askSize: u.ask_size, bidSize: u.bid_size })) } };
  }
  if (t.startsWith("candle")) {
    return { channel: "candle", item: { market, timestamp: raw.timestamp, open: raw.opening_price, high: raw.high_price, low: raw.low_price, close: raw.trade_price, volume: raw.candle_acc_trade_volume } };
  }
  if (t === "trade") {
    return { channel: "trade", item: { market, price: raw.trade_price, volume: raw.trade_volume, side: raw.ask_bid, timestamp: raw.timestamp } };
  }
  return null;
}

export function createOutputStream(raw$: Observable<any>): Observable<WorkerResponse> {
  const norm$ = raw$.pipe(map(normalizeUpbit), filter((x): x is { channel: Channel; item: any } => x !== null));

  const ticker$ = norm$.pipe(
    filter((n) => n.channel === "ticker"),
    bufferTime(100),
    filter((batch) => batch.length > 0),
    map((batch) => {
      const latest = new Map<string, any>();
      batch.forEach((n) => latest.set(n.item.market, n.item));
      return { type: "ticker" as Channel, data: [...latest.values()] };
    }),
  );

  const others$ = norm$.pipe(
    filter((n) => n.channel !== "ticker"),
    groupBy((n) => n.channel),
    mergeMap((group) => group.pipe(
      throttleTime(100, undefined, { leading: true, trailing: true }),
      map((n) => ({ type: n.channel, data: [n.item] })),
    )),
  );

  return merge(ticker$, others$);
}
```

- [ ] **Step 4: 통과 확인 후 커밋**

Run: `cd web && npm test -- pipeline` → PASS.
```bash
git add web/src/workers/pipeline.ts web/test/pipeline.test.ts
git commit -m "feat(web): add pure RxJS pipeline for Upbit stream throttling"
```

---

### Task B4: 워커 (Upbit WS 직결)

**Files:**
- Create: `web/src/workers/marketSocket.worker.ts`

**Interfaces:**
- Consumes: `buildUpbitSubscription`, `WorkerCommand` (B2), `createOutputStream` (B3).
- Produces: 모듈 워커. 메인 스레드는 `WorkerCommand` post, 워커는 `WorkerResponse` post.

> 이 태스크는 브라우저 WebSocket/Worker 런타임 의존이라 단위 테스트 대신 타입 컴파일로 검증한다(파이프라인 로직은 B3에서 테스트됨).

- [ ] **Step 1: 워커 구현 작성**

`web/src/workers/marketSocket.worker.ts`:
```ts
import { Subject } from "rxjs";
import { buildUpbitSubscription, type Channel, type WorkerCommand } from "./protocol.js";
import { createOutputStream } from "./pipeline.js";

const UPBIT_WS = "wss://api.upbit.com/websocket/v1";
const subs: Record<Channel, Set<string>> = { ticker: new Set(), orderbook: new Set(), candle: new Set(), trade: new Set() };
const raw$ = new Subject<any>();
let ws: WebSocket | null = null;

createOutputStream(raw$).subscribe((res) => self.postMessage(res));

function connect() {
  ws = new WebSocket(UPBIT_WS);
  ws.binaryType = "arraybuffer";
  ws.onopen = () => { self.postMessage({ type: "status", connected: true }); sendSubscription(); };
  ws.onclose = () => { self.postMessage({ type: "status", connected: false }); setTimeout(connect, 3000); };
  ws.onerror = () => ws?.close();
  ws.onmessage = (ev) => {
    const text = typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data as ArrayBuffer);
    try { raw$.next(JSON.parse(text)); } catch { /* ignore malformed frame */ }
  };
}

function sendSubscription() {
  if (ws?.readyState !== WebSocket.OPEN) return;
  const hasAny = Object.values(subs).some((s) => s.size > 0);
  if (hasAny) ws.send(JSON.stringify(buildUpbitSubscription(subs)));
}

self.onmessage = (ev: MessageEvent<WorkerCommand>) => {
  const { type, channel, markets } = ev.data;
  if (type === "subscribe") markets.forEach((m) => subs[channel].add(m));
  else markets.forEach((m) => subs[channel].delete(m));
  sendSubscription();
};

connect();
```

- [ ] **Step 2: 타입체크**

Run: `cd web && npx vue-tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add web/src/workers/marketSocket.worker.ts
git commit -m "feat(web): add market socket worker with direct Upbit WS"
```

---

### Task B5: Pinia 스토어 5종

**Files:**
- Create: `web/src/stores/ticker.ts`, `orderbook.ts`, `candle.ts`, `trade.ts`, `market.ts`
- Test: `web/test/stores.test.ts`

**Interfaces:**
- Produces:
  - `useTickerStore` — `state: { byMarket: Record<string, TickerView> }`, `applyTicker(list: TickerView[])`.
  - `useOrderbookStore` — `state: { current: OrderbookView | null }`, `applyOrderbook(o: OrderbookView)`.
  - `useCandleStore` — `state: { candles: CandleView[] }`, `setInitial(list: CandleView[])`, `applyCandle(c: CandleView)` (같은 timestamp면 갱신, 아니면 push).
  - `useTradeStore` — `state: { recent: TradeView[] }`, `applyTrade(t: TradeView)` (앞에 추가, 최대 50개).
  - `useMarketStore` — `state: { list: MarketView[] }`, `setList(list)`.
  - View 타입은 `web/src/stores/types.ts`에 정의(서버 DTO와 동일 형태): `TickerView`, `OrderbookView`, `CandleView`, `TradeView`, `MarketView`.

- [ ] **Step 1: 실패 테스트 작성**

`web/test/stores.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useTickerStore } from "../src/stores/ticker";
import { useCandleStore } from "../src/stores/candle";
import { useTradeStore } from "../src/stores/trade";

beforeEach(() => setActivePinia(createPinia()));

describe("stores", () => {
  it("ticker store indexes by market", () => {
    const s = useTickerStore();
    s.applyTicker([{ market: "KRW-BTC", tradePrice: 1, signedChangeRate: 0, accTradePrice24h: 0 }]);
    expect(s.byMarket["KRW-BTC"].tradePrice).toBe(1);
  });
  it("candle store updates same timestamp, pushes new", () => {
    const s = useCandleStore();
    s.setInitial([{ market: "KRW-BTC", timestamp: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 }]);
    s.applyCandle({ market: "KRW-BTC", timestamp: 1, open: 1, high: 2, low: 1, close: 2, volume: 5 });
    expect(s.candles).toHaveLength(1);
    expect(s.candles[0].close).toBe(2);
    s.applyCandle({ market: "KRW-BTC", timestamp: 2, open: 2, high: 2, low: 2, close: 2, volume: 1 });
    expect(s.candles).toHaveLength(2);
  });
  it("trade store keeps newest first, caps at 50", () => {
    const s = useTradeStore();
    for (let i = 0; i < 60; i++) s.applyTrade({ market: "KRW-BTC", price: i, volume: 1, side: "BID", timestamp: i });
    expect(s.recent).toHaveLength(50);
    expect(s.recent[0].price).toBe(59);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd web && npm test -- stores`
Expected: FAIL (모듈 없음).

- [ ] **Step 3: 타입 + 스토어 구현**

`web/src/stores/types.ts`:
```ts
export interface TickerView { market: string; tradePrice: number; signedChangeRate: number; accTradePrice24h: number; }
export interface OrderbookUnitView { askPrice: number; bidPrice: number; askSize: number; bidSize: number; }
export interface OrderbookView { market: string; timestamp: number; units: OrderbookUnitView[]; }
export interface CandleView { market: string; timestamp: number; open: number; high: number; low: number; close: number; volume: number; }
export interface TradeView { market: string; price: number; volume: number; side: "ASK" | "BID"; timestamp: number; }
export interface MarketView { market: string; koreanName: string; englishName: string; }
```

`web/src/stores/ticker.ts`:
```ts
import { defineStore } from "pinia";
import type { TickerView } from "./types.js";

export const useTickerStore = defineStore("ticker", {
  state: () => ({ byMarket: {} as Record<string, TickerView> }),
  actions: {
    applyTicker(list: TickerView[]) { list.forEach((t) => { this.byMarket[t.market] = t; }); },
  },
});
```

`web/src/stores/orderbook.ts`:
```ts
import { defineStore } from "pinia";
import type { OrderbookView } from "./types.js";

export const useOrderbookStore = defineStore("orderbook", {
  state: () => ({ current: null as OrderbookView | null }),
  actions: { applyOrderbook(o: OrderbookView) { this.current = o; } },
});
```

`web/src/stores/candle.ts`:
```ts
import { defineStore } from "pinia";
import type { CandleView } from "./types.js";

export const useCandleStore = defineStore("candle", {
  state: () => ({ candles: [] as CandleView[] }),
  actions: {
    setInitial(list: CandleView[]) { this.candles = [...list].sort((a, b) => a.timestamp - b.timestamp); },
    applyCandle(c: CandleView) {
      const last = this.candles[this.candles.length - 1];
      if (last && last.timestamp === c.timestamp) this.candles.splice(this.candles.length - 1, 1, c);
      else this.candles.push(c);
    },
  },
});
```

`web/src/stores/trade.ts`:
```ts
import { defineStore } from "pinia";
import type { TradeView } from "./types.js";

export const useTradeStore = defineStore("trade", {
  state: () => ({ recent: [] as TradeView[] }),
  actions: { applyTrade(t: TradeView) { this.recent.unshift(t); if (this.recent.length > 50) this.recent.length = 50; } },
});
```

`web/src/stores/market.ts`:
```ts
import { defineStore } from "pinia";
import type { MarketView } from "./types.js";

export const useMarketStore = defineStore("market", {
  state: () => ({ list: [] as MarketView[] }),
  actions: { setList(list: MarketView[]) { this.list = list; } },
});
```

- [ ] **Step 4: 통과 확인 후 커밋**

Run: `cd web && npm test -- stores` → PASS.
```bash
git add web/src/stores web/test/stores.test.ts
git commit -m "feat(web): add Pinia stores for market data"
```

---

### Task B6: REST 클라이언트 + `useMarketSocket` 브리지

**Files:**
- Create: `web/src/api/rest.ts`, `web/src/composables/useMarketSocket.ts`
- Test: `web/test/rest.test.ts`

**Interfaces:**
- Consumes: 스토어들(B5), 워커(B4), `WorkerResponse`/`Channel`(B2), View 타입(B5).
- Produces (`api/rest.ts`): `getCoinList(): Promise<MarketView[]>`, `getCandles(market): Promise<CandleView[]>`, `getTickerSnapshot(): Promise<TickerView[]>`, `getOrderbookSnapshot(market): Promise<OrderbookView[]>`, `getTradeSnapshot(market): Promise<TradeView[]>`.
- Produces (`composables/useMarketSocket.ts`): `useMarketSocket()` → `{ subscribe(channel, markets), unsubscribe(channel, markets) }`. 내부에서 워커 생성 후 `WorkerResponse`를 해당 스토어로 라우팅.

- [ ] **Step 1: 실패 테스트 작성 (REST, fetch 모킹)**

`web/test/rest.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { getCoinList, getCandles } from "../src/api/rest";

afterEach(() => vi.restoreAllMocks());

describe("rest client", () => {
  it("getCoinList calls /market/coin-list", async () => {
    const data = [{ market: "KRW-BTC", koreanName: "비트코인", englishName: "Bitcoin" }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => data }));
    expect(await getCoinList()).toEqual(data);
    expect(fetch).toHaveBeenCalledWith("/market/coin-list");
  });
  it("getCandles passes market query", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    await getCandles("KRW-BTC");
    expect(fetch).toHaveBeenCalledWith("/market/exchange/candle?market=KRW-BTC");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd web && npm test -- rest`
Expected: FAIL (모듈 없음).

- [ ] **Step 3: 구현 작성**

`web/src/api/rest.ts`:
```ts
import type { MarketView, CandleView, TickerView, OrderbookView, TradeView } from "../stores/types.js";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export const getCoinList = () => getJson<MarketView[]>("/market/coin-list");
export const getTickerSnapshot = () => getJson<TickerView[]>("/market/exchange/ticker");
export const getCandles = (market: string) => getJson<CandleView[]>(`/market/exchange/candle?market=${market}`);
export const getOrderbookSnapshot = (market: string) => getJson<OrderbookView[]>(`/market/exchange/orderbook?market=${market}`);
export const getTradeSnapshot = (market: string) => getJson<TradeView[]>(`/market/exchange/trade-ticks?market=${market}`);
```

`web/src/composables/useMarketSocket.ts`:
```ts
import { onUnmounted } from "vue";
import type { Channel, WorkerCommand, WorkerResponse } from "../workers/protocol.js";
import { useTickerStore } from "../stores/ticker.js";
import { useOrderbookStore } from "../stores/orderbook.js";
import { useCandleStore } from "../stores/candle.js";
import { useTradeStore } from "../stores/trade.js";
import type { TickerView, OrderbookView, CandleView, TradeView } from "../stores/types.js";

export function useMarketSocket() {
  const worker = new Worker(new URL("../workers/marketSocket.worker.ts", import.meta.url), { type: "module" });
  const ticker = useTickerStore();
  const orderbook = useOrderbookStore();
  const candle = useCandleStore();
  const trade = useTradeStore();

  worker.onmessage = (ev: MessageEvent<WorkerResponse>) => {
    const msg = ev.data;
    if (msg.type === "status") return;
    if (msg.type === "ticker") ticker.applyTicker(msg.data as TickerView[]);
    else if (msg.type === "orderbook") (msg.data as OrderbookView[]).forEach((o) => orderbook.applyOrderbook(o));
    else if (msg.type === "candle") (msg.data as CandleView[]).forEach((c) => candle.applyCandle(c));
    else if (msg.type === "trade") (msg.data as TradeView[]).forEach((t) => trade.applyTrade(t));
  };

  const post = (cmd: WorkerCommand) => worker.postMessage(cmd);
  const subscribe = (channel: Channel, markets: string[]) => post({ type: "subscribe", channel, markets });
  const unsubscribe = (channel: Channel, markets: string[]) => post({ type: "unsubscribe", channel, markets });

  onUnmounted(() => worker.terminate());
  return { subscribe, unsubscribe };
}
```

- [ ] **Step 4: 통과 확인 후 커밋**

Run: `cd web && npm test -- rest` → PASS.
```bash
git add web/src/api web/src/composables web/test/rest.test.ts
git commit -m "feat(web): add REST client and worker-to-store bridge composable"
```

---

### Task B7: 거래소 컴포넌트 (차트/호가/체결/코인리스트) + 페이지 조립

**Files:**
- Create: `web/src/features/exchange/CandleChart.vue`, `OrderbookPanel.vue`, `TradeList.vue`, `CoinList.vue`
- Modify: `web/src/features/exchange/ExchangePage.vue`
- Create: `web/src/main.ts` 수정 없음 (highcharts 전역 등록은 페이지에서 처리)
- Test: `web/test/coin-list.test.ts`

**Interfaces:**
- Consumes: 스토어(B5), `useMarketSocket`(B6), REST(B6), highcharts-vue.
- Produces: `ExchangePage`가 BTC 기본 마켓을 구독하고 4개 패널을 렌더.

- [ ] **Step 1: 실패 테스트 작성 (CoinList 렌더)**

`web/test/coin-list.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { mount } from "@vue/test-utils";
import CoinList from "../src/features/exchange/CoinList.vue";
import { useMarketStore } from "../src/stores/market";

beforeEach(() => setActivePinia(createPinia()));

describe("CoinList", () => {
  it("filters by search query", async () => {
    const store = useMarketStore();
    store.setList([
      { market: "KRW-BTC", koreanName: "비트코인", englishName: "Bitcoin" },
      { market: "KRW-ETH", koreanName: "이더리움", englishName: "Ethereum" },
    ]);
    const wrapper = mount(CoinList, { props: { selected: "KRW-BTC" } });
    await wrapper.find("input").setValue("이더");
    expect(wrapper.text()).toContain("이더리움");
    expect(wrapper.text()).not.toContain("비트코인");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd web && npm test -- coin-list`
Expected: FAIL (모듈 없음).

- [ ] **Step 3: 컴포넌트 구현**

`web/src/features/exchange/CoinList.vue`:
```vue
<script setup lang="ts">
import { ref, computed } from "vue";
import { useMarketStore } from "../../stores/market.js";

defineProps<{ selected: string }>();
const emit = defineEmits<{ select: [market: string] }>();
const store = useMarketStore();
const query = ref("");
const filtered = computed(() =>
  store.list.filter((m) =>
    m.koreanName.includes(query.value) || m.market.toLowerCase().includes(query.value.toLowerCase())),
);
</script>
<template>
  <div class="coin-list">
    <input v-model="query" placeholder="코인 검색" />
    <ul>
      <li v-for="m in filtered" :key="m.market" @click="emit('select', m.market)">
        {{ m.koreanName }} ({{ m.market }})
      </li>
    </ul>
  </div>
</template>
```

`web/src/features/exchange/OrderbookPanel.vue`:
```vue
<script setup lang="ts">
import { useOrderbookStore } from "../../stores/orderbook.js";
const store = useOrderbookStore();
</script>
<template>
  <div class="orderbook">
    <h3>호가</h3>
    <table v-if="store.current">
      <tr v-for="(u, i) in store.current.units" :key="i">
        <td class="ask">{{ u.askPrice }} ({{ u.askSize }})</td>
        <td class="bid">{{ u.bidPrice }} ({{ u.bidSize }})</td>
      </tr>
    </table>
  </div>
</template>
```

`web/src/features/exchange/TradeList.vue`:
```vue
<script setup lang="ts">
import { useTradeStore } from "../../stores/trade.js";
const store = useTradeStore();
</script>
<template>
  <div class="trades">
    <h3>체결</h3>
    <ul>
      <li v-for="t in store.recent" :key="t.timestamp" :class="t.side === 'BID' ? 'up' : 'down'">
        {{ t.price }} · {{ t.volume }}
      </li>
    </ul>
  </div>
</template>
```

`web/src/features/exchange/CandleChart.vue`:
```vue
<script setup lang="ts">
import { computed } from "vue";
import { Chart } from "highcharts-vue";
import { useCandleStore } from "../../stores/candle.js";

const store = useCandleStore();
const chartOptions = computed(() => ({
  chart: { type: "candlestick", height: 400 },
  title: { text: "1분봉" },
  series: [{
    type: "candlestick",
    data: store.candles.map((c) => [c.timestamp, c.open, c.high, c.low, c.close]),
  }],
}));
</script>
<template>
  <div class="chart"><Chart :options="chartOptions" /></div>
</template>
```

- [ ] **Step 4: 페이지 조립**

`web/src/features/exchange/ExchangePage.vue`:
```vue
<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import CandleChart from "./CandleChart.vue";
import OrderbookPanel from "./OrderbookPanel.vue";
import TradeList from "./TradeList.vue";
import CoinList from "./CoinList.vue";
import { useMarketSocket } from "../../composables/useMarketSocket.js";
import { useMarketStore } from "../../stores/market.js";
import { useCandleStore } from "../../stores/candle.js";
import { getCoinList, getCandles } from "../../api/rest.js";

const market = ref("KRW-BTC");
const { subscribe, unsubscribe } = useMarketSocket();
const marketStore = useMarketStore();
const candleStore = useCandleStore();

async function load(m: string) {
  candleStore.setInitial(await getCandles(m));
  subscribe("orderbook", [m]);
  subscribe("candle", [m]);
  subscribe("trade", [m]);
}

onMounted(async () => {
  marketStore.setList(await getCoinList());
  subscribe("ticker", marketStore.list.map((x) => x.market));
  await load(market.value);
});

watch(market, (next, prev) => {
  unsubscribe("orderbook", [prev]); unsubscribe("candle", [prev]); unsubscribe("trade", [prev]);
  load(next);
});
</script>
<template>
  <main class="exchange">
    <CoinList :selected="market" @select="market = $event" />
    <section class="main-panel">
      <CandleChart />
      <div class="bottom"><OrderbookPanel /><TradeList /></div>
    </section>
  </main>
</template>
```

- [ ] **Step 5: 통과/타입 확인 후 커밋**

Run: `cd web && npm test -- coin-list` → PASS, 그리고 `npx vue-tsc --noEmit` → 에러 없음.
```bash
git add web/src/features/exchange web/test/coin-list.test.ts
git commit -m "feat(web): add exchange dashboard panels and page"
```

---

### Task B8: 랜딩 페이지 (GSAP + Spline 런타임)

**Files:**
- Create: `web/src/features/landing/SplineScene.vue`
- Modify: `web/src/features/landing/LandingPage.vue`
- Test: `web/test/landing.test.ts`

**Interfaces:**
- Consumes: `@splinetool/runtime`, `gsap`.
- Produces: `LandingPage`가 헤드라인 + CTA(거래소 링크) + Spline 캔버스를 렌더.

> Spline 씬 URL은 환경변수 `VITE_SPLINE_SCENE`로 주입한다. 없으면 캔버스는 비활성(테스트/CI 안전).

- [ ] **Step 1: 실패 테스트 작성**

`web/test/landing.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import LandingPage from "../src/features/landing/LandingPage.vue";

describe("LandingPage", () => {
  it("renders headline and exchange CTA", () => {
    const wrapper = mount(LandingPage, {
      global: { stubs: { "router-link": { template: "<a><slot /></a>" }, SplineScene: true } },
    });
    expect(wrapper.text()).toContain("CoinBurrow");
    expect(wrapper.text()).toContain("거래소");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd web && npm test -- landing`
Expected: FAIL (현재 LandingPage에 SplineScene/CTA 구조 없음 → stub 미존재로 마운트 경고 또는 텍스트 불일치). 갱신 전이라 실패.

- [ ] **Step 3: 구현 작성**

`web/src/features/landing/SplineScene.vue`:
```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { Application } from "@splinetool/runtime";

const props = defineProps<{ scene?: string }>();
const canvas = ref<HTMLCanvasElement | null>(null);
let app: Application | null = null;

onMounted(() => {
  if (canvas.value && props.scene) {
    app = new Application(canvas.value);
    app.load(props.scene).catch(() => { /* scene load best-effort */ });
  }
});
onUnmounted(() => app?.dispose());
</script>
<template>
  <canvas ref="canvas" class="spline-canvas" />
</template>
```

`web/src/features/landing/LandingPage.vue`:
```vue
<script setup lang="ts">
import { ref, onMounted } from "vue";
import gsap from "gsap";
import SplineScene from "./SplineScene.vue";

const heroRef = ref<HTMLElement | null>(null);
const scene = import.meta.env.VITE_SPLINE_SCENE as string | undefined;

onMounted(() => {
  if (heroRef.value) gsap.from(heroRef.value, { opacity: 0, y: 40, duration: 0.8, ease: "power2.out" });
});
</script>
<template>
  <main class="landing">
    <SplineScene :scene="scene" />
    <section ref="heroRef" class="hero">
      <h1>CoinBurrow</h1>
      <p>가상 포인트로 즐기는 실시간 크립토 대시보드</p>
      <router-link to="/exchange" class="cta">거래소로 이동</router-link>
    </section>
  </main>
</template>
```

- [ ] **Step 4: 통과 확인 후 커밋**

Run: `cd web && npm test -- landing` → PASS.
```bash
git add web/src/features/landing web/test/landing.test.ts
git commit -m "feat(web): add landing page with GSAP and Spline runtime"
```

---

## PHASE C — 정리 & 배포

### Task C1: 구버전 제거 + README + 최종 빌드 검증

**Files:**
- Delete: `back-end/`, `web-front-end/`, `mobile-native/`, 루트 `node_modules/`, `readme.txt`
- Modify: `README.md`

**Interfaces:** 없음 (정리 태스크).

- [ ] **Step 1: 구버전 디렉터리 제거**

```bash
git rm -r back-end web-front-end mobile-native readme.txt
rm -rf node_modules
```

- [ ] **Step 2: README 갱신**

`README.md` (루트) — 실행법 섹션을 다음으로 교체:
```markdown
## 실행법

### 백엔드 (로컬)
cd server && npm install && npm run dev   # http://localhost:4000

### 프론트엔드 (로컬)
cd web && npm install && npm run dev       # http://localhost:3000 (REST는 :4000으로 프록시)

### 테스트
cd server && npm test
cd web && npm test

### 배포
Vercel에 루트 연결. `web`가 정적 SPA로 빌드되고 `api/`가 Fastify REST 서버리스 함수로 동작.
API 키·DB 불필요 (Upbit 공개 REST/WS 사용). 랜딩 3D 사용 시 `VITE_SPLINE_SCENE` 환경변수 설정.
```

- [ ] **Step 3: 전체 검증**

Run:
```bash
cd server && npm test && npm run build
cd ../web && npm test && npm run build
```
Expected: 모든 테스트 PASS, 양쪽 빌드 성공.

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "chore: remove legacy stacks and update README for migration"
```

---

## Self-Review (작성자 점검 결과)

- **스펙 커버리지**: 백엔드 REST 5종(A2·A3), Vercel 서버리스(A4), Vue SPA(B1), 워커 프로토콜/Upbit 구독(B2), 인-워커 RxJS throttle/통합(B3·B4), Pinia(B5), 브리지+REST(B6), 차트/호가/체결/코인리스트(B7), 랜딩 GSAP+Spline(B8), 구버전 제거·README·배포(C1) — 스펙 8개 절 전부 태스크에 매핑됨.
- **플레이스홀더**: 없음. 모든 코드 단계에 실제 코드 포함.
- **타입 일관성**: 서버 DTO와 프론트 View 타입이 동일 필드(camelCase)로 일치. 워커 `WorkerResponse.type`(B2) ↔ 브리지 분기(B6) ↔ 파이프라인 출력(B3) 채널명 일치(`ticker/orderbook/candle/trade/status`). `buildUpbitSubscription`/`createOutputStream`/`normalizeUpbit` 시그니처가 사용처와 일치.
- **주의(구현자용)**: Upbit WS는 환경에 따라 바이너리(ArrayBuffer) 프레임을 보낼 수 있어 `binaryType='arraybuffer'` + `TextDecoder`로 처리(B4 반영). `vercel.json` rewrite는 Vercel 프로젝트 설정에 따라 조정될 수 있음.
