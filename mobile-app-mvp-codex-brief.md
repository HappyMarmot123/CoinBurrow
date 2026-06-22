# CoinBurrow 모바일 앱 MVP — Codex 작업자 인수인계 문서

> 작성일: 2026-06-21
> 대상: 본 프로젝트의 RN + Expo 모바일 앱 MVP를 구현하는 Codex 작업자
> 전제: 웹앱(랜딩 + 거래소)과 백엔드 API는 **이미 완성**되어 있고, 모바일은 이 백엔드/데이터 모델을 **그대로 재사용**한다.

---

## 0. 이 문서를 읽는 법

이 문서 하나만 읽고도 작업을 시작할 수 있도록 작성했다. 순서대로:

1. **무엇을 만드는가** (§1 목표, §2 MVP 범위)
2. **무엇을 재사용하는가** (§3 기존 백엔드 API, §4 데이터 모델, §5 디자인 토큰) — 새로 설계하지 말고 그대로 가져다 쓴다.
3. **어떤 기술로 만드는가** (§6 기술스택, §7 프로젝트 구조)
4. **어떻게 만드는가** (§8 데이터 계층, §9 화면별 명세, §10 단계별 빌드 플랜)
5. **무엇을 조심하는가** (§11 네이티브 개발 주의사항 — **가장 중요**)
6. **참고 링크** (§12)

> ⚠️ Native 앱은 웹과 달리 "코드가 맞아도 빌드/런타임에서 깨지는" 일이 많다. §11을 먼저 한 번 통독하고 시작할 것.

---

## 1. 목표

기존 웹앱(CoinBurrow)의 핵심 경험을 모바일 네이티브 앱으로 옮긴다.

- CoinBurrow = Upbit 공개 REST/WebSocket 기반 KRW 마켓 시세 대시보드.
- 웹앱 구성: **랜딩 페이지** + **거래소 페이지**(코인 리스트 / 캔들 차트 / 호가 / 체결 / 시장 요약).
- 백엔드: Fastify REST(서버리스, Vercel 배포). 시세 실시간은 **클라이언트가 Upbit WebSocket에 직접 연결**.
- 모바일 MVP 목표: **랜딩 → 거래소(마켓 리스트) → 코인 상세(차트/호가/체결)** 의 읽기 전용 시세 앱. 주문/지갑/로그인 없음.

핵심 원칙: **백엔드는 손대지 않는다.** 모바일은 동일한 REST 엔드포인트와 동일한 Upbit WS 프로토콜을 소비한다.

---

## 2. MVP 범위

### 포함 (In scope)

| # | 화면 | 설명 | 웹 대응 |
|---|---|---|---|
| 1 | **Landing** | 앱 소개 + "거래소 시작" CTA. 3D(Spline)는 제외, 정적/Lottie 대체. | `web/src/features/landing/LandingPage.vue` |
| 2 | **Market List (거래소 홈)** | 기준통화(KRW 등) 선택, 코인 리스트 + 실시간 ticker(현재가/등락률/거래대금), 검색. | `CoinList.vue` + `ExchangeHero.vue` |
| 3 | **Coin Detail** | 선택 코인의 캔들 차트(타임프레임 전환) + 호가(Orderbook) + 체결(Trades). 실시간 갱신. | `CandleChart.vue` + `OrderbookPanel.vue` + `TradeList.vue` |

### 제외 (Out of scope, MVP 이후)

- 주문/체결 실행, 지갑, 인증/로그인.
- 웹의 Spline 3D 랜딩(런타임 무거움 → 네이티브에서 별도 검토).
- 체결 날짜별 조회(`docs/trade-ticks-date-query.md` 참고, 후속).
- 푸시 알림, 즐겨찾기 동기화(로컬 즐겨찾기는 선택적으로만).
- 다크/라이트 토글(웹은 다크 단일 테마 → 동일하게 다크 고정).

### MVP 완료 기준 (Acceptance criteria)

- [ ] iOS 시뮬레이터 + Android 에뮬레이터 + 실기기(Expo Dev Build)에서 구동.
- [ ] 마켓 리스트가 실시간 ticker로 현재가/등락률이 1초 내 갱신된다.
- [ ] 코인 상세에서 캔들/호가/체결이 모두 실시간 갱신된다.
- [ ] 백그라운드 → 포그라운드 복귀 시 WebSocket이 자동 재연결된다.
- [ ] 네트워크 끊김/복구 시 크래시 없이 자동 복구된다.
- [ ] 콜드 스타트 후 3초 내 첫 데이터 표시.

---

## 3. 재사용할 백엔드 REST API (변경 없음)

배포된 백엔드를 그대로 호출한다. **모바일에는 Vite 프록시가 없으므로 절대 URL이 필요**하다(§11.3 참고).

**API origin (확정): 배포된 Vercel URL을 사용한다.**

```
EXPO_PUBLIC_API_ORIGIN = https://coinburrow.vercel.app
```

> 운영 배포 도메인은 `https://coinburrow.vercel.app`. 저장소엔 하드코딩돼 있지 않으므로(Vercel 주입) 이 값을 모바일 `.env`의 `EXPO_PUBLIC_API_ORIGIN`에 명시한다.

**경로 라우팅(중요)** — 루트 `vercel.json`의 rewrite 규칙(아래는 의사표기, 실제 원문은 `vercel.json` 참조):

```text
/market/:path*       → /api/market (서버리스 함수)     ✅ 모바일은 이걸 호출
/api/market/:path*   → /api/market (동일 함수의 alias)
/((?!api/).*)        → /index.html (SPA fallback)
```

- 모바일은 웹과 동일하게 **`${EXPO_PUBLIC_API_ORIGIN}/market/exchange/...`** 형태로 호출하면 된다. `/market/...` rewrite가 SPA fallback보다 먼저 매칭되므로 정상적으로 API 함수로 라우팅된다.
- 로컬 백엔드(`server` 직접 실행, `:4000`)로 붙고 싶을 때만 `http://<PC LAN IP>:4000` 사용(§11.3). MVP 기본은 배포 URL.

