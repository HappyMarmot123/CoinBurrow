# Upbit Feature Extensions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이전 Next.js 대비 누락된 Upbit 기능을 `/exchange`에서 사용 가능한 수준으로 복원·확장하고 서버/클라이언트 계약을 안정화한다.

**Architecture:** Fastify 라우트는 Upbit 공개 REST를 정규화해 안정적 페이로드를 제공하고, WebWorker는 실시간 채널을 정확히 매핑해 WS 구독 교착·잔류를 제거한다. Exchange 페이지는 시장 메타데이터, 타임프레임, 체결/호가 기능을 통합 UI로 노출한다.

**Tech Stack:** Vue 3, Pinia, RxJS, Fastify, Vitest

---

### Task 1: 서버/REST 계약 정비

**Files:**
- Modify: `server/src/upbit/upbitRest.ts`
- Modify: `server/src/routes/market.ts`
- Modify: `server/test/upbit-rest.test.ts`
- Modify: `server/test/routes.test.ts`

- [ ] **Step 1: Write/adjust failing tests for contract alignment**
```ts
it("fetches coin list using isDetails=false", async () => {
  // ensure /market/all?isDetails=false is called and KRW filtering works
});

it("maps market summaries to koreanName/englishName and quote only", () => {
  // no duplicated korean_name/english_name in response
});

it("supports legacy fetchCandles(market, count) and timeframe overloads", async () => {
  // legacy and new timeframe calls both map to correct endpoint
});
```

- [ ] **Step 2: Run tests and confirm red state**
```bash
npm run test --workspace coinburrow-server
```

- [ ] **Step 3: Implement minimal code changes**
- `fetchMarkets` default를 `isDetails=false`로 고정
- `resolveCandlePath`를 alias(`1M`, `1mo`)와 legacy positional args를 수용하도록 보완
- market summary 매핑에서 원본 name 필드 중복 제거

- [ ] **Step 4: Verify tests pass**
```bash
npm run test --workspace coinburrow-server
```

### Task 2: WS·REST 연동 안정화

**Files:**
- Modify: `web/src/workers/protocol.ts`
- Modify: `web/src/workers/marketSocket.worker.ts`
- Modify: `web/src/features/exchange/ExchangePage.vue`
- Modify: `web/test/protocol.test.ts`
- Modify: `web/src/api/rest.ts`
- Modify: `web/test/rest.test.ts`

- [ ] **Step 1: Add tests for candle channel subscription and market API calls**
```ts
it("builds candle.1s subscription", () => {
  // validate dynamic channel type is emitted
});

it("getCandles passes timeframe/count in query", () => {
  // 1s/1m/15m etc
});
```

- [ ] **Step 2: Run targeted tests first**
```bash
npm run test --workspace coinburrow-web -- test/rest.test.ts test/protocol.test.ts
```

- [ ] **Step 3: Implement minimal fixes**
- candle 구독 채널 해지/재구독 로직을 active 채널 기준으로 정합화
- 정규화되지 않은 채널 키를 업비트 타입으로 전달하지 않도록 방어
- 기존 호출/신규 기능 테스트 통과용 REST 폴백 정합화

- [ ] **Step 4: Verify tests pass**
```bash
npm run test --workspace coinburrow-web
```

### Task 3: Exchange 기능 확대 완료

**Files:**
- Modify: `web/src/features/exchange/ExchangePage.vue`
- Modify: `web/src/stores/*.ts`
- Update: `README.md` (endpoint/candle list 문서 반영)

- [ ] **Step 1: Add endpoint data exposure in UI**
- 시장 요약/상태/환율/심볼 메타 카드 정합화

- [ ] **Step 2: Add tests for new UI behaviors**
- 메타 데이터/상태 표시 조건 및 오류 메시지 노출 테스트

- [ ] **Step 3: 통합 검증**
```bash
npm test
```
