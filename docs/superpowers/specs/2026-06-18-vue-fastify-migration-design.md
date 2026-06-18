# CoinBurrow 마이그레이션 설계 (Vue + Fastify 서버리스)

- 작성일: 2026-06-18
- 브랜치: `migration/vue-fastify`
- 상태: 설계 확정 (구현은 Codex가 수행)

## 1. 목표와 범위

기존 스택(NestJS + Next.js + Supabase + 모바일)을 다음으로 마이그레이션한다.

- **프론트엔드**: Vue 3 + Vite + Pinia (SPA)
- **백엔드**: Node + Fastify (TypeScript), REST 전용, Vercel 서버리스 함수로 배포
- **실시간**: 프론트 Web Worker가 Upbit 공개 WebSocket에 **직결**, RxJS로 인-워커 스로틀/통합
- **배포**: Vercel 서버리스 앱(정적 SPA + `api/` 서버리스 함수)

### 제거 대상

- NestJS, Next.js
- Supabase / PostgreSQL / Drizzle
- 계정·인증(JWT, Passport), QR 로그인
- 이메일(nodemailer) 서비스
- 모바일 앱(`mobile-native/`)
- 상시 WebSocket 게이트웨이 서버 (Vercel 서버리스 비호환)
- 게임 로직(포인트·베팅·랭킹·포트폴리오) — 미구현이며 도입 계획 없음

### 비포함(YAGNI)

- 데이터 영속화(DB/스토리지) 없음. 관심종목 등은 클라이언트 `localStorage`만 사용
- API 키 불필요 (Upbit 공개 REST/WS만 사용)

## 2. 핵심 아키텍처 결정과 근거

| 결정 | 선택 | 근거 |
|---|---|---|
| 실시간 경로 | **Worker가 Upbit WS 직결** | Vercel 서버리스는 상시 stateful WS 서버를 호스팅 불가. 직결 시 상시 인프라 0·키 0이며 "Web Worker+RxJS 성능" 목표에 더 부합 |
| 백엔드 역할 | **REST 5종만** (서버리스 함수) | 요청-응답 모델이라 서버리스에 자연스럽게 매핑 |
| WS 전송 | 네이티브 WebSocket | 프론트 Worker가 Upbit 공개 WS와 직접 통신 |
| 프론트 | Vue 3 + Vite + Pinia SPA | SSR 불필요, Vite 네이티브 Web Worker 지원 |
| 설계 패턴 | 경량/고성능 | 책임연쇄·클래스 Observer 제거. RxJS는 실질 이득 있는 throttle/통합에만 사용 |
| 랜딩 3D | Spline 바닐라 런타임 | `@splinetool/react-spline`은 React 전용 → `@splinetool/runtime`으로 동일 씬을 Vue에서 렌더 |
| 테스트 | Vitest | 백엔드 REST는 Fastify `inject()`, 워커 파이프라인은 순수 모듈 단위 테스트 |

## 3. 시스템 구성도

```
                  ┌─────────────────────────────────┐
   Upbit 공개 WS ─┼──────────────┐                   │
 (wss://api.upbit │              ▼                   │
  .com/websocket) │   [Vue SPA / Web Worker]         │
                  │   · 네이티브 WebSocket 직결       │
                  │   · RxJS throttle/buffer 통합     │
                  │   · postMessage → Pinia           │
                  │              │                    │
                  │              ▼                    │
                  │   [메인 스레드: Pinia 스토어]     │
                  │   ticker/orderbook/candle/trade   │
                  │   · Highcharts / 호가 / 체결 / 랜딩│
                  └──────────────┬────────────────────┘
                                 │ REST (초기 데이터)
                                 ▼
   Upbit 공개 REST ◀── [Vercel 서버리스 함수 (Fastify)]
 (api.upbit.com/v1)     /market/coin-list · ticker · candle
                        · orderbook · trade-ticks
```

실시간 스트림은 백엔드를 거치지 않고 Worker ↔ Upbit가 직접 처리한다. 백엔드는 초기/스냅샷 REST만 담당한다.