| Method · Path | Query | 응답(요약) |
|---|---|---|
| `GET /market/coin-list` | `quote?`, `isDetails?` | `MarketView[]` |
| `GET /market/exchange/quotes` | — | `QuoteSummaryView[]` (`{ quote, marketCount }`) |
| `GET /market/exchange/markets` | `quote?`, `isDetails?` | `MarketSummaryView[]` |
| `GET /market/exchange/ticker` | — | `TickerView[]` (서버 타깃 코인) |
| `GET /market/exchange/tickers` | `markets=KRW-BTC,KRW-ETH` | `TickerView[]` |
| `GET /market/exchange/market-overview` | `markets=` | `MarketOverviewItem[]` |
| `GET /market/exchange/candle` | `market`, `timeframe`, `count`(≤200), `to?` | `CandleView[]` |
| `GET /market/exchange/orderbook` | `market` 또는 `markets`, `level?` | `OrderbookView[]` |
| `GET /market/exchange/trade-ticks` | `market`, `count`(≤200), `to?` | `TradeView[]` |
| `GET /market/exchange/market-status` | `markets?` | `Record<string,unknown>[]` |
| `GET /market/exchange/exchange-rates` | — | `Record<string,unknown>[]` (실패 시 `[]`) |

`timeframe` 허용값: `1s,1m,3m,5m,10m,15m,30m,60m,240m,1h,4h,1d,1w,1M,1mo,1y`.

> 응답은 이미 camelCase로 **정규화**되어 내려온다(Upbit raw snake_case 아님). 모바일에서 추가 매핑 불필요.

---

## 4. 재사용할 데이터 모델 (웹 `web/src/stores/types.ts` 그대로)

```ts
export interface TickerView {
  market: string;
  tradePrice: number;
  signedChangeRate: number;   // 0.0123 = +1.23%
  accTradePrice24h: number;   // 24h 누적 거래대금
}

export interface OrderbookUnitView {
  askPrice: number; bidPrice: number; askSize: number; bidSize: number;
}
export interface OrderbookView {
  market: string; timestamp: number; units: OrderbookUnitView[];
}

export interface CandleView {
  market: string; timestamp: number;
  open: number; high: number; low: number; close: number; volume: number;
}

export interface TradeView {
  market: string; price: number; volume: number;
  side: "ASK" | "BID"; timestamp: number;   // BID=매수(상승색), ASK=매도(하락색)
}

export interface MarketView {
  market: string; koreanName: string; englishName: string;
}
```

> 이 인터페이스를 모바일 앱의 `src/types/market.ts`에 **그대로 복사**해 단일 출처로 쓴다.

---

## 5. 재사용할 디자인 토큰 (웹 `_variables.scss` → RN 테마 상수)

웹은 다크 단일 테마. CSS 변수를 RN `src/theme/colors.ts` 객체로 옮긴다.

```ts
// src/theme/colors.ts
export const colors = {
  bgPage: "#111827",
  bgPageMid: "#1a2030",
  bgPageSoft: "#222f43",
  panelBg: "rgba(255,255,255,0.05)",
  panelBgStrong: "rgba(255,255,255,0.08)",
  panelBorder: "rgba(255,255,255,0.12)",
  panelLine: "rgba(255,255,255,0.14)",

  brandLime: "#d9ff66",
  brandAmber: "#ffb02e",
  brandGreen: "#a8d1a3",

  text: "#f2f0dd",
  textStrong: "#ffffff",
  textMuted: "#9fb0c6",
  textDim: "#7f8fa8",

  up: "#9be15d",          // 상승/매수
  upBg: "rgba(155,225,93,0.14)",
  down: "#ffb02e",        // 하락/매도 (주의: 빨강이 아니라 앰버)
  downBg: "rgba(255,176,46,0.14)",
  flat: "#9fb0c6",
} as const;

export const radius = { md: 14, sm: 8 } as const;
```

> ⚠️ 색 규칙이 한국 거래소 관습(상승=빨강)과 다르다. **상승=라임그린(`up`), 하락=앰버(`down`)**. 웹과 통일할 것.

폰트: 웹은 Inter. 모바일은 `expo-font` + `@expo-google-fonts/inter` 또는 시스템 폰트로 대체(MVP는 시스템 폰트 허용).

숫자 포맷 규칙(웹 `utils/format.ts`와 동일하게 이식):
- 가격: `Intl.NumberFormat("ko-KR")` + 반올림.
- 등락률: `(rate*100).toFixed(2) + "%"`.
- 거래대금 compact: `1.2T / 3.4B / 5.6M / 7.8K`.
- 체결 시각: `HH:mm:ss` (ko-KR). → §11.6 Intl 주의사항 참고.

---

## 6. 기술스택 (버전 고정)

기준일 2026-06-21 권장 조합(`Documents/Codex/2026-06-21/RN, Expo ... 추천 기술스택.md`):

```json
{
  "expo": "~56.0.0",
  "react-native": "0.85.x",
  "react": "19.2.3",
  "node": "22.13.x"
}
```

> Node는 **최소 20.19.4**(SDK 56이 그 미만 드롭), **권장 22.13.x**(§11.11과 동일 기준).

부트스트랩:

```bash
npx create-expo-app@latest mobile      # 프로젝트명 mobile (모노레포 시 루트/mobile)
cd mobile
npx expo install --fix                  # SDK 56이 검증한 버전으로 정렬
```

### 라이브러리 선정 (역할별)

