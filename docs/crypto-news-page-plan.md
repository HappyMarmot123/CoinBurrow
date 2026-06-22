# 크립토 뉴스 페이지 상세 구현 계획

작성일: 2026-06-22  
대상 저장소: `CoinBurrow`  
상태: 구현 착수 전 보완본

---

## 1. 목표

CoinBurrow의 기존 실시간 마켓 대시보드는 가격, 캔들, 호가, 체결 등 수치 데이터 중심이다. 뉴스 페이지는 같은 서비스 안에서 시장 이벤트와 가격 흐름을 함께 확인하게 하는 보조 의사결정 화면이다.

### 핵심 결과물

- 프론트엔드 신규 라우트: `/news`
- 서버 프록시 API: `/market/news/articles`, `/market/news/sources`, `/market/news/health`
- 기본 데이터 소스: `cryptocurrency.cv`
- 보조 데이터 소스: `free-crypto-news`는 endpoint 재확인 후 fallback 후보로만 사용
- 갱신 방식: Vercel serverless 1차 범위에서는 REST 폴링 + TTL 캐시

### 제외 범위

- 기사 전문 재게시
- 유료 API, API key 필수 기능
- 서버리스 환경에서 유지하기 어려운 상시 WebSocket/SSE 연결
- 사용자별 북마크/알림/포트폴리오 개인화
- AI 요약/번역 provider 연동. 단, API가 이미 제공하는 summary/translation 필드는 표시 가능

---

## 2. 현재 코드베이스 반영 사항

현재 프로젝트는 Vue/Vite 프론트엔드와 Fastify 서버를 workspace로 분리한다.

| 영역 | 현재 구조 | 뉴스 구현 적용 |
|---|---|---|
| 프론트 라우터 | `web/src/router/index.ts`에 `/`, `/exchange` | `/news` route 추가 |
| 프론트 API | `web/src/api/rest.ts`에서 `getJson` + query builder 사용 | `getNewsArticles`, `getNewsSources`, `getNewsHealth` 추가 |
| 상태 관리 | Pinia stores: `ticker`, `market`, `orderbook`, `candle`, `trade` | `web/src/stores/news.ts` 추가 |
| 화면 구조 | `web/src/features/exchange/*`, `landing/*` | `web/src/features/news/*` 추가 |
| 서버 라우트 | `server/src/routes/market.ts` 등록 | `server/src/routes/news.ts` 추가 후 `app.ts`에서 등록 |
| 서버 외부 호출 | `undici` + `zod` + 정규화 + 캐시 | 동일 패턴 사용 |
| Vercel 라우팅 | `/market/:path*`만 API 함수로 rewrite | API는 `/market/news/...` prefix 사용 |

중요: Vercel rewrite가 `/news`를 API로 보내지 않기 때문에, 페이지 경로는 `/news`, 서버 API는 기존 rewrite를 재사용하는 `/market/news/...`로 분리한다.

---

## 3. API 소스 판단

### 3-1. 1차 소스: cryptocurrency.cv

`cryptocurrency.cv`는 공개 저장소 기준으로 API key 없이 최신 크립토 뉴스, 검색, 카테고리, 국제 뉴스, 아카이브, RSS/Atom, OpenAPI를 제공한다. 문서에는 `/api/news`, `/api/search`, `/api/news/international`, `/api/news/categories`, `/api/breaking`, `/api/trending`, `/api/openapi.json` 등이 명시되어 있다.

1차 구현에서는 다음 REST endpoint만 사용한다.

| 기능 | 외부 endpoint | 내부 endpoint |
|---|---|---|
| 최신 뉴스 | `GET https://cryptocurrency.cv/api/news?limit=...` | `GET /market/news/articles` |
| 검색 | `GET https://cryptocurrency.cv/api/search?q=...` | `GET /market/news/articles?q=...` |
| 국제 뉴스 | `GET https://cryptocurrency.cv/api/news/international?language=ko` | `GET /market/news/articles?language=ko` |
| 카테고리 | `GET https://cryptocurrency.cv/api/news/categories` | `GET /market/news/sources` 또는 2차 `/market/news/categories` |
| 상태 확인 | `GET https://cryptocurrency.cv/api/health` | `GET /market/news/health` |

SSE/WebSocket 계열은 문서 표기와 예시가 혼재되어 있으므로 1차 범위에서는 제외한다. 실시간성이 필요해지면 별도 상시 워커 환경에서 검증한다.

### 3-2. 2차 후보: free-crypto-news

