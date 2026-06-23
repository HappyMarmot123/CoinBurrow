# 김치 프리미엄(Kimchi Premium) 기능 설계

- 작성일: 2026-06-23
- 상태: 설계 확정(구현 전)
- 범위: 업비트(KRW) vs 바이낸스(USDT) 실시간 가격 괴리율을 USD/KRW 환율로 환산해 코인별 김치 프리미엄을 보여주는 독립 페이지

## 1. 목적과 한 줄 정의

한국 거래소(업비트, KRW)와 글로벌 거래소(바이낸스, USDT) 사이의 가격 괴리를 USD/KRW 환율로 환산해 **코인별 김치 프리미엄(%)** 을 실시간으로 보여주는 독립 페이지 `/kimchi`를 추가한다.

계산식:

```
프리미엄(%) = upbitKRW / (binanceUSDT × USDKRW) − 1
```

- `upbitKRW`: 업비트 KRW 마켓 현재가(원)
- `binanceUSDT`: 바이낸스 USDT 마켓 현재가
- `USDKRW`: USD→KRW 환율
- 양수 = 프리미엄(국내가 더 비쌈), 음수 = 역프리미엄

## 2. 핵심 결정 요약

| 항목 | 결정 | 비고 |
|------|------|------|
| 노출 형태 | 독립 페이지 `/kimchi` + AppNav 메뉴 | `/sentiment` 패턴 재사용 |
| 대상 코인 | (업비트 KRW ∩ 바이낸스 USDT) 중 **업비트 24h 거래대금(KRW) 상위 30개**, 동적 | 고정 화이트리스트 아님 |
| 정렬(랭킹) 기준 | 업비트 `acc_trade_price_24h` | ticker에 이미 존재, 추가 요청 없음 |
| 실시간 갱신 | 워커 + RxJS 파이프라인 재사용 | 업비트는 기존 스트림, 바이낸스 WS 워커 신규 |
| 환율 소스 | 키 없는 `open.er-api.com/v6/latest/USD` | 서버 경유 캐싱 |
| 환율 실패 정책 | A: exchangerate-api → 업비트 환율 폴백 → 마지막 stale | 단일 실패점 보호 |
| 단위 근사 | USDT ≈ USD 로 근사 | 문서·툴팁에 명시 |

## 3. 외부 데이터 소스

### 3.1 업비트 (KRW) — 기존 인프라 재사용
- 이미 `marketSocket.worker.ts`(업비트 WS) → `pipeline.ts`(RxJS) → Pinia ticker store 흐름이 구축되어 있다.
- ticker 메시지에 김프에 필요한 값이 모두 포함된다: `tradePrice`(KRW 현재가), `accTradePrice24h`(정렬용 24h 거래대금).
- 따라서 **김프의 업비트 절반은 추가 요청 없이 기존 스트림 재사용**으로 해결된다.

### 3.2 바이낸스 (USDT) — 신규 WS 워커
- 바이낸스 공개 WebSocket 결합 스트림 사용: `wss://stream.binance.com:9443/stream?streams=<sym>@miniTicker/...`
- `@miniTicker`의 `c`(close/last price)를 현재가로 사용(프리미엄 계산엔 마지막 체결가만 필요 → miniTicker가 `@ticker`보다 경량).
- 대상 심볼은 §4의 universe(상위 30개)로 한정해 구독한다(전체 `!ticker@arr` 미사용 — 과도한 트래픽 회피).

### 3.3 환율 (USD/KRW) — 서버 경유, 키 불필요
- 엔드포인트: `GET https://open.er-api.com/v6/latest/USD` (**API 키 불필요**, 팩트체크 완료 2026-06-23).
- 응답 핵심 필드: `result:"success"`, `rates.KRW`, `time_last_update_unix`, `time_next_update_unix`.
- 제약: 24시간 1회 갱신, IP당 시간당 1회 권장(초과 시 429 + 20분 쿨다운).
- **서버 경유 캐싱 이유(보안 아님, 레이트리밋 풀링)**: 브라우저가 각자 호출하면 "시간당 1회" 한도에 걸려 429가 난다. 서버가 한 번 받아 전체 사용자에게 캐시로 분배하면 한도가 안전하고 호출이 최소화된다.
- **출처 표기 의무**: 페이지 푸터에 "Rates By Exchange Rate API"(→ exchangerate-api.com) 링크 필수.

### 3.4 USDT ≈ USD 근사
바이낸스 가격은 USD가 아니라 USDT 기준이고 환율은 USD/KRW다. 대부분의 김프 계산기와 동일하게 USDT ≈ USD로 근사한다. 이 근사는 문서·UI 툴팁에 명시한다. USDT 디페그가 발생하면 김프에 그만큼 오차가 생긴다는 점을 알려준다.

## 4. 대상 코인(universe) 해석

상위 30개 동적 선정은 서버에서 해석해 클라이언트에 매핑 결과만 전달한다(바이낸스 심볼 전량을 클라이언트로 보내지 않고, 매핑 로직을 한 곳에 집중).

해석 절차:
1. 업비트 KRW 마켓 목록 + ticker 조회 → `acc_trade_price_24h` 확보 (`fetchMarkets`, `fetchTickers` 재사용).
2. 바이낸스 USDT 심볼셋 조회(exchangeInfo 또는 ticker 목록), 길게 캐싱.
3. 두 집합의 교집합을 업비트 24h 거래대금 내림차순 정렬 → 상위 30개.
4. 각 항목을 `{ upbitMarket, binanceSymbol, base, koreanName, accTradePrice24h }`로 매핑.

심볼 매핑 규칙: 업비트 `KRW-{BASE}` → 바이낸스 `{BASE}USDT`. 베이스 심볼이 다른 예외 케이스(향후 발견 시)는 매핑 테이블로 보정한다.