| 역할 | 채택 | 이유 / 비고 |
|---|---|---|
| 네비게이션 | **Expo Router**(파일 기반) | SDK 56 기본. ⚠️ `@react-navigation/*` 직접 import 깨짐(§11.2) |
| 서버 상태/캐싱 | **TanStack Query v5** | REST 캐싱·refetch·로딩/에러 일원화 |
| 클라이언트 상태 | **Zustand** | 웹의 Pinia store에 1:1 대응. 실시간 ticker/orderbook/candle/trade 보관 |
| 실시간 스트림 가공 | **RxJS 7** | 웹 `pipeline.ts`를 거의 그대로 이식(§8.2). RN에서 정상 동작 |
| 캔들 차트 | **react-native-wagmi-charts** (1차) / Skia kline (성능 필요 시) | Highcharts(웹) 대체. wagmi가 진입장벽 낮음 |
| 차트 의존성 | `react-native-reanimated`, `react-native-gesture-handler` | wagmi 필수 peer. Expo Router도 gesture-handler 사용 |
| 리스트 성능 | **@shopify/flash-list** | 코인 리스트/체결 리스트 대량 렌더 |
| UUID/난수 | **react-native-get-random-values** 또는 **expo-crypto** | `crypto.randomUUID` 폴리필(§11.4) |
| 텍스트 디코딩 | **TextDecoder 폴리필** (예: `@bacons/text-decoder`) | Upbit WS 바이너리 프레임 디코딩(§11.5) |
| 환경변수 | Expo `EXPO_PUBLIC_*` | `EXPO_PUBLIC_API_ORIGIN` |
| 빌드 | **EAS Build** + **Dev Build** | 네이티브 모듈(reanimated/skia) 때문에 Expo Go로는 부족(§11.1) |

> **상태관리 원칙**: "서버에서 한 번 받아오는 것"(코인 리스트, 초기 캔들/호가/체결, 마켓 메타) = **TanStack Query**. "WS로 계속 흘러드는 실시간 갱신" = **Zustand store**. 둘을 섞지 말 것.

### 의존성 설치 (M0)

버전은 `expo install`이 SDK 56에 맞춰 정렬하므로 **수동 고정하지 말 것**. 아래는 설치 명령:

```bash
# 네이티브 모듈은 반드시 expo install로 (버전 정렬)
npx expo install react-native-reanimated react-native-gesture-handler \
  react-native-screens react-native-safe-area-context \
  @shopify/flash-list expo-linear-gradient expo-font react-native-svg

# 폴리필 (Hermes 누락 대응 — §11.4 / §11.5)
npx expo install react-native-get-random-values expo-crypto
npm i @bacons/text-decoder

# 순수 JS 라이브러리는 npm 설치
npm i @tanstack/react-query zustand rxjs react-native-wagmi-charts
```

> `react-native-wagmi-charts`는 reanimated + gesture-handler + svg를 peer로 요구한다. 위 순서대로 설치하면 충족된다.

---

## 7. 프로젝트 구조 (제안)

```
mobile/
  app/                          # Expo Router 라우트
    _layout.tsx                 # Root: QueryClientProvider, 폰트, 테마, WS 부트스트랩
    index.tsx                   # Landing
    exchange/
      _layout.tsx               # 거래소 스택 레이아웃
      index.tsx                 # Market List (기준통화 + 코인 리스트)
      [market].tsx              # Coin Detail (예: /exchange/KRW-BTC)
  src/
    api/
      client.ts                 # fetch 래퍼 (web/src/api/rest.ts 이식)
      rest.ts                   # getCoinList/getCandles/... (web과 동일 시그니처)
    realtime/
      protocol.ts               # web/src/workers/protocol.ts 이식 (구독 메시지 빌더)
      pipeline.ts               # web/src/workers/pipeline.ts 이식 (RxJS 정규화/throttle)
      socketService.ts          # 싱글톤 WebSocket 서비스 (Web Worker 대체, §8.2)
    stores/
      ticker.ts orderbook.ts candle.ts trade.ts   # Zustand (web Pinia 이식)
    hooks/
      useMarketSocket.ts        # 구독/해제 + store 연결 (web composable 이식)
      useExchangeData.ts        # 화면 데이터 조합
    types/market.ts             # §4 데이터 모델
    theme/colors.ts             # §5 토큰
    utils/format.ts             # 숫자/시간 포맷 (web 이식)
    components/                  # CoinRow, OrderbookTable, TradeRow, CandleChart 등
  app.json / app.config.ts
  eas.json
  .env                          # EXPO_PUBLIC_API_ORIGIN=...
```

> 웹의 `web/src/` 구조와 **의도적으로 1:1 대응**시켰다. 이식이 쉽고, 향후 두 코드베이스 동기화가 수월하다.

### 7.1 모노레포 배치: `/mobile`은 **독립 패키지**로 둔다 (루트 workspaces 미등록)

repo 루트에 `/mobile` 디렉토리를 만들어 모노레포로 관리한다. 단, **npm workspace로 링크하지는 않는다.** 이것이 RN+웹 혼합 repo에서 Vercel 충돌과 Metro 해석 문제를 동시에 피하는 정석이다.

- Codex는 **전체 repo에 접근 가능**하므로, 웹 파일(`web/src/...`)을 직접 열어 이식한다. 별도 복붙 불필요 — 경로만 정확히.
- ⚠️ 루트 `package.json`의 `workspaces: ["server","web"]` 와 Vercel 빌드(`npm run build --workspaces --if-present`)가 있다. **`mobile`을 root `workspaces`에 추가하면**:
  1. Vercel이 모바일까지 빌드하려다 실패/낭비.
  2. npm hoisting이 RN 네이티브 모듈을 루트 `node_modules`로 끌어올려 **Metro 해석이 깨진다**(대표적 모노레포 RN 함정).
- 충돌은 "모노레포라서"가 아니라 **workspaces 등록 시에만** 발생한다. 아래대로 두면 충돌 0:

| 항목 | 설정 |
|---|---|
| `/mobile` | 자체 `package.json` + 자체 `node_modules` + 자체 lockfile. **루트 `workspaces` 미등록.** |
| 루트 `package.json` | `["server","web"]` **그대로** (수정 없음) |
| `vercel.json` | `outputDirectory: web/dist` / `rewrites` **그대로** (수정 없음) |
| `.vercelignore` | `mobile/` 추가 → 배포 업로드 제외(경량화·오탐 방지) |
| `vercel.json` `ignoreCommand`(선택) | 모바일만 바뀐 커밋은 웹 재배포 스킵 |

**`.vercelignore`** (루트에 생성):

```
mobile/
```

