# 시장 감성(Market Sentiment) 시각화 기능 — 기획·설계 문서

> 작성일: 2026-06-22 (코드베이스 정합 재작성)
> 범위: **외부 유료/LLM 미사용. alternative.me 무료 Fear & Greed API 단일 소스.**
> 전제: 기존 Vue 3 + Fastify + Upbit 스택. API 키/DB/비용 0, 무설정 배포 유지.

---

## 0. 코드베이스 정합성 (이 문서의 전제)

실제 `server/` 구조를 확인한 결과, **외부 무료 소스 통합 패턴이 이미 존재**한다. 신규 F&G 기능은 새 패턴을 만들지 말고 이 기존 패턴을 그대로 따른다.

| 기존 자산 | 위치 | 신규 기능에서의 역할 |
|---|---|---|
| **`news/` 모듈** | `server/src/news/**` | **모범 템플릿** — 외부 API fetch+zod+normalize+cache+degraded 폴백의 완성형. F&G 모듈을 이 구조로 복제 |
| `requestJson()` | `server/src/freeapi/http.ts` | 외부 HTTP 클라이언트(타임아웃/재시도/`FreeApiError` 내장). **재사용** |
| `cachedWithStale()` | `server/src/freeapi/cache.ts` | stale-while-revalidate 캐시. **재사용** (하루 1회 갱신원에 최적) |
| `FreeApiError` | `server/src/freeapi/errors.ts` | 표준 에러(`RATE_LIMIT`/`TIMEOUT`/`UPSTREAM_ERROR`…). **재사용** |
| 라우트 등록 | `server/src/app.ts` `buildApp()` | `registerSentimentRoutes(app)` 한 줄 추가 |
| 응답 규약 | `routes/news.ts`, `routes/freeapi.ts` | 에러는 `{success:false, code, message, timestamp}`, 성공은 데이터 객체 직접 반환(+`stale`/`degraded`) |
| 프록시 | `web/vite.config.ts`(`/market`→:4000), 루트 `vercel.json`(`/market/:path*`→API) | `/market/sentiment` 는 **설정 변경 없이** 동작 |

> ⚠️ 직전 문서의 `server/src/routes/cache.ts`, `undici` 직접 호출 같은 표기는 오류였다. 실제 캐시는 `freeapi/cache.ts`(외부용 `cachedWithStale`)·`upbit/cache.ts`(`cached`) 두 곳이고, 외부 HTTP는 `freeapi/http.ts`의 `requestJson`을 쓴다.

---

## 1. 목표 & "감성"의 정의

거래소 페이지에 **현재 시장이 긍정(탐욕)/부정(공포)/중립** 중 어디인지 한눈에 보여주는 패널을 추가한다. 이번 범위의 "감성"은 **Crypto Fear & Greed Index(0~100)** 하나로 정의한다.

| 지수 범위 | alternative.me 분류 | 우리 라벨 |
|---|---|---|
| 0 ~ 24 | Extreme Fear | **부정** (극공포) |
| 25 ~ 44 | Fear | **부정** (공포) |
| 45 ~ 54 | Neutral | **중립** |
| 55 ~ 74 | Greed | **긍정** (탐욕) |
| 75 ~ 100 | Extreme Greed | **긍정** (극탐욕) |

→ 표시물: **게이지(현재값) + 긍/부정/중립 라벨 + 최근 추세 선그래프**. 모두 alternative.me 단일 소스.

> 라벨 매핑은 **서버 상수**로 고정한다. `value_classification` 문자열을 신뢰하되, 우리 3분류(긍/부정/중립) 경계는 위 표대로 서버에서 계산해 내려준다.

---

## 2. 구현 가능 여부 — **가능 (단일 무료 소스 · 기존 패턴 재사용)**

- alternative.me F&G API: **키 불필요·무료**, 하루 1회 갱신.
- 신규 코드 = 기존 `news/` 모듈 복제 + `requestJson`/`cachedWithStale`/`FreeApiError` 재사용. **새 인프라 0.**
- LLM/뉴스/유료 전부 제외. 비용·키·DB 0. README의 "무설정" 강점 유지.

---