`free-crypto-news`는 GitHub 설명 기준으로 API key 없이 7개 소스와 18개 언어를 제공한다고 되어 있다. 다만 현재 저장소 README의 실제 endpoint 문서가 충분히 구체적이지 않고 release도 비어 있어, 1차 구현의 필수 fallback으로 두지 않는다.

채택 기준:

- 실제 JSON endpoint, query, 응답 스키마를 구현 직전에 확인
- `cryptocurrency.cv` 장애 시만 사용
- 응답 스키마를 canonical model로 정규화할 수 있을 때만 활성화
- 검증 전에는 UI나 수용 기준에서 필수 기능으로 잡지 않음

---

## 4. 사용자 경험 설계

뉴스 페이지는 마켓 화면과 같은 운영형 도구 톤을 따른다. 큰 랜딩형 hero 대신, 사용자가 바로 뉴스 목록을 훑고 필터링할 수 있는 화면으로 구성한다.

### 4-1. 화면 구성

```text
┌────────────────────────────────────────────────────────────┐
│ CoinBurrow                          [마켓] [뉴스]          │
├────────────────────────────────────────────────────────────┤
│ 크립토 뉴스                          마지막 갱신 12:04     │
│ [전체][Bitcoin][Ethereum][DeFi][Solana]   [검색 입력] [새로고침] │
├──────────────────────┬─────────────────────────────────────┤
│ 필터                 │ 뉴스 카드 리스트                     │
│ - 언어: 전체/한국어/영어 │ ┌───────────────────────────────┐ │
│ - 정렬: 최신순        │ │ 제목                            │ │
│ - 출처               │ │ 출처 · 발행시간 · 언어 · 관련자산 │ │
│                      │ │ 1~2줄 요약                       │ │
│                      │ │ [원문 열기] [감성 배지]           │ │
│                      │ └───────────────────────────────┘ │
│                      │ [더 보기]                          │
└──────────────────────┴─────────────────────────────────────┘
```

### 4-2. 필수 UI 상태

| 상태 | 표시 방식 |
|---|---|
| 초기 로딩 | 카드 영역 skeleton |
| 빈 결과 | 필터/검색 조건을 유지한 empty state |
| 부분 실패 | stale cache가 있으면 stale 배지와 함께 표시 |
| 전체 실패 | 재시도 버튼 + "뉴스를 불러오지 못했습니다" |
| 새로고침 중 | 기존 목록 유지 + 버튼 spinner |
| 모바일 | 필터는 상단 compact control, 카드는 1열 |

### 4-3. 접근성/UX 규칙

- 검색 input은 label 또는 `aria-label` 제공
- 원문 링크는 새 탭으로 열고 `rel="noopener noreferrer"` 적용
- 뉴스 카드 전체 클릭 대신 명시적 버튼/링크를 둔다
- 발행 시간은 상대 시간과 absolute `datetime`을 함께 관리
- 감성 배지는 색상만 의존하지 않고 텍스트를 포함한다

---

## 5. 데이터 모델

외부 API 스키마가 달라도 프론트는 아래 canonical model만 사용한다.

```ts
export type NewsSentiment = 'positive' | 'negative' | 'neutral' | 'unknown'

export interface CryptoNewsArticle {
  id: string
  title: string
  url: string
  source: string
  publishedAt: number
  summary?: string
  language?: string
  originalLanguage?: string
  assets: string[]
  categories: string[]
  sentiment: NewsSentiment
  imageUrl?: string
  provider: 'cryptocurrency.cv' | 'free-crypto-news'
  isStale?: boolean
}

export interface CryptoNewsResponse {
  articles: CryptoNewsArticle[]
  nextCursor?: string
  fetchedAt: number
  cacheTtlMs: number
  provider: string
  stale: boolean
}

export interface CryptoNewsQuery {
  q?: string
  asset?: 'BTC' | 'ETH' | 'SOL' | 'XRP' | 'DOGE' | 'ADA' | 'DOT' | 'TRX' | 'DEFI' | 'ALL'
  category?: string
  language?: 'all' | 'ko' | 'en'
  limit?: number
  cursor?: string
}
```

ID 생성 규칙:

- 외부 응답에 stable id가 있으면 사용
- 없으면 `sha256(provider + url + publishedAt)` 방식
- url이 없으면 해당 기사는 제외

정규화 규칙:

- `publishedAt`: UTC epoch ms
- `assets`: 대문자 symbol 배열, 중복 제거
- `categories`: lower-case slug 배열
- `summary`: HTML 제거 후 180자 내외로 truncate
- `sentiment`: 외부 값이 없으면 `unknown`

---