**`vercel.json` `ignoreCommand`** (선택, 모바일-only 커밋 시 웹 배포 스킵 — Vercel: exit 1=빌드, exit 0=스킵):

```jsonc
// 기존 vercel.json에 한 줄 추가
"ignoreCommand": "git diff --quiet HEAD^ HEAD -- web server api apiBridge.ts vercel.json package.json"
```
> web/server/api 등이 변경되면 빌드, `/mobile`만 변경되면 스킵. 배포 입력 경로가 늘면 이 목록도 갱신할 것.

- EAS 빌드는 `/mobile`에서 독립적으로 실행되어 Vercel과 완전히 분리된다.
- **대안(비추천 for MVP)**: Turborepo/완전 workspace 모노레포는 Metro `watchFolders` + nohoist 설정이 추가로 필요해 과하다. MVP는 위 "독립 패키지" 방식 고정.

### 7.2 필수 설정 파일 실물

**`babel.config.js`** — reanimated plugin은 **반드시 배열 맨 끝**(누락 시 런타임 크래시, §11.9):

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-reanimated/plugin"], // ← 항상 마지막
  };
};
```

**`app.json`** (발췌) — New Arch 유지 + 플러그인:

```jsonc
{
  "expo": {
    "name": "CoinBurrow",
    "slug": "coinburrow",
    "scheme": "coinburrow",
    "newArchEnabled": true,            // SDK 56 기본. 차트 호환 깨지면 M0에서만 false 검토
    "plugins": ["expo-router", "expo-font"],
    "ios": { "supportsTablet": false, "bundleIdentifier": "com.coinburrow.app" },
    "android": { "package": "com.coinburrow.app" }
  }
}
```

**`eas.json`** — 개발은 Dev Build 프로필로(§11.1):

```jsonc
{
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview":     { "distribution": "internal" },
    "production":  {}
  }
}
```

**`.env`**:

```
EXPO_PUBLIC_API_ORIGIN=https://coinburrow.vercel.app
```

**폴리필 import 위치** — 앱 진입점(`app/_layout.tsx`) **최상단**, 다른 import보다 먼저:

```ts
import "react-native-get-random-values";   // crypto.getRandomValues
import "@bacons/text-decoder/install";      // TextDecoder (라이브러리별 설치법 확인)
```

---

## 8. 데이터 계층 설계 (핵심)

### 8.1 REST 클라이언트

웹 `web/src/api/rest.ts`를 거의 그대로 이식하되, **base URL만 절대 경로로** 바꾼다.

```ts
// src/api/client.ts
const API_ORIGIN = process.env.EXPO_PUBLIC_API_ORIGIN!.replace(/\/+$/, "");

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_ORIGIN}${path}`);
  if (!res.ok) throw new Error(`failed ${path} (${res.status})`);
  return (await res.json()) as T;
}
```

`getCoinList / getCandles / getOrderbookSnapshot / getTradeSnapshot / getMarketSummaries / getAvailableQuotes` 등은 웹과 동일 시그니처로 복사. 쿼리스트링 빌더(`buildPath`/`buildQueryParams`)도 그대로 가져온다.

TanStack Query로 감싼다:

```ts
useQuery({ queryKey: ["coinList", quote], queryFn: () => getCoinList({ quote }) });
useQuery({ queryKey: ["candles", market, tf, count], queryFn: () => getCandles(market, { timeframe: tf, count }) });
```

### 8.2 실시간 WebSocket 서비스 — Web Worker를 대체하는 가장 까다로운 부분

**웹 구조**: `marketSocket.worker.ts`(Web Worker) 안에서 Upbit WS 연결 → `pipeline.ts`(RxJS)로 정규화/스로틀 → `postMessage`로 메인 스레드 store에 전달.

**RN에는 DOM Web Worker가 없다.** 대신 **JS 스레드의 싱글톤 서비스**로 구현한다. RxJS와 정규화 로직(`protocol.ts`, `pipeline.ts`)은 **그대로 재사용**한다.

이식 매핑:

| 웹 | 모바일 |
|---|---|
| `marketSocket.worker.ts` | `src/realtime/socketService.ts` (싱글톤 모듈, Worker 아님) |
| `worker.postMessage(response)` | RxJS `Subject` 구독 → Zustand store 액션 호출 |
| `self.onmessage`(구독 명령) | `socketService.subscribe(channel, markets)` 메서드 |
| `crypto.randomUUID()` | 폴리필 필요(§11.4) |
| `new TextDecoder()` | 폴리필 필요(§11.5) |

서비스 골격:

```ts
// src/realtime/socketService.ts
import "react-native-get-random-values";          // crypto.getRandomValues 폴리필 (가장 위)
import { Subject } from "rxjs";
import { buildUpbitSubscription, type Channel } from "./protocol";
import { createOutputStream } from "./pipeline";    // web pipeline.ts 그대로
import { AppState } from "react-native";

const UPBIT_WS_URL = "wss://api.upbit.com/websocket/v1";
const subs: Record<string, Set<string>> = { ticker: new Set(), orderbook: new Set(), candle: new Set(), trade: new Set() };
const raw$ = new Subject<any>();
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

createOutputStream(raw$).subscribe(routeToStores);   // store 액션으로 분기

function connect() {
  ws = new WebSocket(UPBIT_WS_URL);
  ws.binaryType = "arraybuffer";                      // ⚠️ §11.5
  ws.onopen = () => sendSubscription();
  ws.onmessage = (e) => {
    const text = typeof e.data === "string"
      ? e.data
      : new TextDecoder().decode(e.data as ArrayBuffer);  // ⚠️ §11.5 폴리필
    try { raw$.next(JSON.parse(text)); } catch {}
  };
  ws.onclose = () => scheduleReconnect();
  ws.onerror = () => ws?.close();
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => { reconnectTimer = null; connect(); }, 3000);
}

// 백그라운드 → 포그라운드 복귀 시 재연결 (§11.7)
AppState.addEventListener("change", (s) => {
  if (s === "active" && ws?.readyState !== WebSocket.OPEN) connect();
});
```