## 3. 데이터 소스 — alternative.me Fear & Greed Index

### 3.1 엔드포인트 & 파라미터

| 용도 | URL |
|---|---|
| 현재값 | `https://api.alternative.me/fng/?limit=1` |
| 최근 N일 추세 | `https://api.alternative.me/fng/?limit=31` (오늘+30일) |
| 전체 히스토리 | `https://api.alternative.me/fng/?limit=0` |

- `limit` (int): 결과 개수, `0`=전체.
- `format` (`json`/`csv`): json 고정.
- `date_format` (`us`/`cn`/`kr`/`world`): **미지정 시 `timestamp`가 Unix초**.

> **KR/World 날짜 표기 처리(요청 반영)**: 추세 차트는 **숫자 timestamp가 필수**이므로 서버는 `date_format`을 지정하지 않고 **Unix초로 받는다**. KR/World 표기는 프론트에서 `Intl.DateTimeFormat`로 토글 렌더(§5.4). 즉 두 표기 모두 지원하되, 표기 변환은 표현 계층에서 한다(업스트림 `date_format` 의존 회피).

### 3.2 응답 포맷 (실제 호출로 검증)

```json
{
  "name": "Fear and Greed Index",
  "data": [
    { "value": "20", "value_classification": "Extreme Fear",
      "timestamp": "1782086400", "time_until_update": "44082" },
    { "value": "23", "value_classification": "Extreme Fear",
      "timestamp": "1782000000" }
  ],
  "metadata": { "error": null }
}
```

- `value`(문자열 0~100)→숫자, `value_classification`(분류), `timestamp`(Unix초, 배열 최신순), `time_until_update`(다음 갱신까지 초, 현재값에만), `metadata.error`(정상 시 `null`).

### 3.3 갱신 주기

- **하루 1회** → 서버 캐시 TTL 30분, stale TTL 6시간으로 충분(외부 호출 최소화).

---

## 4. 백엔드 설계 (신규 `sentiment/` 모듈 — `news/` 복제)

### 4.1 파일 구성

```
server/src/sentiment/
  provider.ts     # alternative.me fetch + 정규화 + 라벨 매핑 + TTL 상수
  schemas.ts      # zod: F&G 응답 스키마
  types.ts        # SentimentResponse 등 타입
server/src/routes/sentiment.ts   # registerSentimentRoutes(app)
```

- HTTP는 `freeapi/http.ts`의 `requestJson` 재사용, 캐시는 `freeapi/cache.ts`의 `cachedWithStale` 재사용, 에러는 `FreeApiError` 재사용. (별도 cache/error 복제 불필요)
- `app.ts`의 `buildApp()`에 `registerSentimentRoutes(app)` 한 줄 추가.

### 4.2 zod 스키마 (`sentiment/schemas.ts`)

```ts
import { z } from "zod"

export const fngEntrySchema = z.object({
  value: z.string(),
  value_classification: z.string(),
  timestamp: z.string(),
  time_until_update: z.string().optional(),
})

export const fngResponseSchema = z.object({
  name: z.string().optional(),
  data: z.array(fngEntrySchema).min(1),
  metadata: z.object({ error: z.unknown().nullable() }).optional(),
})
```

### 4.3 provider (`sentiment/provider.ts`)

```ts
import { requestJson } from "../freeapi/http.js"
import { fngResponseSchema } from "./schemas.js"
import type { SentimentResponse } from "./types.js"

const FNG_BASE_URL = "https://api.alternative.me/fng/"
const PROVIDER = "alternative.me" as const

export const SENTIMENT_TTL_MS = 30 * 60_000        // 30분
export const SENTIMENT_STALE_TTL_MS = 6 * 60 * 60_000  // 6시간

type Label = "긍정" | "부정" | "중립"
function toLabel(value: number): Label {
  if (value <= 44) return "부정"
  if (value <= 54) return "중립"
  return "긍정"
}

export async function fetchFearGreed(days: number): Promise<SentimentResponse> {
  // 추세 days개 + 현재값 1개 여유
  const feed = await requestJson(`${FNG_BASE_URL}?limit=${days + 1}`, fngResponseSchema)
  const entries = [...feed.data].sort((a, b) => Number(a.timestamp) - Number(b.timestamp)) // 오름차순
  const latest = entries[entries.length - 1]
  const value = Number(latest.value)

  return {
    provider: PROVIDER,
    value,
    classification: latest.value_classification,
    label: toLabel(value),
    updatedAt: Number(latest.timestamp) * 1000,
    nextUpdateInSec: latest.time_until_update ? Number(latest.time_until_update) : null,
    history: entries.map((e) => ({ t: Number(e.timestamp) * 1000, value: Number(e.value) })),
    fetchedAt: Date.now(),
    cacheTtlMs: SENTIMENT_TTL_MS,
    stale: false,
  }
}
```