## 4. 백엔드 설계 (Fastify, TypeScript)

### 4.1 책임

Upbit 공개 REST를 프록시·정규화하는 얇은 REST 계층. 인증·DB·상태 없음.

### 4.2 엔드포인트

| 메서드/경로 | Upbit 매핑 | 비고 |
|---|---|---|
| `GET /market/coin-list` | `/v1/market/all` | KRW 마켓 필터링 후 반환 |
| `GET /market/exchange/ticker` | `/v1/ticker?markets=` | `TARGET_COINS` 일괄 조회 |
| `GET /market/exchange/candle?market=` | `/v1/candles/minutes/1?market=&count=200` | 초기 200봉 |
| `GET /market/exchange/orderbook?market=` | `/v1/orderbook?markets=` | 스냅샷 |
| `GET /market/exchange/trade-ticks?market=` | `/v1/trades/ticks?market=&count=` | 최근 체결 |

### 4.3 모듈 구성 (경량)

| 파일 | 책임 |
|---|---|
| `src/config.ts` | `PORT`(기본 4000), `UPBIT_REST_URL`, `TARGET_COINS`. 키 없음 |
| `src/upbit/upbitRest.ts` | Upbit REST 호출(`undici`/`fetch`) + 응답 정규화 함수 |
| `src/routes/market.ts` | 위 5개 라우트 등록. 입력 검증(`zod`), Upbit 응답 → DTO 변환 |
| `src/app.ts` | `buildApp()` — Fastify 인스턴스 생성·플러그인(`@fastify/cors`)·라우트 등록. **테스트와 서버리스가 공유** |
| `src/server.ts` | 로컬 실행 진입점: `buildApp().listen({ port: PORT })` |

### 4.4 Vercel 서버리스 통합

- `api/[...path].ts` — Vercel 서버리스 진입점. `buildApp()`의 Fastify 인스턴스를 서버리스 어댑터(`@fastify/aws-lambda` 또는 `serverless-http` 계열)로 감싸 요청 위임.
- 로컬 개발: `src/server.ts`로 일반 Fastify 서버(`:4000`) 실행.
- **rate limit 주의**: 기존의 인메모리 1req/s 제한은 서버리스 인스턴스 간 공유 불가하므로 제거. Upbit 서버측 제한에 의존하고, 필요 시 함수 응답에 단기 `Cache-Control`만 부여.

### 4.5 백엔드 테스트 (Vitest)

- **REST 5종**: `buildApp()` + `app.inject()`로 호출. Upbit 상류는 `undici` `MockAgent`로 모킹하여 응답 형태·변환·에러 처리 검증.
- **정규화 함수**: Upbit 원시 응답 → DTO 변환을 순수 함수 단위 테스트.
- 수용 기준: 모든 REST 테스트가 그린이어야 프론트 작업 착수.

## 5. 프론트엔드 설계 (Vue 3 + Vite + Pinia)

### 5.1 Web Worker + RxJS (성능 핵심)

`src/workers/marketSocket.worker.ts`

- 네이티브 `WebSocket`으로 `wss://api.upbit.com/websocket/v1` 연결, `binaryType = 'arraybuffer'`.
- 자동 재연결(지수/고정 백오프), 통합 구독 메시지 관리(`[{ticket},{type,codes},...,{format}]`).
- 수신: `ArrayBuffer` → `TextDecoder` → `JSON.parse` → 타입별 분기.
- **인-워커 RxJS 스로틀/통합**:
  - `ticker`: `bufferTime`/`throttleTime`로 코드별 최신값 통합 후 1회 post
  - `orderbook`/`trade`: `throttleTime`으로 빈도 제한
  - `candle.1s`: 패스스루(필요 시 throttle)
- 메인 스레드로 타입드 `postMessage` 엔벨로프 전송. 파싱·스로틀 부하를 메인 스레드에서 분리.
- 스로틀/변환 로직은 **순수 모듈로 분리**해 Vitest fake timers로 단위 테스트.

### 5.2 브리지 & 상태

