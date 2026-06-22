# Crypto News 504 장애 — 원인 분석 및 수정 결과

작성일: 2026-06-22
대상: `/market/news/articles`, `/market/news/sources` 504 Gateway Timeout
관련 구현: `docs/crypto-news-codex-handoff.md`(1차 구현 결과)
상태: **수정 완료**

---

## 1. 처리 결과

2026-06-22에 아래 수정 완료.

- `language=all` 기사 조회가 느린 `/api/news`를 먼저 호출하지 않도록 변경.
- `/market/news/articles`는 `/api/news/international` 계열을 1차 경로로 사용.
- `/market/news/sources`는 느린 `/api/news?limit=1` 동기 의존을 제거하고 정적 metadata를 반환.
- cold start에서 upstream `TIMEOUT/RATE_LIMIT/NETWORK_ERROR/UPSTREAM_ERROR`가 발생해도 articles route는 `504` 대신 `200 + articles: [] + degraded: true`를 반환.
- `TIMEOUT`의 error status 매핑도 `504`에서 `502`로 낮췄다. 단 articles route는 degradation 대상이면 error envelope까지 가지 않는다.
- 서버/프론트 타입에 optional `degraded`, `degradedReason` 필드를 추가.

변경 파일:

- `server/src/news/providers/cryptocurrencyCv.ts`
- `server/src/routes/news.ts`
- `server/src/news/types.ts`
- `web/src/stores/types.ts`
- `server/test/news-routes.test.ts`

검증 결과:

```bash
npm run build
npm run build --workspace server
npm test --workspace server -- news-routes.test.ts
```

로컬 endpoint 확인:

```text
GET http://localhost:4000/market/news/articles?asset=ALL&language=all&limit=20 -> 200
GET http://localhost:4000/market/news/sources -> 200
```

---

## 2. 증상

| 요청 | 결과 |
|---|---|
| `GET http://localhost:3000/market/news/articles?asset=ALL&language=all&limit=20` | 504 Gateway Timeout |
| `GET http://localhost:3000/market/news/sources` | 504 Gateway Timeout |
| `GET .../market/news/articles?language=ko&...` | 정상 (참고) |

---

## 3. 근본 원인 (확정)

### 2-1. 이 504는 프록시가 아니라 **앱이 의도적으로 반환**한 것

`server/src/routes/news.ts:50-55` `getUpstreamStatus()`가 provider 에러 `code === 'TIMEOUT'`을 **HTTP 504**로 매핑한다. provider(`cryptocurrencyCv.ts`)는 undici `headersTimeout/bodyTimeout = 3_000ms`(16줄)을 초과하면 `TIMEOUT`을 던진다. 즉 **upstream 3초 초과 → 앱이 504**.

### 2-2. 두 라우트 모두 느린/행 걸리는 `/api/news`에 의존

- `articles(language=all)` → `fetchRawFeed()`가 `language !== 'ko'`이므로 **`/api/news` 먼저 호출**(`cryptocurrencyCv.ts:144`). `/api/news?limit=20`이 응답하지 않아 3초 타임아웃 → 504. (행이 걸려 `/api/news/international` fallback에는 **도달조차 못 함**.)
- `sources` → **`/api/news?limit=1` 단일 호출**(`cryptocurrencyCv.ts:188`)에 전적으로 의존. 이 호출이 5초대라 3초 타임아웃 → 504.

### 2-3. live 측정 (2026-06-22, curl)

| endpoint | 상태 | 응답시간 |
|---|---|---|
| `/api/news?limit=20&page=1` | 무응답(행) | **>15s** |
| `/api/news?limit=1` | 200 | **5.2s** (3s 초과) |
| `/api/news/international?language=ko&limit=2` | 200 | **0.72s** (정상) |

→ `cryptocurrency.cv`의 무인증 `/api/news`는 현재 **느림~행** 상태이고, limit이 커질수록 악화. 유일하게 빠르고 안정적인 건 `/api/news/international` 계열인데 **실패 경로들이 이를 사용하지 않음.**

### 2-4. 콜드 스타트라 stale 폴백도 없음

`cache.ts:55-59` stale 반환은 **이전 성공 캐시(`current`)가 있을 때만** 동작한다. 서버 기동 후 첫 호출은 캐시가 없어 그대로 rethrow → 504. 즉 graceful degradation이 안 걸린다.