`routeToStores`는 웹 `useMarketSocket.ts`의 분기 로직과 동일:
- `ticker` → `tickerStore.applyTicker(...)`
- `orderbook` → `orderbookStore.applyOrderbook(...)`
- `candle*` → `candleStore.applyCandle(...)`
- `trade` → `tradeStore.applyTrade(...)`

**스로틀 파라미터 유지**: `pipeline.ts`의 ticker `bufferTime(100)`, 기타 `throttleTime(100)`은 모바일 성능에도 적합하니 유지. 오히려 저사양 기기에선 ticker buffer를 150~200ms로 올려도 됨.

### 8.3 Zustand store (웹 Pinia 이식)

웹 store 4종을 Zustand로 옮긴다. 로직 동일:

- `ticker`: `byMarket: Record<string, TickerView>` 맵. `applyTicker(list)`로 덮어쓰기.
- `orderbook`: `current: OrderbookView | null`. `applyOrderbook(item)`.
- `candle`: 배열. `setInitial(list)` + `applyCandle(item)`(같은 timestamp면 갱신, 새 timestamp면 push, 최대 개수 유지).
- `trade`: `recent: TradeView[]` 최근 50건. `setInitial` + `applyTrade(unshift, cap 50)`.

> ⚠️ **고빈도 갱신 시 리렌더 폭주 주의**(§11.8). Zustand selector를 좁게 쓰고, 리스트는 FlashList + `React.memo` 행 컴포넌트로.

---

## 9. 화면별 명세

### 9.1 Landing (`app/index.tsx`)

- 웹 `LandingPage.vue` 대응. 단, **Spline 3D 제외**.
- 구성: 로고/타이틀("CoinBurrow"), 한 줄 소개, "거래소 시작" 버튼 → `router.push("/exchange")`.
- 배경: §5 다크 그라데이션(`expo-linear-gradient`).
- 선택: 가벼운 Lottie 또는 정적 일러스트.

### 9.2 Market List (`app/exchange/index.tsx`)

웹 `ExchangePage.vue`의 사이드바(`CoinList.vue`) + `ExchangeHero` 역할.

- 상단: 기준통화 선택(KRW/BTC/USDT…) — `getAvailableQuotes()`.
- 본문: `getCoinList({ quote })`로 코인 목록 → **FlashList**.
  - 각 행(`CoinRow`): 한글명/심볼, 현재가, 등락률(색), 24h 거래대금(compact).
  - 현재가/등락률은 **Zustand ticker store**에서 실시간 구독(`tickerStore.byMarket[market]`).
- 검색: 한글명/심볼 필터(웹 `CoinList.vue`의 검색 로직 이식).
- 구독 관리: 화면 진입 시 보이는 마켓들 `subscribe("ticker", markets)`, 이탈 시 `unsubscribe`. (웹 `loadMarketsByQuote`의 diff 구독 로직 참고)
- 행 탭 → `router.push("/exchange/" + market)`.

> 성능: 전체 코인 ticker를 한꺼번에 구독하면 프레임에 부하. MVP는 **화면 보이는 마켓만 구독**하거나, 최소한 ticker buffer로 흡수. (§11.8)

### 9.3 Coin Detail (`app/exchange/[market].tsx`)

웹 `CandleChart.vue` + `OrderbookPanel.vue` + `TradeList.vue` 통합.

- 진입 시:
  1. `getCandles(market, { timeframe, count })` → candle store `setInitial`.
  2. `getOrderbookSnapshot(market)` → orderbook store.
  3. `getTradeSnapshot(market, { count: 50 })` → trade store `setInitial`.
  4. `subscribe("orderbook"|"trade"|"candle.<tf>", [market])`.
- **캔들 차트**: `react-native-wagmi-charts` Candlestick. 타임프레임 탭(1m/3m/5m/15m/30m/1h/4h/1d) — 웹 `primaryTimeframeOptions`와 동일 셋.
  - **데이터 매핑**: wagmi는 `{ timestamp, open, high, low, close }[]` 를 요구. `CandleView`가 이미 동일 필드를 가지므로 `volume`만 빼고 거의 1:1. 예: `candles.map(c => ({ timestamp: c.timestamp, open: c.open, high: c.high, low: c.low, close: c.close }))`.
  - **타임프레임 변경 시**: 캔들 재조회(REST) + WS 구독 채널 교체. 웹 `resolveCandleSubscriptionChannel` 매핑 그대로(`1h→candle.60m`, `4h→candle.240m` 등).
  - ⚠️ **일봉 이상(`1d/1w/1M/1y`)은 WS 캔들 채널이 없다**(웹 매핑이 `null` 반환). 이 경우 **실시간 캔들 구독을 하지 않고 REST 초기 로드만** 표시한다. ticker로 마지막 캔들 close만 갱신하는 정도는 선택.
- **호가(Orderbook)**: 매도(ask)/매수(bid) 양쪽 호가 테이블. 색: ask=down(앰버), bid=up(라임). 스프레드 표시.
- **체결(Trades)**: 최근 50건 리스트. 시각/매수매도/수량/가격. 첫 행 flash 애니메이션(선택, reanimated).
- 이탈 시: 해당 market의 orderbook/trade/candle 구독 해제(웹 `unsubscribeMarket` 이식).

---

## 10. 단계별 빌드 플랜 (마일스톤)

> 각 단계 끝에서 **반드시 실기기 또는 Dev Build로 실행 확인**. 시뮬레이터만 믿지 말 것(§11).

- **M0 — 부트스트랩 & 인프라**
  - `create-expo-app` → Expo Router 템플릿. `expo install --fix`.
  - reanimated/gesture-handler/flash-list/wagmi-charts 설치 + 폴리필(get-random-values, TextDecoder).
  - **Dev Build** 1회 생성(EAS) → Expo Go 한계 확인.
  - `.env`에 `EXPO_PUBLIC_API_ORIGIN` 설정, REST 1개(`getAvailableQuotes`) 호출로 네트워크 경로 검증.
  - ✅ 체크: 빈 화면에서 API 응답 1건 콘솔 출력.

