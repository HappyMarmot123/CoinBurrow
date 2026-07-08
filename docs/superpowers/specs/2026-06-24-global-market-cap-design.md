# 글로벌 시총 페이지 설계

- 작성일: 2026-06-24
- 상태: 설계 확정 (구현 전)
- 범위: 암호화폐 **글로벌 시가총액 스냅샷** 전용 페이지 `/global` 신설 (keyless 무료 API)
- 참고 모델: `sentiment` 기능 (provider → schemas → route(degraded) → store → page → router/nav 풀스택)

## 1. 목적

암호화폐 전체 시장의 거시 스냅샷(총 시가총액, 24h 거래량, 도미넌스, 변동률, 코인 수)을 한 페이지에서 보여준다. Upbit 단일 마켓 시세를 넘어서는 "시장 전체" 관점을 제공하는 것이 목적이며, 기존 거래소/시장심리/김치프리미엄/뉴스 페이지와 동급의 독립 라우트로 둔다.

비목표(1차 범위 밖):
- 총 시총 장기 히스토리 추세 차트 (keyless 안정 소스 부재 — 2차 후보)
- CoinPaprika 백업 소스 (가용성 보강 — 2차 후보)
- USD→KRW 환산 병기 (`fx` 라우트 연계 — 2차 후보)

## 2. 데이터 계약 (keyless)

### 2-1. 업스트림

`GET https://api.coingecko.com/api/v3/global` — 인증 키 불필요, 단일 호출로 필요한 필드 전부 취득.

CoinGecko demo key가 환경변수로 존재하면(`coingecko.ts`의 `appendDemoKey` 동일 규칙) 쿼리에 부착하되, **없어도 동작**한다(keyless 우선).

### 2-2. 페이지 표시 ↔ 응답 필드 매핑

| 페이지 표시 | CoinGecko `/global` 필드 | 비고 |
|---|---|---|
| 총 시가총액 (USD) | `data.total_market_cap.usd` | 필수 |
| 24h 거래량 (USD) | `data.total_volume.usd` | 필수 |
| 24h 시총 변동률 (%) | `data.market_cap_change_percentage_24h_usd` | 부호로 상승/하락 색 |
| BTC 도미넌스 (%) | `data.market_cap_percentage.btc` | |
| ETH 도미넌스 (%) | `data.market_cap_percentage.eth` | |
| 활성 암호화폐 수 | `data.active_cryptocurrencies` | 정수 |
| 거래소 수 | `data.markets` | 정수 |
| 갱신 시각 | `data.updated_at` (sec epoch) → ms | 표시용 |

### 2-3. 정규화 응답 (`GET /market/global`)

서버는 USD 원본만 정규화해 내려준다. sentiment 응답 봉투 규칙(`fetchedAt`/`cacheTtlMs`/`stale`/`degraded`)을 따른다.

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
  updatedAt?: number        // ms epoch (업스트림 기준)
  fetchedAt: number         // ms epoch (서버 fetch 시점)
  cacheTtlMs: number
  stale: boolean
  degraded?: boolean
  degradedReason?: string
}
```

degraded 응답에서는 수치 필드를 모두 `null`로 채우고 `degraded:true` + `degradedReason`을 설정한다(sentiment `toDegradedResponse`와 동형).

## 3. 서버 설계

### 3-1. 신규 파일 (sentiment 디렉터리 구조 복제)

```
server/src/global/
  types.ts        # GlobalMarketResponse
  schemas.ts      # zod globalResponseSchema
  provider.ts     # fetchGlobalMarket() + GLOBAL_TTL_MS / GLOBAL_STALE_TTL_MS
server/src/routes/global.ts   # GET /market/global
server/src/app.ts             # registerGlobalRoutes(app) 등록 (수정)
```

### 3-2. `global/schemas.ts`

CoinGecko 응답을 느슨하게(passthrough) 검증한다. 필드 누락 시 `null` 허용하되, 최소한 `data` 객체와 `data.total_market_cap` 존재는 요구.

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

### 3-3. `global/provider.ts`

`freeapi/http.ts`의 `requestJson`로 호출+검증, USD 키만 추출해 `GlobalMarketResponse`(stale 제외 필드)로 정규화. `usd` 값이 유한수가 아니면 `FreeApiError('SCHEMA_MISMATCH')`.

```ts
export const GLOBAL_TTL_MS = 60_000          // 60초
export const GLOBAL_STALE_TTL_MS = 30 * 60_000 // 30분