## 6. 서버 구현 계획

### 6-1. 파일 구조

```text
server/src/news/
  cache.ts
  normalize.ts
  schemas.ts
  types.ts
  providers/
    cryptocurrencyCv.ts
    freeCryptoNews.ts
server/src/routes/news.ts
server/test/news-routes.test.ts
```

`server/src/app.ts` 변경:

```ts
import { registerNewsRoutes } from './routes/news.js'

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false })
  void app.register(cors, { origin: true })
  app.get('/health', async () => ({ status: 'ok' }))
  registerMarketRoutes(app)
  registerNewsRoutes(app)
  return app
}
```

### 6-2. 내부 API

| Route | Query | 설명 |
|---|---|---|
| `GET /market/news/articles` | `q`, `asset`, `category`, `language`, `limit`, `cursor` | 뉴스 목록/검색 통합 |
| `GET /market/news/sources` | 없음 | 활성 provider, source, category 정보 |
| `GET /market/news/health` | 없음 | provider 상태, cache age, stale 여부 |

1차에서는 articles route 하나에 목록/검색/필터를 통합한다. UI가 커진 뒤 `/market/news/categories`를 별도 route로 분리한다.

### 6-3. Query validation

```ts
const newsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  asset: z.enum(['ALL', 'BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'DOT', 'TRX', 'DEFI']).default('ALL'),
  category: z.string().trim().max(40).optional(),
  language: z.enum(['all', 'ko', 'en']).default('all'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().trim().max(200).optional(),
})
```

### 6-4. 외부 호출 정책

- 외부 호출 timeout: 3초
- 최대 재시도: 1회
- cache TTL: 5분
- stale 허용: 마지막 성공 응답 기준 30분
- 실패 응답:
  - stale cache 있음: `200` + `stale: true`
  - stale cache 없음: `502` + 안정적인 error envelope
- 브라우저에서 외부 뉴스 API 직접 호출 금지

### 6-5. Serverless 제약 반영

Vercel 함수는 단명/무상태이므로 다음은 1차 범위에서 금지한다.

- server-side interval job
- 상시 SSE/WebSocket 연결
- process memory에 의존하는 공유 circuit breaker
- 장시간 fan-out endpoint

1차 구현은 요청 구동 REST 프록시로만 동작한다. in-memory cache는 cold start와 instance 분리를 감수하는 best-effort cache로 표기한다. 공유 cache가 필요해지면 Vercel KV 또는 Upstash Redis 도입을 2차로 분리한다.

---

## 7. 프론트엔드 구현 계획

### 7-1. 파일 구조

```text
web/src/features/news/
  NewsPage.vue
  NewsFilters.vue
  NewsCard.vue
  NewsSkeleton.vue
  NewsEmptyState.vue
web/src/stores/news.ts
web/src/constants/news.ts
web/test/news-page.test.ts
```

### 7-2. Router

`web/src/router/index.ts`:

```ts
import NewsPage from "../features/news/NewsPage.vue";

routes: [
  { path: "/", name: "landing", component: LandingPage },
  { path: "/exchange", name: "exchange", component: ExchangePage },
  { path: "/news", name: "news", component: NewsPage },
]
```

### 7-3. REST client

`web/src/api/rest.ts`에 추가:

```ts
export interface NewsQueryOptions {
  q?: string;
  asset?: string;
  category?: string;
  language?: "all" | "ko" | "en";
  limit?: number;
  cursor?: string;
}

export const getNewsArticles = (options: NewsQueryOptions = {}) =>
  getJson<CryptoNewsResponse>(buildPath("/market/news/articles", options));
```

### 7-4. Pinia store

상태:

- `articles`
- `query`
- `loading`
- `refreshing`
- `error`
- `lastFetchedAt`
- `stale`
- `nextCursor`

actions:

- `loadNews(options?: Partial<NewsQueryOptions>)`
- `refreshNews()`
- `loadMore()`
- `setQuery(nextQuery)`
- `resetFilters()`

동작 규칙:

- 검색어 변경은 300ms debounce
- 필터 변경 시 cursor 초기화
- 새로고침은 기존 articles를 유지하면서 `refreshing=true`
- `loadMore` 중복 호출 방지

### 7-5. Navigation 보완

현재 `App.vue`는 `<router-view />`만 제공한다. 공통 nav를 바로 도입하면 landing/exchange 레이아웃 영향이 커질 수 있으므로 1차는 다음 중 작은 변경을 선택한다.