- **M1 — 데이터 계층**
  - `types/`, `api/rest.ts`, `theme/colors.ts`, `utils/format.ts` 이식.
  - Zustand store 4종 이식.
  - `realtime/` 3종(protocol/pipeline/socketService) 이식 + 폴리필 결선.
  - ✅ 체크: socketService 단독 구동 → ticker 로그가 흐른다(아직 UI 없이).

- **M2 — Market List**
  - 기준통화 + FlashList + 실시간 ticker 바인딩 + 검색.
  - 구독/해제 라이프사이클.
  - ✅ 체크: 현재가/등락률 실시간 갱신, 스크롤 60fps 근접.

- **M3 — Coin Detail**
  - 캔들(wagmi) + 타임프레임 전환 + 호가 + 체결, 모두 실시간.
  - ✅ 체크: 4개 데이터 동시 실시간 갱신, 차트 제스처 동작.

- **M4 — Landing & 마감**
  - 랜딩 + 네비게이션 연결.
  - 백그라운드 복귀 재연결, 네트워크 토글, 콜드스타트 시간 측정.
  - iOS/Android 양쪽 Dev Build QA.
  - ✅ §2 Acceptance criteria 전부 통과.

---

## 11. 네이티브 개발 주의사항 (가장 중요)

> Native는 "코드는 맞는데 안 되는" 경우가 잦다. 아래는 이 프로젝트에서 **거의 확실히 부딪힐** 항목들이다.

### 11.1 Expo Go로는 부족하다 → Dev Build 필수
- `react-native-reanimated`, `react-native-gesture-handler`, Skia, wagmi-charts 등 네이티브 모듈이 들어가면 Expo Go에서 누락/버전 불일치로 깨진다.
- **처음부터 EAS Dev Build**로 개발할 것. `eas build --profile development`.
- SDK 56은 **New Architecture가 기본 ON**. 일부 서드파티가 미대응일 수 있으니, 차트 라이브러리 호환을 M0에서 먼저 확인. 깨지면 `app.json`에서 `newArchEnabled` 조정 검토(가능하면 New Arch 유지).

### 11.2 Expo Router import 함정
- SDK 56부터 Expo Router가 네비게이션 프리미티브를 포크함. **`@react-navigation/*`를 직접 import 하면 깨진다.** 네비게이션은 Expo Router API(`useRouter`, `Link`, `Stack`)만 사용.

### 11.3 API base URL — 프록시 없음 + localhost 함정
- 웹은 Vite 프록시(`/market → :4000`)로 상대경로를 썼지만 **모바일엔 프록시가 없다.** 반드시 `EXPO_PUBLIC_API_ORIGIN` 절대 URL.
- **`localhost`/`127.0.0.1`는 실기기에서 PC를 가리키지 않는다.**
  - Android 에뮬레이터: `http://10.0.2.2:4000`.
  - iOS 시뮬레이터: `http://localhost:4000` 가능.
  - 실기기: **PC의 LAN IP**(`http://192.168.x.x:4000`) + 같은 와이파이. 가장 확실한 건 **배포된 Vercel URL** 사용.
- iOS는 ATS로 평문 HTTP 차단 가능 → 개발 중엔 HTTPS(배포 URL) 권장. 평문 필요 시 `app.json`의 ATS 예외 설정.

### 11.4 `crypto.randomUUID()` 없음
- 웹 `protocol.ts`의 `buildUpbitSubscription`이 `crypto.randomUUID()`로 ticket을 만든다. **Hermes에 기본 없음.**
- 해결: 진입점 최상단에 `import "react-native-get-random-values";` 후 `uuid` 또는 `expo-crypto`의 `randomUUID()` 사용. 이식 시 `protocol.ts`의 해당 호출을 교체.

### 11.5 `TextDecoder` 없음 + WS 바이너리 프레임
- Upbit WS는 **바이너리 프레임**을 보낸다. 웹 워커는 `new TextDecoder().decode(arrayBuffer)`로 처리.
- **Hermes에 `TextDecoder` 기본 없음.** 폴리필 필요(예: `@bacons/text-decoder`, `fast-text-encoding`).
- 추가로 RN의 `ws.binaryType = "arraybuffer"`가 일부 환경에서 **여전히 Blob을 돌려주는 알려진 버그**가 있다(검색 결과 참조). 방어 코드:
  - `arraybuffer`가 동작하지 않으면 `binaryType` 미설정 + `Blob` 경로(`blob.arrayBuffer()` 또는 FileReader) 폴백을 준비.
  - **M1에서 Upbit 프레임 디코딩을 가장 먼저 검증**할 것. 여기서 막히면 전체가 막힌다.

### 11.6 `Intl.NumberFormat("ko-KR")` 로케일 데이터
- Hermes는 `Intl`을 점점 지원하지만 **빌드 설정에 따라 ko-KR 로케일 데이터가 없어** 포맷이 어긋날 수 있다.
- 해결: Hermes Intl 활성 확인, 안 되면 `Intl` 폴리필 또는 **수동 포맷 함수**(천단위 콤마 직접 구현)로 대체. `utils/format.ts` 이식 시 로케일 의존을 줄여라.

### 11.7 백그라운드/포그라운드 & WS 수명
- 모바일은 백그라운드 진입 시 OS가 소켓을 끊는다. 복귀(`AppState "active"`) 시 **재연결 + 재구독** 필수.
- 재연결 시 기존 `subs` Set을 유지했다가 `sendSubscription()`으로 복원(웹 워커가 이미 이렇게 함 — 그대로 이식).
- 재연결 폭주 방지: 지수 백오프 또는 최소 3s 간격(현재 웹 3s 고정도 무방).

### 11.8 고빈도 실시간 갱신 → 리렌더/프레임 드랍
- ticker는 초당 수십 건. **store를 그대로 컴포넌트에 넓게 구독하면 리스트 전체가 리렌더**된다.
- 대책:
  - Zustand selector를 **행 단위로 좁게**(`s => s.byMarket[market]`).
  - 리스트는 **FlashList** + 행 컴포넌트 `React.memo`.
  - `pipeline.ts`의 `bufferTime(100)`/`throttleTime(100)` 유지(필요 시 저사양 기기에서 상향).
  - 차트는 매 틱 갱신하지 말고 throttled candle만 반영.

