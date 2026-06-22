# Free API 502 장애 — 원인 분석 및 수정 계획

작성일: 2026-06-22
대상: `/market/freeapi/bybit/derivatives`, `/market/freeapi/coingecko/meta` 502 Bad Gateway
관련: `free-api-survey-2026-06-22.md`(5-1/5-5), `crypto-news-504-incident.md`(유사 패턴)

---

## 1. 증상

| 요청 | 결과 |
|---|---|
| `GET /market/freeapi/bybit/derivatives?symbol=KRW-BTC&category=spot` | 502 |
| `GET /market/freeapi/coingecko/meta?coinId=bitcoin` | 502 (간헐적) |
| `GET /market/freeapi/coingecko/meta?coinId=btc` | 502 |

공통: `freeapi.ts:96`이 `FreeApiError`(코드 `INVALID_SYMBOL` 외)를 전부 **502**로 매핑한다.

---

## 2. 근본 원인 (live 확인, 2026-06-22)

### 2-1. Bybit derivatives — KRW 스킵 가드 무력화(심볼 파싱 버그) + `category=spot`

확인된 502 응답 body:
```json
{ "success": false, "code": "UPSTREAM_ERROR", "message": "Upstream response failed", "timestamp": 1782110255008 }
```

**진짜 트리거 = `useDerivatives.ts`의 base/quote 뒤바뀜.** 업비트 마켓 포맷은 **`QUOTE-BASE`**(`KRW-BTC` = quote KRW, base BTC)인데 코드가 첫 토큰을 base로 읽는다:

```ts
const [base, quote] = raw.trim().split("-");   // "KRW-BTC" → base="KRW", quote="BTC" (swap!)
...
if (quote === "KRW") return false;             // quote가 "BTC"라 통과 → KRW 마켓이 호출됨
```

→ KRW 스킵 가드가 동작하지 않아 **KRW 마켓이 파생 API로 호출**되고, 게다가 **raw 마켓 문자열(`KRW-BTC`) 자체를 symbol로 전달**한다(base만 보내야 함).

연쇄로:
- 어댑터(`bybit.ts:112`)가 `/v5/market/open-interest`, `/v5/market/funding/history`를 **`category=spot`** (그리고 잘못된 symbol)으로 호출.
- 이 두 엔드포인트는 **파생(linear/inverse) 전용** → live 확인 **HTTP 200 + body `retCode=-1004 "Illegal category"`**.
- `assertSuccessfulResponse`(bybit.ts:151)가 retCode≠0 → `UPSTREAM_ERROR` throw → **502** (응답 body와 일치).

부수 원인 2개:
- `CATEGORIES = ["linear","spot"]`(useDerivatives.ts:6) — **`spot` 시도는 파생 API에서 항상 -1004**라 무의미한 502를 만든다.
- `toBybitSymbol = toBinanceSymbol`(symbols.ts:65) → `KRW-BTC`가 Bybit 무기한에 없는 심볼로 변환. 올바르게 고쳐도 **base→USDT 무기한(`BTCUSDT`) 매핑** 필요, **무기한 없는 코인은 "데이터 없음"(null)** 처리돼야 함(현재 throw→502).

### 2-2. CoinGecko meta — 두 가지 별개 원인

- **(a) `coinId=btc` → HTTP 404 → 502.** CoinGecko 정식 id는 `bitcoin`이며 `btc`는 없음. 호출자가 **심볼을 coin id로 잘못 전달**.
- **(b) `coinId=bitcoin` → keyless 레이트리밋(429) → 502.** live 버스트 결과:
  ```
  try1~4: 200
  try5,6: 429   (4회만에 차단)
  ```
  앱이 코인 선택/Hero/메타 drawer로 메타를 반복 호출 → 같은 IP에서 429 → `RATE_LIMIT` → 502. **간헐적**(한도 내 200, 초과 502). free-api-survey 5-5절 "keyless 정책 변동 → 캐시·fallback 필요"가 그대로 발현.

### 2-3. 요약표

| 요청 | upstream 실제 | 502 원인 |
|---|---|---|
| bybit `KRW-BTC`/spot | retCode -1004 Illegal category | **base/quote 파싱 swap으로 KRW 스킵 가드 무력화** → KRW 마켓+raw symbol+spot을 파생 API에 호출 |
| coingecko `btc` | HTTP 404 | 심볼을 coin id로 잘못 전달(btc→bitcoin) |
| coingecko `bitcoin` | HTTP 429(반복) | keyless 레이트리밋, 캐시/degraded 부족 |

---

## 3. 수정 계획