1. `/news` 페이지 내부 상단에 `CoinBurrow`, `마켓`, `뉴스` nav 배치
2. LandingPage의 주요 action에 뉴스 링크 추가
3. 2차에서 `AppShell.vue`를 만들어 exchange/news만 공유 nav 적용

권장: 1차는 1번 + 2번. 공통 shell은 후속 리팩터링으로 분리한다.

---

## 8. 상세 구현 순서

### Phase 0. API 확인 및 스키마 고정

- `cryptocurrency.cv` 실제 응답 샘플 저장
- `/api/news`, `/api/search`, `/api/news/international`, `/api/news/categories`, `/api/health` 응답 형태 확인
- `free-crypto-news` endpoint 존재 여부와 JSON 스키마 재확인
- canonical model 필드 매핑표 확정

완료 기준:

- `server/src/news/schemas.ts`에 Zod schema 초안 작성 가능
- 필수 필드 `title`, `url`, `source`, `publishedAt` 매핑 확인

### Phase 1. 서버 프록시

- `server/src/news/types.ts` 작성
- `server/src/news/schemas.ts` 작성
- `server/src/news/normalize.ts` 작성
- `server/src/news/providers/cryptocurrencyCv.ts` 작성
- `server/src/news/cache.ts` 작성
- `server/src/routes/news.ts` 작성
- `server/src/app.ts`에 route 등록

완료 기준:

- `GET /market/news/articles?limit=20` 정상 응답
- `q`, `asset`, `language`, `limit` validation 동작
- upstream 실패 시 stable 502 또는 stale 200 반환

### Phase 2. 프론트 데이터 계층

- `web/src/api/rest.ts` 뉴스 client 추가
- `web/src/stores/news.ts` 작성
- constants: asset filters, language filters, refresh interval
- store 단위 테스트 작성

완료 기준:

- store가 목록 로드, 검색, 필터 변경, 더 보기, stale 상태를 표현
- 실패 시 기존 목록 유지

### Phase 3. 뉴스 페이지 UI

- `NewsPage.vue` 작성
- `NewsFilters.vue` 작성
- `NewsCard.vue` 작성
- loading/empty/error 컴포넌트 작성
- responsive layout 적용

완료 기준:

- desktop 2-column layout
- mobile 1-column layout
- 검색/필터/새로고침/더 보기 동작
- 원문 링크 보안 속성 적용

### Phase 4. 연결 및 품질 검증

- `/news` route 추가
- Landing 또는 뉴스 페이지 상단 nav 추가
- server route test
- web page/store test
- build/test 실행

완료 기준:

- `npm test` 통과
- `npm run build` 통과
- Vercel rewrite 영향 없음
- `/news` SPA route와 `/market/news/articles` API route가 충돌하지 않음

---

## 9. 테스트 계획

### 9-1. 서버 테스트

파일: `server/test/news-routes.test.ts`

| 케이스 | 기대값 |
|---|---|
| 기본 목록 요청 | 200 + `articles[]` |
| `limit=0`, `limit=100` | 400 |
| 빈 검색어 | 검색 없이 목록 fallback |
| upstream 429 | stale 있으면 200, 없으면 502 |
| malformed upstream response | 502 `SCHEMA_MISMATCH` |
| timeout | stale 있으면 200, 없으면 502 |
| provider 응답에 url 없음 | 해당 article 제외 |

### 9-2. 프론트 테스트

파일: `web/test/news-page.test.ts`, `web/test/news-store.test.ts`

| 케이스 | 기대값 |
|---|---|
| 초기 렌더 | 제목, 필터, 검색, skeleton 표시 |
| 성공 응답 | 뉴스 카드 렌더 |
| 필터 클릭 | store query 변경 + 재조회 |
| 검색 입력 | debounce 후 재조회 |
| refresh 실패 | 기존 articles 유지 + error/stale 표시 |
| 빈 결과 | empty state 표시 |
| 원문 링크 | target/rel 속성 확인 |

### 9-3. 수동 확인

- `/news` 직접 접근 시 SPA fallback 정상
- `/market/news/articles` 직접 접근 시 JSON 반환
- 모바일 390px, 태블릿 768px, 데스크톱 1440px에서 텍스트 겹침 없음
- 외부 API 장애 상황에서 전체 화면이 깨지지 않음

---

## 10. 수용 기준

- `/news` 페이지에서 최신 뉴스 20개가 표시된다.
- 사용자는 asset, language, keyword로 목록을 좁힐 수 있다.
- 5분 TTL cache가 적용되어 반복 새로고침이 외부 API를 과도하게 호출하지 않는다.
- API 실패 시 안정적인 에러 응답 또는 stale 응답을 반환한다.
- 서버가 외부 응답을 Zod로 검증하고 canonical model로 정규화한다.
- 브라우저는 `cryptocurrency.cv`를 직접 호출하지 않는다.
- `npm test`와 `npm run build`가 통과한다.