> 정규화에서 `Number()` 결과가 `NaN`이면 `FreeApiError("SCHEMA_MISMATCH")`로 던져 degraded 경로 태우기(견고성).

### 4.4 라우트 (`routes/sentiment.ts`) — `news` 라우트와 동일 규약

```ts
import type { FastifyInstance, FastifyReply } from "fastify"
import { z } from "zod"
import { cachedWithStale } from "../freeapi/cache.js"
import { FreeApiError } from "../freeapi/errors.js"
import { fetchFearGreed, SENTIMENT_TTL_MS, SENTIMENT_STALE_TTL_MS } from "../sentiment/provider.js"

const sentimentQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
})

export function registerSentimentRoutes(app: FastifyInstance): void {
  app.get("/market/sentiment", async ({ query }, reply) => {
    const parsed = sentimentQuerySchema.safeParse(query)
    if (!parsed.success) {
      return reply.code(400).send({
        success: false, code: "VALIDATION_ERROR",
        message: "invalid sentiment query", timestamp: Date.now(),
      })
    }
    const { days } = parsed.data
    try {
      const cached = await cachedWithStale(
        `sentiment:fng:${days}`,
        SENTIMENT_TTL_MS, SENTIMENT_STALE_TTL_MS,
        () => fetchFearGreed(days),
      )
      return { ...cached.value, stale: cached.stale }
    } catch (error) {
      // 소프트 장애는 200 degraded로 — 패널이 graceful 표시 (news와 동일 전략)
      if (error instanceof FreeApiError) {
        return {
          provider: "alternative.me", value: null, label: null,
          fetchedAt: Date.now(), cacheTtlMs: SENTIMENT_TTL_MS,
          stale: false, degraded: true, degradedReason: error.code,
        }
      }
      throw error
    }
  })
}
```

### 4.5 응답 스키마 (성공)

```
GET /market/sentiment?days=30
→ {
    provider: "alternative.me",
    value: number | null,          // 0~100 (degraded 시 null)
    classification?: string,        // "Extreme Fear" | ... | "Extreme Greed"
    label: "긍정" | "부정" | "중립" | null,
    updatedAt?: number,             // ms
    nextUpdateInSec?: number | null,
    history?: { t: number, value: number }[],   // 오름차순, days개
    fetchedAt: number,
    cacheTtlMs: number,
    stale: boolean,
    degraded?: boolean,
    degradedReason?: string
  }
```

> 성공 시 데이터 객체 직접 반환(news/freeapi 규약과 동일). 검증 실패만 400 에러 envelope.

---

## 5. 프론트엔드 설계 (Vue 3, `web/`)

### 5.1 API 클라이언트 (`web/src/api/rest.ts`)

기존 `getJson`/`buildPath` 패턴으로 추가:

```ts
export interface SentimentView {
  provider: string
  value: number | null
  classification?: string
  label: "긍정" | "부정" | "중립" | null
  updatedAt?: number
  nextUpdateInSec?: number | null
  history?: { t: number; value: number }[]
  stale: boolean
  degraded?: boolean
  degradedReason?: string
}

export const getMarketSentiment = (days = 30) =>
  getJson<SentimentView>(buildPath("/market/sentiment", { days }))
```

### 5.2 스토어 (`web/src/stores/sentiment.ts`)

기존 Pinia 패턴(`stores/trade.ts`와 동일 형태):