### 11.9 reanimated / gesture-handler 설정 누락
- `react-native-reanimated`는 **babel plugin**(`react-native-reanimated/plugin`)을 `babel.config.js` **맨 마지막**에 추가해야 함. 누락 시 런타임 크래시.
- `react-native-gesture-handler`는 진입점에서 import 순서 중요. Expo Router 사용 시 대개 자동 처리되나 확인.
- wagmi-charts는 reanimated v3 + gesture-handler 동시 요구 → 버전 정렬은 `expo install`로.

### 11.10 New Architecture 호환
- SDK 56 New Arch 기본. 차트/리스트 라이브러리가 미대응이면 흰 화면/크래시.
- M0에서 **각 네이티브 라이브러리를 빈 화면에 하나씩** 올려 호환 확인 후 진행.

### 11.11 빌드 환경
- Xcode 26.4+, iOS 최소 16.4, Node 20.19.4+ (권장 22.13+), TypeScript 6.0.3. 로컬 iOS 빌드 막히면 **EAS 클라우드 빌드** 사용.

### 11.12 기타
- 웹의 RxJS는 RN에서 정상 동작하니 그대로 써도 된다(별도 폴리필 불필요).
- `setTimeout` 기반 재연결 타이머는 백그라운드에서 throttle될 수 있음 → `AppState` 신호를 1차 트리거로.
- 실기기 디버깅은 콘솔만 믿지 말고 **Reactotron/Flipper 대체(Expo DevTools)** 로 네트워크/WS 가시화.

---

## 12. 참고 링크 (사전 조회 완료, 2026-06-21 기준)

### Expo SDK 56 / RN 0.85
- Expo SDK 56 Changelog — https://expo.dev/changelog/sdk-56
  - 핵심: RN 0.85 + React 19.2, New Arch 기본, iOS JSI 개선, Android Kotlin 컴파일러 플러그인(콜드스타트 ~40%↓), TS 6.0.3, iOS 최소 16.4, **Node 20.19.4 미만 드롭**, Expo Router의 React Navigation 포크(직접 import 주의).
- Expo SDK 56 정리(요약 기사) — https://dev.to/davekurian/react-native-ecosystem-advances-with-expo-sdk-56-and-react-192-updates-in-2026-3df5

### 차트
- react-native-wagmi-charts — https://github.com/coinjar/react-native-wagmi-charts (line/candlestick, reanimated+gesture-handler+haptic 의존)
- Skia kline(고성능 대안) — https://reactscript.com/skia-candlestick-chart-kline/
- react-native-kline-view(60fps 트레이딩용) — https://github.com/hellohublot/react-native-kline-view
- 2026 차트 라이브러리 개요 — https://reactscript.com/tag/candlestick-chart/

### WebSocket (RN)
- RN `binaryType='arraybuffer'`가 Blob 반환하는 이슈 — https://github.com/microsoft/react-native-windows/issues/12482
- RN 바이너리 수신 이슈 — https://github.com/facebook/react-native/issues/26488
- reconnecting-websocket(Web/RN) — https://github.com/pladaria/reconnecting-websocket
- RN WebSocket 실시간 가이드(2026) — https://oneuptime.com/blog/post/2026-01-15-react-native-websockets/view

### 상태/네비/데이터
- TanStack Query — React Native 가이드 — https://tanstack.com/query/latest/docs/framework/react/react-native
- Expo Router + TanStack Query 예제 — https://dev.to/arshadayvid/building-a-news-app-with-react-native-expo-router-and-tanstack-query-48ck

### 내부 문서 / 코드 (재사용 출처)
- 백엔드 라우트: `server/src/routes/market.ts`, Upbit 클라이언트: `server/src/upbit/upbitRest.ts`
- 웹 데이터 모델: `web/src/stores/types.ts`
- 웹 실시간(이식 대상): `web/src/workers/{protocol,pipeline,marketSocket.worker}.ts`, `web/src/composables/useMarketSocket.ts`
- 웹 디자인 토큰: `web/src/styles/_variables.scss`
- 웹 포맷 유틸: `web/src/utils/format.ts`
- 버전 권장: `Documents/Codex/2026-06-21/RN, Expo 가장 최신버전과 버전 조합 추천 기술스택.md`
- 후속 기능(체결 날짜별 조회): `docs/trade-ticks-date-query.md`

---

## 13. 한 줄 요약

**Expo SDK 56 / RN 0.85 / React 19.2 + Expo Router + Zustand + TanStack Query + RxJS(웹 pipeline 이식) + wagmi-charts**로, 기존 백엔드/Upbit WS를 그대로 소비하는 읽기 전용 시세 앱(랜딩 → 마켓 리스트 → 코인 상세)을 만든다. 가장 큰 리스크는 **Web Worker 부재(→싱글톤 WS 서비스)와 Hermes 폴리필(TextDecoder/crypto)·바이너리 프레임 디코딩**이니, M0~M1에서 이것부터 검증하라.

## 14. 2026 보완 체크리스트 (반영 우선순위)

### 14.1 필수 (MVP 직후 우선 적용)
- [ ] **공통 에러 정책 정의**: REST/WS 오류(타임아웃, 4xx/5xx, 파싱 실패, WS disconnect)를 분류하고 사용자 노출 메시지, 재시도 정책, 로깅 정책을 통합한다.
- [ ] **네트워크 상태 기반 동작 정의**: `AppState`/`NetInfo` 기반 오프라인 폴백, 마지막 캐시 사용, 다시 온라인 복귀 시 데이터 재동기화 정책을 명시한다.
- [ ] **지표(모니터링) 계약**: 앱 크래시, 화면 전환 지연, 렌더프레임(60fps 목표), WS 재연결 횟수, API 에러율을 추적한다.
- [ ] **캐시/동기화 규칙 확정**: `market`/`ticker`는 기본적으로 1~3초 stale window, 상세 데이터는 `stale-while-revalidate` 정책으로 처리한다.
- [ ] **로컬 영속성 최소화**: API 조회 이력(`queryKey`)와 사용자 설정(quote, 기간 선택, 가격 포맷)만 영속화하고 민감 데이터는 저장하지 않는다.
- [ ] **접근성/국제화 점검**: 다크모드 대비 색 대비, 터치 타겟 44pt 이상, 화살표/색상에만 의존한 상승/하락 구분 제거, 숫자 포맷 로케일 통일(`ko-KR`, UTC 보정) 처리.
- [ ] **보안(모바일 배포 전)**: `EXPO_PUBLIC_*`에 비밀값 미포함, 최소 권한만 요청, iOS ATS/Android 네트워크 정책 및 릴리스 빌드 프로가드/난독화 계획을 반영한다.