캐시: universe 멤버십은 천천히 바뀌므로 수 분 단위 캐싱.

## 5. 데이터 흐름

```
[서버]
 ├ GET /market/kimchi/universe
 │     업비트 markets+tickers(거래대금 정렬) ∩ 바이낸스 USDT 심볼셋 → top30
 │     반환: [{ upbitMarket, binanceSymbol, base, koreanName, accTradePrice24h }]
 │     캐시: 수 분
 └ GET /market/fx
       open.er-api.com 호출, cachedWithStale(fresh≈1h / stale≈24h)
       폴백: 실패 시 업비트 fetchExchangeRates → 그래도 실패 시 마지막 stale → 전부 실패 시 degraded
       반환: { base:"USD", krw, fetchedAt, stale, next }

[클라이언트]
 1) universe 로드 → 대상 30개 확정
 2) 업비트 ticker 구독(기존 useMarketSocket): tradePrice(KRW), accTradePrice24h
 3) 바이낸스 WS 워커 구독(신규): symbol → lastPrice(USDT)
 4) /market/fx 주기 fetch(예: 30분) → krw
 5) 김프 계산 store(파생): 위 3개 입력을 reactive 결합 → 행별 premium%
```

## 6. 신규/변경 파일

기존 코드베이스 패턴(`freeapi` 어댑터, `cachedWithStale`, degraded 응답, 워커+RxJS, Pinia store, AppNav 라우팅)을 그대로 따른다.

### 서버
- `server/src/kimchi/binanceSymbols.ts` — 바이낸스 USDT 심볼셋 조회(`cached` 길게)
- `server/src/kimchi/universe.ts` — 교집합 + 상위 30 + 심볼 매핑 로직
- `server/src/fx/provider.ts` — open.er-api 호출 + 업비트 폴백 + 스키마(zod)
- `server/src/routes/kimchi.ts` — `/market/kimchi/universe` (degraded 패턴)
- `server/src/routes/fx.ts` — `/market/fx` (degraded 패턴)
- `server/src/app.ts` — 라우트 등록 2건 추가
- `server/test/kimchi.routes.test.ts`, `server/test/fx.routes.test.ts`, `server/test/universe.test.ts`

### 클라이언트(web)
- `web/src/workers/binanceSocket.worker.ts` — 바이낸스 WS 연결 유지(결합 스트림), 자동 재연결
- `web/src/workers/binancePipeline.ts` — RxJS 정규화(throttle/buffer) + zod 검증 (`pipeline.ts` 미러링)
- `web/src/composables/useBinanceSocket.ts` — 워커 ↔ 스토어 브리지 (`useMarketSocket` 미러링)
- `web/src/stores/binance.ts` — 바이낸스 가격 store (symbol → lastPrice)
- `web/src/stores/fx.ts` — 환율 store (krw, stale)
- `web/src/stores/kimchi.ts` — universe + 파생 김프 계산(getter)
- `web/src/api/rest.ts` — `getKimchiUniverse`, `getFx` 추가
- `web/src/features/kimchi/KimchiPage.vue` — 페이지 컨테이너(로딩/에러/degraded)
- `web/src/features/kimchi/KimchiTable.vue` — 김프 표(정렬 헤더)
- `web/src/router/index.ts` — `/kimchi` 라우트 추가
- `web/src/components/AppNav.vue` — "김치 프리미엄" 메뉴 추가
- `web/src/shared/validation/schemas/ws/binance.ts` — 바이낸스 WS 메시지 스키마

## 7. 표(UI) 구성

열: `[코인 | 업비트(KRW) | 바이낸스(KRW 환산) | 김프 % | 24h 거래대금]`

- 코인: 한글명 + 심볼(업비트 마켓 메타 재사용)
- 바이낸스(KRW 환산): `binanceUSDT × USDKRW` — 같은 단위로 직관 비교. 원본 USDT가는 툴팁/보조 표시.
- 김프 %: 양수=프리미엄(상승색)/음수=역프(하락색)
- 24h 거래대금: 정렬 기준 표시
- 기본 정렬: **김프 내림차순**, 헤더 클릭으로 정렬 토글
- 푸터: **"Rates By Exchange Rate API"** 출처 링크(의무) + USDT≈USD 근사 안내

## 8. 에러 / degraded 처리

- universe 로드 실패 → 페이지 빈 상태 + 재시도 버튼
- fx degraded → 김프/바이낸스(환산) 열 "—" 표시 + degraded 배너(업비트가는 표시 유지)
- 바이낸스 WS 끊김 → 기존 패턴처럼 3초 후 자동 재연결, 해당 행 김프 일시 stale 표시
- WS 메시지 검증 실패 → 기존 `validation-health` 패턴 재사용
- 서버 라우트는 소프트 장애를 200 degraded로 반환(news/sentiment 라우트와 동일 전략)

## 9. 비목표 (YAGNI, 1차 범위 제외)

- 역프/특정 임계 김프 알림·푸시
- 과거 김프 시계열 차트
- 바이낸스 외 글로벌 거래소 선택
- 김프 차익거래(수수료·송금 포함) 계산기
- USDT/KRW 직접 환율(현재는 USD/KRW 근사 사용)

## 10. 미해결/후속 확인 사항

- 바이낸스 심볼셋 조회를 exchangeInfo로 할지 ticker 목록으로 할지(구현 시 응답 크기·안정성 비교 후 결정).
- 바이낸스 WS 결합 스트림의 구독 심볼 변경(universe 갱신) 시 재구독 전략 — 구현 단계에서 확정.
- 클라이언트 fx 폴링 주기(기본 30분)와 서버 캐시 TTL의 정합 — 구현 시 상수로 고정.