```ts
import { defineStore } from "pinia"
import { getMarketSentiment, type SentimentView } from "../api/rest.js"

export const useSentimentStore = defineStore("sentiment", {
  state: () => ({ current: null as SentimentView | null, loading: false, error: "" }),
  actions: {
    async load(days = 30) {
      this.loading = true
      try { this.current = await getMarketSentiment(days); this.error = "" }
      catch (e) { this.error = e instanceof Error ? e.message : "감성 로딩 실패" }
      finally { this.loading = false }
    },
  },
})
```

### 5.3 페이지 & 라우트 (독립 페이지로 구현)

거래소 패널에 끼워넣지 않고 **전용 페이지**로 만든다. 기존 라우터(`web/src/router/index.ts`: `/`, `/exchange`)에 라우트 1개 추가:

```ts
// web/src/router/index.ts
import SentimentPage from "../features/sentiment/SentimentPage.vue"
// ...
{ path: "/sentiment", name: "sentiment", component: SentimentPage },
```

- 신규 파일: `web/src/features/sentiment/SentimentPage.vue`(페이지) + 필요 시 하위 컴포넌트(`SentimentGauge.vue` / `SentimentTrend.vue` / `SentimentHistoryTable.vue`)로 분리.
- 페이지이므로 내부에 **패널 카드 여러 개를 자유 배치** 가능(게이지 카드 / 추세 카드 / Historical Values 카드). 카드 골격은 `MarketMovementPanel.vue`의 스타일 믹스인(`@include exchange-panel; @include panel-head; @include panel-title(...)`) 재사용 → 거래소와 톤 일관.
- 페이지 배경/레이아웃은 `ExchangePage.vue`의 그라데이션·`exchange-layout` 패턴 참고.
- 진입 시(`onMounted`) `useSentimentStore().load()` 1회. 하루 1회 갱신이라 폴링 불필요(원하면 30분 인터벌).

> **진입점(배치)은 추후 결정** — 사용자가 구현 형태를 보고 정함. 현재는 `/sentiment` 직접 접근만 보장. 이후 (a) `ExchangePage`/`LandingPage` 헤더의 네비 링크, (b) 거래소 패널 내 "감성 자세히 보기" 버튼, (c) 랜딩 CTA 중 하나로 연결하면 됨. 백엔드/페이지 코드는 그대로 두고 **링크만 추가**하면 되도록 설계.

### 5.4 시각화 (기존 Highcharts 재사용)

웹은 이미 `highcharts`+`highcharts-vue` 사용(`CandleChart.vue` 참고). 모듈 등록 패턴도 동일:

```ts
import Highcharts from "highcharts"
import HighchartsMore from "highcharts/highcharts-more"
import SolidGauge from "highcharts/modules/solid-gauge"
if (typeof HighchartsMore === "function") HighchartsMore(Highcharts)
if (typeof SolidGauge === "function") SolidGauge(Highcharts)
```

1. **현재 지수 게이지** — `solidgauge`(반원). 0~100, 구간색: 0~44 `--c-down`(앰버/부정) → 45~54 `--c-flat`(중립) → 55~100 `--c-up`(라임/긍정). 색은 `CandleChart.vue`처럼 `getComputedStyle`로 CSS 토큰 읽어 적용.
2. **추세 선그래프** — `areaspline`/`line`, x=`history[].t`(datetime), y=value. 긍/부정 구간 `plotBand` 음영.
3. **요약 라벨** — "오늘의 시장: 공포(부정)" + 어제 대비 증감(▲/▼). 날짜는 `Intl.DateTimeFormat("ko-KR"|"en-US")` 토글로 **KR/World 둘 다** 표기.

> ⚙️ **경량 1차(M2)**: 게이지 모듈 추가 전, **가로 진행 바(0~100)+숫자/라벨+스파크라인**으로 먼저 출시. solid-gauge는 M3.

### 5.5 Historical Values 스냅샷 표 (alternative.me 위젯 동등)

alternative.me가 보여주는 **Now / Yesterday / Last week / Last month** 비교를 동일하게 제공한다. **API 변경 불필요** — §4.5의 `history` 배열에서 프론트가 인덱싱만 하면 된다(일 단위, 오름차순).

