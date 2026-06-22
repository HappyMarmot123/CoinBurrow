# Crypto News Page — Codex Handoff

작성일: 2026-06-22  
대상: `docs/crypto-news-page-plan.md` 기반 구현 결과  
상태: 1차 구현 완료, 추가 정리/후속 개선 필요

---

## 1. 현재 구현 요약

CoinBurrow에 `/news` 페이지와 Fastify 기반 뉴스 프록시 API를 추가했다.

### 사용자-facing 경로

- 페이지: `http://localhost:3000/news`
- 서버 API:
  - `GET /market/news/articles`
  - `GET /market/news/sources`
  - `GET /market/news/health`

### 구현된 주요 기능

- `cryptocurrency.cv` 기반 뉴스 조회
- 한국어 뉴스 feed 우선 지원
- 기본 feed가 비어 있을 때 한국어 international feed fallback
- 검색어/자산/언어 필터
- 5분 TTL cache + 30분 stale fallback
- stale cache 반환 시 `stale: true`, article별 `isStale: true`
- 외부 API 응답 Zod 검증 후 canonical model 정규화
- Vue `/news` 화면: 필터, 검색, 새로고침, skeleton, empty/error state, 더 보기 버튼

---

## 2. 변경 파일

### 서버

- `server/src/app.ts`
  - `registerNewsRoutes(app)` 등록
- `server/src/routes/news.ts`
  - `/market/news/articles|sources|health` route 추가
- `server/src/news/types.ts`
  - canonical 뉴스 DTO
- `server/src/news/schemas.ts`
  - upstream feed/health Zod schema
- `server/src/news/normalize.ts`
  - article 정규화, asset/category/sentiment 추론
- `server/src/news/cache.ts`
  - TTL + stale cache
- `server/src/news/providers/cryptocurrencyCv.ts`
  - `cryptocurrency.cv` REST client
- `server/test/news-routes.test.ts`
  - route, schema mismatch, stale fallback, source/health 테스트

### 프론트엔드

- `web/src/router/index.ts`
  - `/news` route 추가
- `web/src/api/rest.ts`
  - `getNewsArticles`, `getNewsSources`, `getNewsHealth` 추가
- `web/src/stores/types.ts`
  - 뉴스 DTO 타입 추가
- `web/src/stores/news.ts`
  - Pinia 뉴스 상태/store
- `web/src/constants/news.ts`
  - asset/language/page size 상수
- `web/src/features/news/*`
  - `NewsPage.vue`, `NewsFilters.vue`, `NewsCard.vue`, `NewsSkeleton.vue`, `NewsEmptyState.vue`
- `web/test/news-store.test.ts`
- `web/test/news-page.test.ts`

### 기타

- `web/src/workers/protocol.ts`
  - 기존 worker가 실제로 emit하던 `validation-error` variant를 타입에 추가했다.
  - 신규 뉴스 기능과 직접 관련은 없지만, `vue-tsc` 빌드가 기존 타입 누락으로 실패해 실제 동작/테스트에 맞춰 보정했다.

---

## 3. 외부 API live 확인 결과

2026-06-22 기준 PowerShell `Invoke-RestMethod`로 확인했다.

| Endpoint | 결과 | 판단 |
|---|---|---|
| `GET https://cryptocurrency.cv/api/news?limit=2` | `200`, `articles: []`, sources/categories/languages metadata 반환 | source/category metadata 확인용으로 사용 가능. 기사 feed는 비어 있을 수 있음 |
| `GET https://cryptocurrency.cv/api/news/international?language=ko&limit=2` | `200`, 실제 기사 반환 | 현재 1차 기사 feed로 사용 |
| `GET https://cryptocurrency.cv/api/articles?limit=2` | `200`, `{ success: true, count: 0, articles: [] }` | OpenAPI상 존재하지만 현재 keyless 기사 확보 실패 |
| `GET https://cryptocurrency.cv/api/articles?ticker=BTC&limit=2` | `200`, `{ success: true, ticker: "BTC", count: 0, articles: [] }` | 자산 필터용 primary로 쓰기에는 부적합 |
| `GET https://cryptocurrency.cv/api/search?q=bitcoin&limit=2` | `402 Payment Required` | 사용 금지. 검색은 서버 로컬 필터로 처리 |
| `GET https://cryptocurrency.cv/api/data-sources` | `402 Payment Required` | 사용 금지 |
| `GET https://cryptocurrency.cv/api/health` | `200`, status는 `healthy/degraded` 가능 | `/market/news/health`에서 사용 |
| `GET https://cryptocurrency.cv/api/openapi.json` | OpenAPI에 `/api/news`, `/api/news/international`, `/api/articles`, `/api/data-sources` 모두 존재 | 이전 handoff의 “`/api/news` 없음” 전제는 현재 live 결과와 불일치 |

### Endpoint 선택 결론

- 현재 코드는 `/api/news/international?language=ko`를 실제 기사 feed로 사용한다.
- `/api/news`는 metadata 및 영어/전체 feed 시도용으로 유지한다.
- `/api/articles`는 OpenAPI에는 있지만 keyless 호출에서 빈 결과만 확인되어 primary로 전환하지 않았다.
- `/api/search`, `/api/data-sources`, `/api/breaking`은 무료 표면이 불안정하거나 402 가능성이 있어 1차 범위에서 제외한다.