export async function fetchGlobalMarket(): Promise<GlobalMarketResponse> { ... }
```

값 안전 추출 헬퍼: `pickNumber(record?, key)` → `record?.[key]`가 유한수면 반환, 아니면 `null`.

### 3-4. `routes/global.ts` (sentiment 라우트와 동형)

```ts
export function registerGlobalRoutes(app: FastifyInstance): void {
  app.get('/market/global', async (_req, reply) => {
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

`toDegradedResponse(reason)`는 수치 전부 `null` + `degraded:true`를 반환. 쿼리 파라미터 없음(라우트 단순).

### 3-5. 서버리스 제약 준수 (`free-api-survey` 15절)

- WS·상시 job 미사용 — REST only + 짧은 TTL 캐시(`cachedWithStale`).
- 단일 업스트림(fan-out 없음)이라 동시성 상한 이슈 없음. `freeapi/http.ts`의 기존 timeout 적용.
- 부분 실패는 degraded 200으로 — 전체 500 금지.
- adapter는 `server/src` 정적 import (dist 동적 import 금지).

## 4. 웹 설계

### 4-1. 신규/수정 파일

```
web/src/api/rest.ts                      # GlobalMarketView + getGlobalMarket() (수정)
web/src/stores/global.ts                 # Pinia store (신규)
web/src/features/global/GlobalPage.vue   # 페이지 (신규)
web/src/router/index.ts                  # /global 라우트 (수정)
web/src/components/AppNav.vue            # "글로벌 시총" 링크 (수정)
web/src/utils/format.ts                  # 큰 수/통화 포맷 헬퍼 필요 시 확장 (수정)
```

### 4-2. `api/rest.ts`

```ts
export interface GlobalMarketView {
  provider: string
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

export const getGlobalMarket = async (): Promise<GlobalMarketView> =>
  getJson<GlobalMarketView>(buildPath('/market/global'))
```

### 4-3. `stores/global.ts` (sentiment store와 동형)

```ts
export const useGlobalStore = defineStore('global', {
  state: () => ({ current: null as GlobalMarketView | null, loading: false, error: '' }),
  actions: {
    async load() {
      this.loading = true
      try {
        this.current = await getGlobalMarket()
        this.error = ''
      } catch (error) {
        this.error = error instanceof Error ? error.message : '글로벌 시장 데이터를 불러오지 못했습니다.'
      } finally {
        this.loading = false
      }
    },
  },
})
```

### 4-4. `features/global/GlobalPage.vue`

- 레이아웃: `<main>` + `<AppNav>` + 스냅샷 **카드 그리드**. sentiment 페이지의 페이지 셸(배경 그라데이션, `width: min(1100px,...)`, `@include exchange-panel`)을 따른다.
- 카드 구성:
  - 메인 카드: 총 시가총액(대형 숫자) + 24h 변동률 칩(상승/하락 색).
  - 보조 카드들: 24h 거래량 / BTC 도미넌스 / ETH 도미넌스 / 활성 코인 수 / 거래소 수.
- 갱신: `onMounted`에서 `store.load()` 1회 + `setInterval`(60_000ms) 폴링. `onBeforeUnmount`에서 `clearInterval`. (news/sentiment의 폴링 타이머 패턴 동일.)
- 상태 표시:
  - `loading && !current` → "불러오는 중…"
  - `error` → 에러 텍스트
  - `current?.degraded` → "글로벌 시장 데이터를 일시적으로 가져올 수 없습니다. (사유: …)"
  - `stale` → 작은 "지연된 값" 배지(선택).
- 포맷: 큰 통화는 축약(예: `$2.41T`, `$98.3B`), 퍼센트는 소수 1~2자리. `utils/format.ts`에 `formatCompactUsd`/`formatPercent`가 없으면 추가.

### 4-5. 라우터 / 네비

- `router/index.ts`: `{ path: '/global', name: 'global', component: GlobalPage }`.
- `AppNav.vue`: 링크 `<router-link to="/global">글로벌 시총</router-link>` 추가 (거래소/시장심리/김치프리미엄/뉴스 사이 적절한 위치).

## 5. 데이터 흐름

```
GlobalPage(onMounted + setInterval 60s)
  → globalStore.load()
    → getGlobalMarket()  [web/src/api/rest.ts]
      → GET /market/global  [routes/global.ts]
        → cachedWithStale('global:coingecko', 60s, 30m)
          → fetchGlobalMarket()  [global/provider.ts]
            → requestJson(coingecko /global, globalResponseSchema)
        → 정규화 GlobalMarketResponse 반환 (degraded/stale 플래그 포함)
```

## 6. 에러 / 폴백 정책

| 상황 | 서버 동작 | 클라이언트 표시 |
|---|---|---|
| 정상 | 200 + 수치 | 카드 정상 |
| 캐시 stale 재사용 | 200 + `stale:true` | 정상 + (선택) 지연 배지 |
| 업스트림 5xx/타임아웃/스키마 불일치 | 200 + `degraded:true` + reason | "일시적으로 가져올 수 없음" 안내 |
| 클라이언트 네트워크 실패 | — | store.error 메시지 |

## 7. 테스트 계획

### 서버 (`server`)
1. provider 정상 파싱 — 대표 응답에서 7개 필드 정규화 확인.
2. provider 스키마 누락 — `market_cap_percentage.eth`/`markets` 등 누락 시 해당 필드 `null`, 나머지 정상.
3. provider 치명 누락 — `total_market_cap.usd` 비유한수 → `FreeApiError('SCHEMA_MISMATCH')`.
4. route degraded — `fetchGlobalMarket`가 `FreeApiError` throw 시 200 + `degraded:true` 응답.

### 웹 (`web`)
5. store load 성공 — `current` 채워지고 `error` 비움.
6. store load 실패 — `error` 메시지 설정.
7. (선택) GlobalPage 렌더 — degraded 상태에서 안내 문구 노출.

## 8. 수용 기준 (DoD)

- `/global` 라우트 진입 시 글로벌 스냅샷 7개 지표가 카드로 표시된다.
- 키 없이 동작한다(환경변수 미설정 상태에서 정상).
- 업스트림 장애 시 페이지가 깨지지 않고 degraded 안내를 보여준다(전체 500 없음).
- 60초 자동 폴링이 동작하고 언마운트 시 타이머가 정리된다.
- `npx tsc --noEmit` / `npm test` / `npm run build`(server, web 각각) 통과.
- AppNav에 "글로벌 시총" 링크가 추가되어 모든 페이지에서 이동 가능.

## 9. 2차 후보 (범위 밖, 기록용)

- 총 시총 히스토리 추세 차트 (keyless 안정 소스 확보 시).
- CoinPaprika `/v1/global` 백업 소스 + 소스 배지.
- USD→KRW 환산 병기 (`fx` 라우트 연계).
- 도미넌스 도넛/스택 바 시각화.