```ts
// history: { t, value }[] (오름차순). 마지막이 오늘.
function snapshot(history: { t: number; value: number }[]) {
  const last = history.length - 1
  const at = (daysAgo: number) => history[last - daysAgo]?.value ?? null
  return {
    now:        at(0),
    yesterday:  at(1),
    lastWeek:   at(7),
    lastMonth:  at(30),   // days>=31 필요
    lastQuarter:at(90),   // days=90 요청 시
  }
}
```

- 표 형태: 각 행에 라벨(지금/어제/지난주/지난달) + 값 + 분류(긍/부정/중립 색) + 현재값 대비 화살표.
- 기본 `days=30`이면 **지난달까지**, 지난분기까지 필요하면 패널에서 `load(90)` 호출.
- 결측(주말/누락 인덱스) 시 `null` → "—" 표시. 정확히 N일 전이 없으면 가장 가까운 이전 값으로 폴백(선택).

> 표시물 정리: **게이지(현재) + 추세 선그래프(연속) + Historical Values 표(이산 스냅샷)** 세 가지가 모두 동일한 `history` 한 배열에서 파생된다.

---

## 6. (후속 확장 후보, 이번 범위 밖)

- **마켓 브레드스**: 기존 Upbit ticker(`signedChangeRate`)로 상승/하락 코인 비율 산출 → "자체 감성" 합성. 외부 의존/키/비용 0. F&G와 2신호로 키울 수 있으나 이번엔 단일 소스 원칙 유지.

---

## 7. 단계별 구현 플랜 (반나절~1일)

- **M1 — 백엔드 모듈**
  - `sentiment/{schemas,provider,types}.ts` + `routes/sentiment.ts` 작성, `app.ts`에 `registerSentimentRoutes` 등록.
  - `requestJson`/`cachedWithStale`/`FreeApiError` 재사용, TTL 30분/stale 6h, degraded 폴백.
  - ✅ 체크: `curl localhost:4000/market/sentiment?days=30` → value/label/history 반환. 업스트림 차단 시 `degraded:true` 200.
- **M2 — 전용 페이지(경량)**
  - `rest.ts` `getMarketSentiment()` + `stores/sentiment.ts` + `SentimentPage.vue`(진행 바+라벨+스파크라인) + `router/index.ts`에 `/sentiment` 라우트 등록.
  - ✅ 체크: `/sentiment` 직접 접근 시 현재 지수/라벨 표시.
- **M3 — 게이지 + 추세 + Historical Values(선택)**
  - solid-gauge + areaspline + plotBand + Historical Values 표(§5.5) + KR/World 날짜 토글.
  - ✅ 체크: 게이지 구간색이 긍/부정/중립 표현, 과거 스냅샷 표 표시.
- **M4 — 진입점 연결(추후 결정)**
  - 사용자가 형태 확인 후 네비 링크/버튼/CTA 중 택1로 `/sentiment` 연결.

---

## 8. 테스트 (기존 테스트 관례 정합)

- 서버: `server/test/`에 `sentiment.test.ts` 추가(기존 `routes.test.ts`/`upbit-rest.test.ts` 스타일).
  - provider 정규화: 문자열→숫자, 라벨 경계(44/45/54/55), 정렬(오름차순).
  - 라우트: `days` 범위 클램프, 검증 실패 400, 업스트림 실패 시 `degraded` 200.
  - 캐시: `clearFreeApiCacheForTest()`로 격리.
- 웹: 필요 시 store/컴포넌트 단위 테스트(vitest).

---

## 9. 주의사항