---

## 4. 현재 provider 동작

파일: `server/src/news/providers/cryptocurrencyCv.ts`

### Articles

- `language=ko`
  - `/api/news/international?language=ko&limit=...&page=...`
- `language=all`
  - 먼저 `/api/news?limit=...&page=...`
  - 응답 article이 비어 있으면 `/api/news/international?language=ko&limit=...&page=...`로 fallback
- `language=en`
  - `/api/news?limit=...&page=...&lang=en`

### 검색/자산/카테고리

- 외부 `/api/search`가 402이므로 서버 정규화 후 로컬 필터 적용
- asset filter는 title/summary/category에서 BTC/ETH/SOL/DeFi 등 추론
- category는 upstream에 전달하되, 최종적으로 canonical article에서 한 번 더 필터

### Cache

- TTL: `300_000ms`
- stale TTL: `1_800_000ms`
- stale cache가 있으면 upstream 실패 시 `200` + `stale: true`
- stale cache가 없으면 stable error response 반환

---

## 5. 검증 결과

통과:

```bash
npm run build
npm test --workspace web
npm test --workspace server -- news-routes.test.ts
```

추가로 live dev server에서 확인:

```text
http://localhost:3000/news -> 200
http://localhost:4000/market/news/articles?language=ko&limit=1 -> JSON article 반환
http://localhost:3000/market/news/articles?language=ko&limit=1 -> Vite proxy 경유 JSON article 반환
```

주의:

```bash
npm test --workspace server
```

전체 서버 테스트는 현재 실패한다. 신규 `news-routes.test.ts`는 통과하지만, 기존 `server/test/routes.test.ts`의 market route 테스트가 현재 market API 구현과 서로 다른 응답 계약을 기대한다.

실패 원인:

- 일부 테스트는 `{ success: true, data, timestamp }` envelope를 기대
- 현재 `server/src/routes/market.ts`와 `web/test/rest.test.ts`는 raw array/object 응답을 기준으로 동작
- Upbit error도 테스트는 normalized envelope를 기대하지만 구현은 `{ error: "upstream unavailable" }` 반환

뉴스 구현에서 새로 만든 실패는 아니며, market route 계약 정리 작업이 별도로 필요하다.

---

## 6. 알려진 한계

- `cryptocurrency.cv` free/keyless 표면이 endpoint별로 다르다.
  - `/api/news/international`은 현재 유효
  - `/api/search`, `/api/data-sources`는 402
  - `/api/articles`는 200이지만 빈 결과
- 한국어 international feed에는 순수 crypto 외 경제/주식성 기사도 섞일 수 있다.
- `language=en`은 현재 `/api/news`가 빈 기사 배열을 줄 가능성이 있다.
- `free-crypto-news`는 코드에 구현하지 않았다. 독립 fallback으로 확정하지 말 것.
- `/api/articles` 전환은 “비어 있지 않은 articles 샘플” 확보 전까지 보류한다.

---

## 7. 다음 작업 권장 순서

1. `docs/crypto-news-page-plan.md` 정리
   - `free-crypto-news` fallback 후보 문구 제거 또는 “보류”로 격하
   - `/api/search`, `/api/data-sources`는 무료 1차 범위 제외로 명시
   - `/api/news/international` 중심 구현 결과 반영

2. Market route 테스트 계약 정리
   - raw response를 유지할지 envelope로 통일할지 결정
   - 결정 후 `server/test/routes.test.ts` 또는 `server/src/routes/market.ts` 중 하나를 맞춘다.

3. News feed 품질 개선
   - 한국어 feed에서 crypto 관련도가 낮은 article 필터링
   - `assets.length === 0`인 general 기사 처리 기준 결정
   - source allowlist 또는 title/summary keyword scoring 도입 검토

4. 독립 fallback 검토
   - `cryptocurrency.cv`와 운영 주체가 다른 RSS/Atom 직접 파싱 후보 조사
   - API key 없는 fallback이 없으면 단일 소스 + stale cache를 공식 정책으로 유지

5. UI 접근 경로 보완
   - landing 또는 exchange 화면에서 `/news`로 가는 링크 추가
   - 공통 `AppShell`은 landing 레이아웃 영향이 있으므로 후속 리팩터링으로 분리

---

## 8. 다음 Codex에게 남기는 핵심 메모

- `/api/articles`가 OpenAPI에 있다고 해서 바로 전환하지 말 것. 현재 keyless 호출은 빈 결과만 확인됐다.
- 기사 데이터는 `/api/news/international?language=ko`가 가장 안정적으로 반환했다.
- `/api/search`는 402라서 검색은 서버 로컬 필터로 처리 중이다.
- `/market/news/...` prefix는 Vercel 기존 rewrite를 재사용하므로 `vercel.json` 변경이 필요 없다.
- `free-crypto-news` fallback은 구현하지 않았고, 독립 fallback으로 간주하지 않는다.
- 전체 빌드는 통과했다. 전체 서버 테스트 실패는 기존 market route 응답 계약 불일치가 원인이다.