---

## 4. 수정 내용

핵심 방향: **느린 `/api/news`를 동기 핫패스 의존에서 제거**하고, 빠른 `/api/news/international`을 1차로, 그리고 **느린 upstream이 사용자에게 504로 새지 않도록** graceful degradation을 건다.

### P0-1. `language=all` 핫패스 교체 — 완료
- `fetchRawFeed()`에서 `language !== 'ko'`일 때 `/api/news` 우선 호출을 중단했다.
- `all`은 `language=ko` international feed를 사용한다.
- `en`은 `/api/news/international?language=en` 경로를 시도한다. upstream 상태에 따라 실패할 수 있으나, articles route의 degradation으로 504는 사용자에게 노출하지 않는다.
- 파일: `server/src/news/providers/cryptocurrencyCv.ts`.

### P0-2. `/market/news/sources`를 `/api/news` 동기 의존에서 분리 — 완료
`/api/news?limit=1`이 5초라 sources는 사실상 항상 504. 택1:
- 적용 방식: sources는 서버 정적 상수로 제공한다.
- 응답에는 `degraded: true`, `degradedReason`을 포함해 upstream metadata가 아닌 정적 fallback임을 명시한다.
- 파일: `server/src/news/providers/cryptocurrencyCv.ts` `fetchCryptoCurrencyCvSources()`.

### P0-3. upstream 지연이 504로 새지 않게 graceful degradation — 완료
- 콜드 스타트(stale 없음)에서 articles upstream이 `TIMEOUT/RATE_LIMIT/NETWORK_ERROR/UPSTREAM_ERROR`이면 `200 + articles: [] + degraded: true`를 반환한다.
- `SCHEMA_MISMATCH`는 구현 오류/계약 변화로 보고 기존처럼 error response를 유지한다.
- `health`는 실제 상태 노출 목적이므로 별도 degradation을 적용하지 않았다.
- 파일: `server/src/routes/news.ts`.

### P1-1. 타임아웃·재시도 점검
- 3초 타임아웃 자체는 적절(서버리스 budget). **올리지 말 것** — `/api/news?limit=20`은 15s+ 행이라 타임아웃을 올려도 해결 안 되고 함수 maxDuration만 위협.
- 필요 시 1회 재시도는 **빠른 endpoint에만** 적용.

### P1-2. handoff/plan 문서 동기화
- `crypto-news-page-plan.md` 3-1/6-2: `/api/news`를 1차 기사 피드에서 강등, `/api/news/international`을 1차로 명시.
- `crypto-news-codex-handoff.md` 8절 메모: "language=all/sources가 `/api/news`에 의존 → 504" 원인과 위 수정 반영.

상태: 미완료. 코드 수정은 완료됐고, 문서 동기화는 후속 정리 대상으로 남김.

---

## 5. 검증 방법 및 결과

수정 후 콜드 스타트(서버 재기동) 상태에서:

```bash
# 둘 다 504가 아니어야 함 (200, 가능하면 비어있지 않은 articles)
curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" \
  "http://localhost:4000/market/news/articles?asset=ALL&language=all&limit=20"
curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" \
  "http://localhost:4000/market/news/sources"
```

기대:
- 두 라우트 모두 **응답시간 < ~1.5s, status 200**.
- `language=all`이 실제 기사를 반환(빈 배열이면 P0-1 경로 재점검).
- upstream을 인위적으로 막아도(예: BASE_URL 오타) **504가 아니라 200+degraded/stale** 또는 명시적 에러 envelope.

실제 확인:

```text
GET /market/news/articles?asset=ALL&language=all&limit=20 -> 200, articles 반환
GET /market/news/sources -> 200, static metadata 반환
```

---

## 6. 한 줄 요약

`cryptocurrency.cv /api/news`가 현재 느림(5s)~행(>15s)인데 **두 실패 라우트가 이걸 동기 의존**하고, 3초 타임아웃을 앱이 504로 매핑 + 콜드 스타트 stale 부재로 그대로 노출됐다. → **빠른 `/api/news/international`로 1차 전환 + sources의 `/api/news` 의존 제거 + upstream 지연 시 504 대신 200/degraded** 로 고친다.