- `src/composables/useMarketSocket.ts` — 워커 ↔ Pinia 브리지. 구독/해지 명령 송신, 업데이트 수신 → 스토어 반영.
- Pinia 스토어: `tickerStore`, `orderbookStore`, `candleStore`, `tradeStore`, `marketStore`(코인 리스트).

### 5.3 화면

- **거래소 대시보드** (`/exchange`):
  - Highcharts 캔들차트(`highcharts-vue`). 초기 200봉은 백엔드 REST `/candle`, 이후 `candle.1s` 스트림으로 갱신
  - 호가창(orderbook), 체결 리스트(trade)
  - 코인 리스트/검색(`marketStore` + REST `/coin-list`), 관심종목(localStorage UI만)
- **랜딩** (`/`):
  - GSAP 애니메이션(프레임워크 무관, 그대로 이식)
  - Spline 3D 씬: `@splinetool/runtime`을 Vue 컴포넌트(`onMounted`에서 `Application` 초기화)로 렌더
- 라우팅: `vue-router` (`/` 랜딩, `/exchange` 대시보드)
- 초기 REST 호출: `fetch`

### 5.4 데이터 흐름 (대시보드 예)

```
[mounted] useMarketSocket → worker.postMessage(subscribe: ticker/orderbook/candle/trade for market)
worker → Upbit WS 구독 메시지 송신
Upbit → (binary frames) → worker(decode + RxJS throttle/통합) → postMessage
useMarketSocket → 해당 Pinia 스토어 갱신 → 컴포넌트 반응형 렌더
[unmounted] → worker.postMessage(unsubscribe) → 구독 정리
```

## 6. 저장소 구조 (Vercel 단일 프로젝트)

```
/
├─ vercel.json              # SPA fallback + /api 라우팅
├─ web/                     # Vue 3 + Vite + Pinia SPA (빌드 산출물 = 정적)
│  ├─ src/
│  │  ├─ workers/marketSocket.worker.ts
│  │  ├─ composables/useMarketSocket.ts
│  │  ├─ stores/
│  │  ├─ features/exchange/
│  │  ├─ features/landing/
│  │  └─ router/
│  └─ vite.config.ts
├─ server/                  # Fastify REST 핵심 로직 (테스트 대상)
│  ├─ src/{config,app,server}.ts
│  ├─ src/upbit/upbitRest.ts
│  ├─ src/routes/market.ts
│  └─ test/*.test.ts        # Vitest
└─ api/
   └─ [...path].ts          # Vercel 서버리스 진입 → server/src/app.buildApp() 위임
```

기존 `back-end/`, `web-front-end/`, `mobile-native/`, 루트 `node_modules`는 제거하고 루트 `README.md`를 갱신한다. 디렉터리명은 변경 가능(의미 전달용 제안값).

## 7. 작업 순서 (Codex 인계)

1. **브랜치**: `migration/vue-fastify` (생성 완료)
2. **백엔드 우선**: 스캐폴드 → `upbitRest` → 라우트 5종 → `buildApp`/`server` → **Vitest 그린 확인** → Vercel `api/` 어댑터
3. **프론트엔드**: Vite/Vue 스캐폴드 → Worker(Upbit WS + RxJS) → Pinia 스토어 → `useMarketSocket` → 대시보드 컴포넌트 → 랜딩(GSAP + Spline 런타임)
4. **정리/배포**: 구버전 디렉터리 제거, README 갱신, `vercel.json` 구성

## 8. 수용 기준

- 백엔드 REST 5종 Vitest 테스트 전부 통과(Upbit 상류 모킹).
- 워커 RxJS 스로틀/변환 로직 단위 테스트 통과.
- 대시보드에서 ticker/orderbook/candle/trade가 실시간 갱신되고, 차트에 200봉 초기 로드 + 실시간 봉 갱신 동작.
- 랜딩 페이지가 GSAP 애니메이션 + Spline 씬과 함께 렌더.
- 키·DB·계정 없이 로컬(`web` dev + `server` dev) 및 Vercel 배포에서 동작.