---

## 11. 작업 티켓

### CBR-NEWS-1001 API 응답 확인 및 매핑표 작성

- Priority: P0
- Scope: `cryptocurrency.cv` endpoint 샘플 확인, `free-crypto-news` endpoint 재검토
- Artifacts: 응답 필드 매핑표, canonical model 확정
- DoD: 필수 필드 4개 이상 안정 매핑

### CBR-NEWS-1002 서버 뉴스 provider 구현

- Priority: P0
- Scope: `server/src/news/providers/cryptocurrencyCv.ts`
- DoD: 목록/검색/언어별 뉴스 호출, timeout, retry, schema validation

### CBR-NEWS-1003 뉴스 route 구현

- Priority: P0
- Scope: `server/src/routes/news.ts`, `server/src/app.ts`
- DoD: `/market/news/articles`, `/market/news/sources`, `/market/news/health` 동작

### CBR-NEWS-1004 뉴스 캐시/스테일 정책

- Priority: P0
- Scope: `server/src/news/cache.ts`
- DoD: 5분 TTL, 30분 stale fallback, 테스트 가능 clear hook

### CBR-NEWS-1005 프론트 API/store 구현

- Priority: P0
- Scope: `web/src/api/rest.ts`, `web/src/stores/news.ts`
- DoD: load/refresh/loadMore/filter/search 상태 관리

### CBR-NEWS-1006 뉴스 페이지 UI 구현

- Priority: P0
- Scope: `web/src/features/news/*`
- DoD: 필터, 검색, 카드, skeleton, empty, error, 더 보기

### CBR-NEWS-1007 라우팅/내비게이션 연결

- Priority: P1
- Scope: `web/src/router/index.ts`, landing 또는 news-local nav
- DoD: `/news` 직접 접근 가능, `/exchange`와 이동 가능

### CBR-NEWS-1008 테스트/빌드 검증

- Priority: P0
- Scope: `server/test/news-routes.test.ts`, `web/test/news-page.test.ts`, `web/test/news-store.test.ts`
- DoD: `npm test`, `npm run build` 통과

### CBR-NEWS-1009 free-crypto-news fallback 판단

- Priority: P2
- Scope: 실제 endpoint와 응답 schema 검증
- DoD: fallback 채택/보류 결정 기록. 미확정이면 코드에 넣지 않음

---

## 12. 리스크와 대응

| 리스크 | 영향 | 대응 |
|---|---|---|
| 외부 API CORS | 브라우저 직접 호출 실패 | Fastify 프록시 경유 |
| 외부 API 응답 변경 | UI 오류 | Zod schema + 502/stale fallback |
| 서버리스 cold start | cache 효과 제한 | 1차는 best-effort, 필요 시 KV 도입 |
| endpoint 문서 변화 | 구현 drift | 도입 직전 실제 응답 재확인 |
| 한국어 뉴스 부족 | 사용자 기대 불일치 | 언어 필터 기본값은 전체, 한국어는 선택 |
| 기사 저작권 | 전문 재게시 위험 | 제목/요약/출처/링크 중심 표시 |
| 검색 API 장애 | 검색 결과 없음 | 최신 목록 fallback 또는 에러 표시 |

---

## 13. 향후 확장

- `/market/news/trending`: 트렌딩 토픽/감성 카드
- `/market/news/related?market=KRW-BTC`: 현재 선택 코인 관련 뉴스
- exchange 화면의 `ExchangeHero` 또는 `MarketMovementPanel`에 관련 뉴스 3개 표시
- 사용자 watchlist 기반 뉴스 필터
- Vercel KV 기반 공유 cache/circuit breaker
- 상시 워커 기반 SSE/WebSocket 뉴스 수집

---

## 14. 참고 링크

- cryptocurrency.cv GitHub: https://github.com/nirholas/cryptocurrency.cv
- cryptocurrency.cv API/OpenAPI: https://cryptocurrency.cv/api/openapi.json
- cryptocurrency.cv README: https://raw.githubusercontent.com/nirholas/cryptocurrency.cv/main/README.md
- free-crypto-news GitHub: https://github.com/ahsan5197/free-crypto-news

기록: API 특성은 2026-06-22 기준 공개 저장소/README 확인 결과다. 실제 구현 전에는 live endpoint 응답과 제한 정책을 다시 확인한다.