### P0-1. Bybit: 심볼 파싱 swap 수정 + 카테고리/심볼 매핑 + "데이터 없음" 비502화
- **(핵심) `useDerivatives.ts` 심볼 파싱 수정** — 업비트는 `QUOTE-BASE`다. `const [base, quote] = raw.split("-")`를 **`[quote, base]`** 로 바로잡아 KRW 스킵 가드가 실제로 동작하게 한다.
- 호출자: 코인 **base로 무기한 심볼 파생**(`BTC`→`BTCUSDT`), **`category=linear` 고정**. `CATEGORIES`에서 **`spot` 제거**. KRW 전용/무기한 없는 코인은 **호출 스킵**.
- 서버(`server/src/freeapi/adapters/bybit.ts`): `retCode -1004`(illegal category) 등 **명백한 "해당 없음"은 `null` 반환**, 진짜 장애(5xx/429)만 502.
- 파일: `useDerivatives.ts`(파싱·카테고리), `bybit.ts`(soft null), (심볼 매핑) `symbols.ts`.

### P0-2. CoinGecko: 심볼→coin id 매핑
- 호출자(`web/src/composables/useCoinMeta.ts`)가 **항상 정식 CoinGecko id**를 넘기도록 매핑(`btc→bitcoin`, `eth→ethereum` …). 최소한 타깃 코인용 매핑 테이블.
- 매핑 실패 시 호출 스킵(404를 502로 만들지 말 것).
- 파일: `useCoinMeta.ts`(+ 매핑 상수).

### P0-3. CoinGecko: 레이트리밋 내성 (429→degraded, 캐시 강화)
- 캐시 TTL 상향(메타는 거의 안 변함 → 분 단위가 아니라 **시간~하루**). `COINGECKO_META_TTL_MS`(policy.ts) 점검.
- 429/upstream 실패 시 **502 대신 `null`/마지막 정상값(stale)** 반환 → UI는 메타만 숨김(뉴스 degraded 패턴 동일).
- **CoinPaprika fallback**(survey 5-5/5-6: 메타 백업) 연결 — CoinGecko 실패 시 전환.
- (선택) `x-cg-demo-api-key` env 지원으로 한도 상향 — 단 "keyless 원칙"과 충돌하므로 옵션.
- 파일: `coingecko.ts`, `policy.ts`, `freeapi.ts`(soft-fail 매핑), (fallback) `coinpaprika.ts`.

### P1. 라우트 레벨 degraded 정책
- meta/derivatives처럼 **"없어도 화면이 도는" 보조 기능**은 upstream 실패 시 **502 대신 200 + null/`degraded:true`** 를 기본으로(검색 핵심이 아님). 진짜 장애만 5xx.
- 파일: `freeapi.ts` `withParsedQuery` 에러 매핑.

---

## 4. 검증 방법

```bash
# 1) 파생: KRW 현물은 호출 스킵 또는 null(패널 숨김), 502 아님
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:4000/market/freeapi/bybit/derivatives?symbol=KRW-BTC&category=spot"
# 정상 무기한은 데이터 반환
curl -s "http://localhost:4000/market/freeapi/bybit/derivatives?symbol=BTC%2FUSDT&category=linear"

# 2) coingecko: 심볼 입력도 매핑되어 동작
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:4000/market/freeapi/coingecko/meta?coinId=btc"      # → 200(bitcoin로 매핑) 또는 깔끔한 빈응답
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:4000/market/freeapi/coingecko/meta?coinId=bitcoin"  # → 200, 연속 호출도 캐시로 429 회피
```

기대:
- 파생/메타 모두 **502 미발생**. 데이터 없거나 한도 초과 시 **200 + null/degraded**.
- CoinGecko는 캐시로 반복 호출 시 upstream 재요청 최소화(429 회피).
- 파생이 실제 있는 무기한 심볼은 funding/OI 반환.

---

## 5. 결정 필요 항목

1. **파생 적용 범위** — KRW 전용/무기한 없는 코인은 패널 자체를 숨길지(스킵) vs 항상 호출 후 null.
2. **CoinGecko 한도 대응** — 캐시 강화+degraded만으로 갈지, CoinPaprika fallback까지 붙일지, demo key(env) 허용할지.
3. **소프트 실패 일반화** — freeapi 보조 엔드포인트(meta/derivatives) 전반을 "실패 시 200+null" 정책으로 통일할지.

---

## 6. 한 줄 요약

파생 502의 진짜 트리거는 **`useDerivatives`의 base/quote 파싱 swap**으로 KRW 스킵 가드가 무력화돼 KRW 마켓+spot이 파생 API로 호출된 것(retCode -1004). 메타 502는 **심볼을 coin id로 오전달(btc)** + **CoinGecko keyless 429**다. → **심볼 파싱/카테고리/coinId 매핑을 정정**하고, **보조 기능(meta/derivatives) 실패는 502 대신 200+null/degraded + 캐시·fallback 강화**로 고친다.