### 14.2 권장 (차기 스프린트)
- [ ] **단위/통합 테스트 우선순위 확정**: `api` 클라이언트, 타입 변환/포맷터, WS 파싱 파이프라인, 핵심 훅 훅(구독/구독해제) 중심으로 테스트를 추가한다.
- [ ] **차트/실시간 성능 고도화**: candle 버퍼 크기, 주문/체결 이벤트 샘플링, `FlashList` 항목 key 정책을 문서화해 1000개 이벤트/분에서 부하 테스트를 수행한다.
- [ ] **API 계약 검증 자동화**: server ↔ web ↔ mobile 타입이 동일하도록 OpenAPI/JSON Schema 기반 계약 테스트를 도입한다.
- [ ] **운영성 보강**: CI에서 iOS/Android 빌드 실패 시 자동 알림, 릴리스 노트 템플릿, 버전/빌드 번호 정책을 codex로 고정한다.

### 14.3 선택 (향후)
- [ ] 사용자 계정/관심 목록, 위젯, 푸시 알림을 추가할 때는 백엔드가 동일한 폴더 분리 규칙(예: `features/`)을 따르도록 확장한다.
- [ ] 실시간 알림을 위해 background sync 필요 시 `Headless JS`/`Expo TaskManager` 도입 여부를 검토한다.

## 15. 2026 최신 트렌드 반영안 (아키텍처/디자인패턴)

### 15.1 아키텍처 트렌드 반영
- **Expo SDK 56 기준 권장 변경**
  - Expo Router는 더 이상 앱 코드에서 외부 `@react-navigation/*` 임포트를 지원하지 않으므로 라우팅은 SDK 56 규격에 맞춘 `expo-router` API로 통일한다. (`expo-router` docs 기준)
  - Hermes bytecode diffing 기본 적용, 빌드 성능 개선 항목이 있는 56.x 시점 기준으로 `expo build/prebuild` 설정을 경량화한다.
- **React Native New Architecture / Hermes 고도화 기반 설계**
  - React Native 0.85는 New Animation Backend(Animated/Reanimated 병렬 개선)와 관련 성능 개선이 핵심이므로, 애니메이션·차트 렌더링은 렌더 스레드 경합 최소화를 염두에 두고 설계한다.
  - 향후 업그레이드 대비해 모듈 호출은 브릿지 지향 설계가 아닌 JSI/TurboModules 특성의 비용 모델을 전제로 분리한다.
- **서버 상태/클라이언트 상태 분리 강화**
  - `TanStack Query`는 서버 상태 캐시를 맡기고, `Zustand`는 UI 상태(필터, 탭, 선택된 타임프레임)를 담당한다. 지금 설계에서의 역할 분리를 문서화하고, Query staleTime/GC 정책을 화면별로 조정한다.
- **레이어드 + 피처 기반 모듈화**
  - `features/exchange`, `features/landing`처럼 기능 단위 폴더를 기준으로 책임을 분리하고, `data/domain/ui` 경계를 둬 유지보수 비용을 낮춘다.
- **오프라인 퍼스트 경량화**
  - 실시간 시세는 100% 실시간 동기화보다 “핫 경로는 실시간, 나머지는 캐시 우선”으로 설계한다. 재방문 화면에서 즉시 렌더링 가능한 캐시 레이어(메모리 + 디스크) 전략을 추가한다.

### 15.2 2026용 디자인 패턴 권고
- **UDF + MVI/Reducer 패턴(부분 도입)**: Market/Detail 화면은 `state + event + reducer` 형태의 단방향 이벤트 흐름으로 정리한다.
- **Repository + UseCase 분리**: API/WS 소스 접근은 `repository`에서 캡슐화하고, 화면에서 직접 fetch/subscribe 로직을 직접 호출하지 않게 한다.
- **Facade/Adapter 패턴**: Upbit WebSocket 원시 메시지를 내부 타입(`TickerView`, `OrderbookView`, `TradeView`)으로 정규화할 때 parser adapter를 별도 계층으로 분리한다.
- **Result/상태 머신 패턴 도입**: `loading/success/error/empty` 상태를 단일 enum/union으로 통일해 UI 분기를 축소한다.

### 15.3 2026 로드맵 제안(기존 파일 반영 기준)
- **M1~M2**: `core/network`(retry, timeout, schema parser), `features/exchange`(store 분리), `features/market-detail`(reducer + usecase) 기준으로 리팩터링한다.
- **M3**: 실시간 데이터는 현재 SocketService에 `backoff`, `heartbeat`(핑/퐁 or 타임아웃 감시), dedupe를 추가하고 테스트 더블(mock)로 재생성 가능하게 만든다.
- **M4+**: 알림·관심목록 확장 시 Clean Architecture 계층 추가 시점에 `persistence`(MMKV/SQLite)와 인증 모듈을 분리한다.

### 15.4 출처 기반 최신 신호 (요약)
- Expo SDK 56 changelog: Expo UI, RN 0.85, Hermes bytecode diffing, Expo Router 변화, EAS Build 성능 항목.
- React Native 0.85: New Animation Backend, Hermse V1 기본 엔진(0.84 기준), DevTools 개선.
- Expo Router 문서: 파일 기반 라우팅과 `@react-navigation` 외부 import 금지 규칙( SDK 56+
).