1. **단일 외부 의존(alternative.me)** — `requestJson` 타임아웃(기본 3s)/재시도 내장. 장애 시 `cachedWithStale`가 stale 반환 → 그래도 실패면 `degraded:true` 200. 무한 재시도 금지.
2. **장기 캐시 필수** — 하루 1회 갱신원. TTL 30분/stale 6h. 짧은 TTL로 외부 두드리지 말 것.
3. **타임존/포맷** — `timestamp`는 Unix초 → 서버에서 ms로 변환해 내려줌. KR/World 표기는 프론트 `Intl` 토글(차트엔 숫자 timestamp 사용).
4. **라벨 경계는 서버 상수** — 45~54 중립 고정 등. 업스트림 분류 문자열 변동에 흔들리지 않게.
5. **응답 규약 일치** — 성공=데이터 직접 반환, 에러=`{success:false,code,message,timestamp}`. (news/freeapi와 동일)
6. **무설정 배포 유지** — 키/환경변수 0. `/market/sentiment`는 vite 프록시·vercel rewrite로 설정 변경 없이 동작.
7. **새 인프라 만들지 말 것** — cache/http/error를 새로 짜지 말고 `freeapi/*` 재사용. 모듈 구조는 `news/` 복제.
8. **`requestJson`는 커스텀 헤더 미지원(검증 필요)** — `freeapi/http.ts`의 `RequestJsonOptions`는 `timeoutMs`/`maxRetries`/`retryDelaysMs`만 받고 `User-Agent` 등 헤더를 못 넣는다. alternative.me는 보통 UA 없이도 응답하나, **M1에서 실제 호출로 먼저 확인**할 것. UA가 필요하면 (a) `requestJson`에 `headers` 옵션을 추가하거나 (b) `news/providers/cryptocurrencyCv.ts`처럼 `undici` `request`를 직접 쓰는 방식으로 전환(이미 검증된 패턴).
9. **서버리스 캐시는 인스턴스 단위** — `cachedWithStale`는 in-process `Map`이라 Vercel 서버리스에선 인스턴스마다 별도 캐시(전역 공유 아님). 이는 기존 freeapi/news/upbit 캐시와 **동일한 특성**이며, 하루 1회 갱신·저트래픽 지표엔 문제없음. 단, "30분 1회 호출"이 인스턴스 수만큼 늘 수 있음을 인지.

---

## 10. 참고

### 외부 API (조회·검증 완료, 2026-06)
- F&G API 문서 — https://alternative.me/crypto/fear-and-greed-index/ (§API)
- 크립토 API 일반 — https://alternative.me/crypto/api/
- 응답 예시 실제 검증: `GET https://api.alternative.me/fng/?limit=2` → §3.2

### 내부 코드 (재사용/복제 출처 — 실경로)
- 외부 HTTP: `server/src/freeapi/http.ts` (`requestJson`, 타임아웃/재시도/`FreeApiError`)
- 캐시: `server/src/freeapi/cache.ts` (`cachedWithStale`, `clearFreeApiCacheForTest`)
- 에러: `server/src/freeapi/errors.ts` (`FreeApiError`)
- 모범 템플릿: `server/src/news/providers/cryptocurrencyCv.ts` + `server/src/routes/news.ts`
- 라우트 등록: `server/src/app.ts` (`buildApp` → `registerSentimentRoutes`)
- 웹 REST: `web/src/api/rest.ts` (`getJson`/`buildPath`)
- 라우터: `web/src/router/index.ts` (`/`, `/exchange` → `/sentiment` 추가)
- 페이지 레이아웃 참고: `web/src/features/exchange/ExchangePage.vue`
- 스토어 패턴: `web/src/stores/trade.ts`
- 차트 패턴: `web/src/features/exchange/CandleChart.vue` (Highcharts 모듈 등록 + CSS 토큰)
- 패널 스타일: `web/src/features/exchange/MarketMovementPanel.vue`
- 디자인 토큰: `web/src/styles/_variables.scss` (`--c-up`/`--c-down`/`--c-flat`)
- 프록시/배포: `web/vite.config.ts`(`/market`→:4000), 루트 `vercel.json`(`/market/:path*`→API)

---

## 11. 한 줄 요약

기존 **`news/` 모듈을 복제**해 `server/src/sentiment/`를 만들고, `requestJson`+`cachedWithStale`+`FreeApiError`를 재사용해 **alternative.me F&G** 하나만 받아 긍/부정/중립으로 매핑·30분 캐시·degraded 폴백한다. 프론트는 기존 Highcharts/Pinia/패널 패턴으로 게이지+추세+라벨을 그린다. 키·비용·LLM·DB·신규 인프라 0.
