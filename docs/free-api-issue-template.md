# CoinBurrow Free API - Issue Template Set

이 문서는 `docs/free-api-survey-2026-06-22.md`의 티켓(13-2, 13-3)을 바로 실행 가능한 형태로 확장한 것이다.
단, 이번 구현 범위는 **키 발급이 필요 없는 공개 API만** 대상으로 한다.

---

## A) 공통 Issue 포맷

**Title**
`[CBR-API-100X] {{요약}`

**Labels**
`api`, `provider`, `phase-{{N}}`, `priority-{{P0|P1|P2}}`

**Template**

```text
## 개요
- 목적: {{1~2줄}}
- 기한: {{YYYY-MM-DD}}

## 범위
- Provider: {{provider}}
- Capability: {{market|orderbook|kline|derivatives|meta}}
- Endpoint:
  - {{endpoint1}}
  - {{endpoint2}}
- 변경 파일:
  - {{목록}}

## 구현 항목
- [ ] {{작업1}}
- [ ] {{작업2}}
- [ ] {{작업3}}

## 실패/재시도 정책
- 429/RateLimit: {{처리 방식}}
- Timeout: {{처리 방식}}
- Fallback: {{primary -> backup -> cache 규칙}}

## 수용 조건
- [ ] 성공률: {{수치}}
- [ ] 레이턴시: {{수치}}
- [ ] 폴백/Failover: {{수치 또는 시나리오}}
- [ ] 로그: {{필수 로그 항목}}

## 테스트
- [ ] 정상 응답 파싱
- [ ] 타입/필드 누락 대응
- [ ] 실패 시나리오(429/timeout/invalid)

## 롤백
- {{문제 시 비활성화 토글 또는 기능 축소 기준}}
```

---

## B) 티켓 본문(복붙 가능한 완성본)

### B-1001 `Binance Adapter`

```text
## 개요
- 목적: Binance spot market/orderbook/candle을 수집해 내부 canonical 모델로 저장한다.
- 기한: 2026-07-01

## 범위
- Provider: binance
- Capability: market, orderbook, kline
- Endpoint:
  - /api/v3/ticker/24hr
  - /api/v3/ticker/bookTicker
  - /api/v3/depth
  - /api/v3/klines
- 변경 파일:
  - src/server/integration/adapters/binance.adapter.ts
  - src/server/domain/binance/
  - src/server/shared/normalizer/symbol.ts

## 구현 항목
- [x] endpoint별 응답을 zod/정규화 스키마에 통합
- [x] symbol 정규화(`BTCUSDT` -> `BTC/USDT`) 적용
- [x] ms 단위 타임스탬프 정규화 정책 적용
- [x] limiter에서 `X-MBX-USED-WEIGHT` 반영
- [x] 1차 중복 제거 후 market-job 저장

## 실패/재시도 정책
- 429/RateLimit: 1차 backoff 30초, `Retry-After` 있으면 우선 적용
- 5xx: exponential backoff(1초, 2초, 4초)
- Fallback: bybit/kraken의 보조 소스로 전환 후 stale cache 유지

## 수용 조건
- [ ] 1분 실패율 1% 이하
- [ ] 중복 symbol 0건
- [ ] p95 latency 2초 이하
- [ ] mismatch 이벤트가 alert 로그에 남음

## 테스트
- [ ] 정상 응답 파싱
- [ ] 필수 필드 누락 시 처리
- [ ] 429 1건 시뮬레이션 + 재시도 동작

## 롤백
- feature flag `provider.binance.enabled` false 처리 후 KuCoin/kraken 경유로 우회.
```

### B-1002 `Bybit Derivatives`

```text
## 개요
- 목적: Bybit 펀딩/오픈인터레스트 지표를 파생 데이터로 수집해 장기/초단기 스코어에 반영한다.
- 기한: 2026-07-03

## 범위
- Provider: bybit
- Capability: derivatives, market
- Endpoint:
  - /v5/market/open-interest
  - /v5/market/funding/history
  - /v5/market/tickers
- 변경 파일:
  - src/server/integration/adapters/bybit.adapter.ts
  - src/server/domain/derivatives/

## 구현 항목
- [ ] category 파라미터별 매핑 표준화(spot/linear/inverse/option)
- [ ] 파생 DTO 생성 및 재사용
- [ ] derivatives-job 10초 주기 등록
- [ ] 공백값/누락값 방어 코드 반영

## 실패/재시도 정책
- 429/RateLimit: provider-level queue 감소 + 재시도 보류
- 10006/10016 오류: category/심볼 스키마 재검증 후 비정상 요청 차단
- Fallback: OKX 파생 경로로 교체

## 수용 조건
- [ ] 1분 누락률 1개 이하
- [ ] 연속 재시도 dead-loop 없음
- [ ] category mismatch가 경고 로그로 남음

## 테스트
- [ ] category mismatch 실패 테스트
- [ ] open-interest 응답 누락 시 안전 처리
- [ ] 429+재시도 성공 시나리오

## 롤백
- derivatives 채널 off 후 Binance/OKX 조합으로 최소 기능 유지.
```

### B-1003 `Bithumb KRW`

```text
## 개요
- 목적: KRW 마켓 티커/호가/캔들 정보를 Bithumb 기반으로 통합해 업비트 미보유 구간 보완.
- 기한: 2026-07-04

## 범위
- Provider: bithumb
- Capability: market, orderbook, kline
- Endpoint:
  - /public/ticker/ALL_TICKER
  - /public/ticker/{currency}
  - /public/orderbook/{currency}
  - /public/candlestick/{currency}
- 변경 파일:
  - src/server/integration/adapters/bithumb.adapter.ts
  - src/server/domain/krw-normalizer.ts

## 구현 항목
- [ ] KRW 심볼 정규화맵 구축
- [ ] ticker/orderbook/candles 병렬 조회(요청 제한 준수)
- [ ] 문자열 수치 파싱 유틸 적용
- [ ] KRW-only 모드에서 stale fallback 정책 적용

## 실패/재시도 정책
- 429/요청 제한: 1회 재시도 후 간격 확대
- timeout: 즉시 재요청 1회 후 backup 유지
- Fallback: provider down 시 최신 캐시 유지

## 수용 조건
- [ ] KRW 조회에서 symbol 변환 실패 0건
- [ ] ALL_TICKER와 per-symbol 조회 동기화 지연 30초 이내
- [ ] 업비트 overlap 구간에서 불필요 중복 노출 없음

## 테스트
- [ ] BTC/KRW, ETH/KRW 정상 조회
- [ ] 잘못된 currency 입력 처리
- [ ] 응답 문자열 숫자 파싱 테스트

## 롤백
- KRW 마켓 표시 비활성화 후 Spot만 동작.
```

### B-1004 `CoinGecko Meta`

```text
## 개요
- 목적: 프로젝트 메타 정보를 수집해 코인 정보 페이지 품질을 높인다.
- 기한: 2026-07-06

## 범위
- Provider: coingecko
- Capability: meta
- Endpoint:
  - /api/v3/simple/price
  - /api/v3/coins/{id}
  - /api/v3/coins/markets
  - /api/v3/coins/{id}/market_chart
- 변경 파일:
  - src/server/integration/adapters/coingecko.adapter.ts
  - src/server/domain/meta/

## 구현 항목
- [ ] coinId 매핑 테이블 구축
- [ ] keyless 정책 실패 fallback 규칙 적용
- [ ] 메타 TTL 캐시 레이어 적용
- [ ] 메타 변경 감지 시 cache refresh

## 실패/재시도 정책
- keyless 실패: CoinPaprika 보조 fallback + 30분 backoff
- invalid payload: 기본값 처리 후 에러 카운트만 증가
- Fallback: 기존 값 유지 + freshness tag 갱신 실패 로그

## 수용 조건
- [ ] coinId 매핑 실패율 0.5% 이하
- [ ] meta 동기화 실패가 전체 수집을 블로킹하지 않음
- [ ] 캐시 miss ratio 추적

## 테스트
- [ ] 정상/404 coinId
- [ ] keyless 제한 모사(429 유사 응답) 후 fallback
- [ ] TTL 갱신 주기 테스트

## 롤백
- 메타 표기 비활성 + 마지막 정상 메타 유지.
```

### B-1005 `CoinPaprika Meta`

```text
## 개요
- 목적: 이벤트/팀/백서 링크 등 보강형 메타를 수집한다.
- 기한: 2026-07-07

## 범위
- Provider: coinpaprika
- Capability: meta
- Endpoint:
  - /v1/coins
  - /v1/coins/{coin_id}
  - /v1/tickers/{coin_id}
  - /v1/coins/{coin_id}/events
- 변경 파일:
  - src/server/integration/adapters/coinpaprika.adapter.ts
  - src/server/domain/meta/coinpaprika.mapper.ts

## 구현 항목
- [ ] 이벤트/소개/팀 정보 수집 파이프라인
- [ ] 월간 제한을 고려한 배치 스케줄 추가
- [ ] CoinGecko 보조 시 meta 병합 규칙 수립
- [ ] 이벤트 노출 정책(최신 우선) 적용

## 실패/재시도 정책
- 월간 제한 도달: 자동 텀블링 + 다음 스케줄 대기
- 404/empty 응답: soft-fail로 무시
- Fallback: CoinGecko 메타 채움 시도

## 수용 조건
- [ ] 이벤트/소개 항목 누락률 감소
- [ ] 30분 간격 배치 성공률 95% 이상
- [ ] rate limit 로그가 누락 없이 남음

## 테스트
- [ ] 코인 없음(404) 처리
- [ ] 이벤트 목록 empty 처리
- [ ] 월간 제한 시뮬레이션

## 롤백
- 이벤트/소개 영역 비노출 전환.
```

### B-1006 `공통 Adapter/DTO`

```text
## 개요
- 목적: provider별 adapter 및 DTO를 공통 인터페이스/정규화 유틸로 단일화한다.
- 기한: 2026-07-08

## 범위
- Provider: core
- Capability: all
- Endpoint: N/A
- 변경 파일:
  - src/server/integration/adapters/interface.ts
  - src/server/shared/normalizer/{symbol,time,number}.ts
  - src/server/domain/types.ts

## 구현 항목
- [ ] IExchangeApiAdapter 인터페이스 완성 및 구현체 모두 준수
- [ ] canonical symbol/time/number normalizer 통합
- [ ] provider 우선순위/배치 전환 로직 적용
- [ ] 타입 오류를 런타임에서 통일 처리

## 실패/재시도 정책
- 정규화 실패: Invalid payload로 수집 제외 후 mismatch metric 기록
- schema mismatch: 알람 + fallback 경로 전환
- Fallback: provider 분기 재실행 전 미스매치 재평가

## 수용 조건
- [ ] adapter 5개 이상이 인터페이스 통과
- [ ] 정규화 실패율 0.5% 이하(1일)
- [ ] 병합 duplicate 0건

## 테스트
- [ ] 어댑터 단위 mock 테스트
- [ ] 정규화 유닛 테스트
- [ ] 통합 병합 테스트

## 롤백
- 개별 adapter 단위 기능만 유지하며 공통 유틸만 롤백.
```

### B-1007 `WS 복구`

```text
## 개요
- 목적: WebSocket 끊김 및 재연결 시 REST 보정 흐름을 안정적으로 운영한다.
- 기한: 2026-07-09

## 범위
- Provider: binance/bybit/okx
- Capability: market stream
- Endpoint: 실시간 채널
- 변경 파일:
  - src/server/integration/ws/ws-manager.ts
  - src/server/integration/ws/reconnect.ts
  - src/web/stores/validation-health.ts

## 구현 항목
- [ ] snapshot/delta 채널 파싱 분리
- [ ] disconnect 감지 후 백오프 정책 적용
- [ ] 3회 실패 시 polling 전환
- [ ] stale 표시 및 재동기화 트리거 구현

## 실패/재시도 정책
- WS 실패: 즉시 재연결(지수 backoff)
- 3회 연속 실패: REST polling 대체
- 복구 조건: 3회 연속 성공 후 primary WS 복귀

## 수용 조건
- [ ] 재연결 95% 30초 이내
- [ ] stale 기간이 120초 이내로 제한
- [ ] UI 에러/중복 방지 동작 확인

## 테스트
- [ ] WS 강제 종료
- [ ] 429와 WS 동시 장애
- [ ] fallback 복귀 흐름 테스트

## 롤백
- WS off 후 REST 중심 모드로 임시 운영.
```

### B-1008 `모니터링/알람`

```text
## 개요
- 목적: API/WS 장애 지표를 수집해 운영자 대응 시간을 단축한다.
- 기한: 2026-07-10

## 범위
- Provider: all
- Capability: metrics
- Endpoint: all
- 변경 파일:
  - src/server/observability/metrics.ts
  - src/web/components/DebugValidationPanel.vue

## 구현 항목
- [ ] rate limit, 실패율, 레이턴시, reconnect 지표 수집
- [ ] 임계치 3개 이상 경보 규칙 등록
- [ ] source tag 기반 대시보드 표기
- [ ] provider별 건전성 스냅샷 저장

## 실패/재시도 정책
- 지표 수집 실패: 로컬 메모리 버퍼 저장 후 재시도
- 알람 중복: 동일 오류 5분 동안 1회 debounce

## 수용 조건
- [ ] 1분 단위 성공률 그래프 집계 가능
- [ ] 알람 3개 케이스 검증 통과
- [ ] stale ratio 추적 가능

## 테스트
- [ ] 임계치 초과 알림 송신
- [ ] 지표 누락 시 fallback 동작
- [ ] 대시보드 표시 무결성

## 롤백
- 지표 수집 off, 기본 로그 레벨로 축소.
```

### B-1009 `운영 문서`

```text
## 개요
- 목적: 배포 직전 감사 가능한 문서 세트를 완성한다.
- 기한: 2026-07-11

## 범위
- Provider: all
- Capability: docs
- Endpoint: N/A
- 변경 파일:
  - docs/provider-policy-diff.md
  - docs/incident-runbook.md
  - docs/release-checklist.md

## 구현 항목
- [ ] 운영 문서(Freeze/rollback/runbook) 업데이트
- [ ] 월간 정책 점검 체크리스트 반영
- [ ] 변경 이력(diff) 기록 방식 고정

## 실패/재시도 정책
- 문서 누락: 릴리스 블로킹 항목 처리

## 수용 조건
- [ ] 문서 감사 체크리스트 90% 이상 통과
- [ ] 운영 책임자 승인 완료

## 테스트
- [ ] 정책 변경 1건 시나리오 적용성 점검
- [ ] 장애 발생 가상 대응 테스트

## 롤백
- 문서 미완성 시 배포 중단.
```

### B-1010 `정책 동기화 자동 체크`

```text
## 개요
- 목적: 월간으로 API 정책 변경을 추적해 스펙 오버라이드/회귀를 줄인다.
- 기한: 2026-07-12

## 범위
- Provider: core
- Capability: governance
- Endpoint: N/A
- 변경 파일:
  - scripts/policy-diff.ts
  - scripts/smoke-test.ts
  - docs/provider-policy-diff.md

## 구현 항목
- [ ] 주요 문서 URL의 정책 변경 체크 항목표(해시/타임스탬프) 추가
- [ ] 배포 전 회귀 테스트(업데이트된 제약) 항목 연결
- [ ] 자동 리마인더 일정 추가

## 실패/재시도 정책
- 정책 점검 실패: 배포 전 경고 + 수동 승인 필요
- URL 접근 실패: 수동 점검 모드 전환

## 수용 조건
- [ ] 월 1회 검토 리포트 생성
- [ ] 정책 변경 감지 시 릴리스 가드 동작

## 테스트
- [ ] mock URL 변경 이벤트
- [ ] 문서 차이 검출 및 알림
- [ ] 회귀 테스트 자동 실행

## 롤백
- 자동 점검 비활성화 후 주간 수동 점검 모드 전환.
```

---

## D) 공개 API 전용 발행 규칙(요약)

- 공개 API만 사용: 티켓 범위에 `private`, `account`, `order`, `trade` 성격의 endpoint는 포함하지 않는다.
- 중복 방지: 기능군별로 아래 표를 기준으로 한 번만 채택한다.
  - Binance → 시장 데이터(현재가/호가/캔들)
  - Bybit → 파생 지표(펀딩/OI)
  - OKX → mark price/레버리지 위험 보완
  - Bithumb → KRW 마켓 보강
  - CoinGecko → 메타/카테고리/이미지
  - CoinPaprika → 이벤트/팀/소개 보강
- 각 Issue에는 아래 텍스트를 Scope/Notes에 고정 추가:
  - `공개 엔드포인트 전용 / 키 발급 불필요 / Private 경로 미포함 / 중복 기능 없음`

## C) 3-Step Import Flow (Planning → Ticket → Implementation)

1. Planning
   - `docs/free-api-survey-2026-06-22.md`의 `10) 작업 티켓` 또는 `13` 섹션을 정렬
2. Ticket
   - 위 완성본을 복사해 GitHub Issue 생성(체크리스트 유지)
3. Implementation
   - 완료 항목을 기준으로 `docs/free-api-survey-2026-06-22.md`의 DoD/테스트 항목을 갱신

추가로, 다음 응답에서 원하시면 각 티켓을 GitHub API로 import 가능한 JSON 배열 형태(`[{title,body,labels}]`)로 변환해드리겠습니다.

---

## E) 배포 잠재 이슈 점검 (Vercel serverless · postmortem 기반)

> 근거: [`docs/vercel-api-error-postmortem.md`](C:\Users\SR83\test\CoinBurrow\docs\vercel-api-error-postmortem.md) / 연계: `docs/free-api-survey-2026-06-22.md` 15절
>
> 프로덕션은 **Vercel 서버리스(단명·무상태)** 다. 위 B-티켓 일부는 **상시 구동 서버**(WS, background job, in-memory 큐/limiter/circuit)를 전제하므로 그대로 구현하면 postmortem이 겪은 **"로컬은 되는데 프로덕션만 깨짐"** 이 재현된다. 각 Issue 발행 전 본 점검을 통과시킨다.

### E-1. 티켓별 배포 위험 플래그

| 티켓 | 배포 위험 | 이유(postmortem/serverless) | 1차 조치 |
|---|---|---|---|
| B-1001 Binance | 중 | 외부 fan-out, 브라우저 직접 호출 시 CORS·타임아웃 | Fastify 프록시 경유, 외부 timeout<함수 maxDuration, REST only |
| B-1002 Bybit (`derivatives-job 10초`) | **높음** | serverless엔 상시 background job 없음 | job 제거 → **클라이언트 폴링** 또는 Vercel Cron |
| B-1003 Bithumb | 중 | ticker/orderbook/candle 병렬 fan-out | 동시성 상한 + 부분 성공 |
| B-1004 CoinGecko | 중 | TTL 캐시가 인스턴스별 → cold start마다 리셋 | best-effort 캐시 명시 또는 KV |
| B-1005 CoinPaprika (`30분 배치`) | **높음** | 상시 스케줄러 없음 | **Vercel Cron** |
| B-1006 공통 Adapter/DTO | 낮음 | — | adapter **정적 import** 유지(`server/dist` 동적 import 금지) |
| B-1007 WS 복구 | **매우 높음** | 함수 단명 → WS 연결 유지 불가 | **1차 제외**, REST 폴링. WS는 상시 워커(3차)에서만 |
| B-1008 모니터링 (`로컬 메모리 버퍼`) | **높음** | 인스턴스 간 상태 공유 안 됨 | 외부 저장소(KV) 또는 외부 APM |
| B-1009 운영 문서 | 낮음 | — | — |
| B-1010 정책 체크 (`자동 리마인더 일정`) | 중 | 상시 스케줄 불가 | Vercel Cron |

### E-2. 각 Issue에 고정 추가할 "배포 잠재 이슈 점검" 블록 (복붙)

A) 공통 Issue 포맷의 `## 롤백` 위에 아래 블록을 덧붙인다. (postmortem 재발 방지 체크리스트 발췌)

```text
## 배포 잠재 이슈 점검 (Vercel serverless)
- [ ] 라우팅: /market/<provider>/... 요청이 SPA fallback(HTML, "Unexpected token '<'")로 안 빠지는지 preview에서 smoke check
- [ ] 함수 entry: rewrite destination이 실제 /api 함수와 1:1 대응, helper 파일은 /api 디렉터리 밖
- [ ] 모듈: 외부 API는 Fastify 프록시 경유(브라우저 직접 호출 금지), adapter는 server/src 정적 import (server/dist 동적 import 금지)
- [ ] ESM: 루트 package "type": "module" 유지, 신규 /api/*.ts entry 추가 시 ESM 로딩 검증
- [ ] 상시성 제거: WS·background job·in-memory 큐/limiter/circuit 미사용 (필요 시 Vercel Cron/KV/외부 워커로 분리)
- [ ] fan-out: provider 동시성 상한 + 외부 호출 timeout < 함수 maxDuration + 부분 성공(실패 provider는 stale/null, 전체 500 금지)
- [ ] 검증: npx tsc --noEmit / npm test / npm run build 통과
```

### E-3. 발행 전 필수 검증 (postmortem 추천 명령)

```bash
npx tsc --noEmit -p tsconfig.json
npm test
npm run build
```

신규 `/api/*.ts` 함수 entry를 추가했다면 ESM 로딩까지 확인한다(postmortem 358~363줄):

```bash
npx tsc -p tsconfig.json --outDir .tmp/vercel-esm --declaration false
node -e "import('./.tmp/vercel-esm/api/<entry>.js').then((m)=>console.log(typeof m.default))"
# 검증 후 .tmp/vercel-esm 삭제
```

### E-4. 위험 신호 (이 로그·증상이 보이면 배포 계층 이슈)

| 증상 | 의미 | 점검 |
|---|---|---|
| `Unexpected token '<', "<!doctype "...` | API가 JSON 대신 SPA `index.html` 반환 | rewrite/SPA fallback (E-2 라우팅) |
| `status 404` | 함수 entry 또는 Fastify route 불일치 | rewrite ↔ `/api` 함수 1:1 |
| `Cannot find module '/var/task/server/dist/...'` | build artifact 동적 import 의존 | 정적 import로 전환 |
| `Unexpected token 'export'` | 루트 package가 CommonJS로 해석 | 루트 `"type": "module"` |

> 요약: 위 B-티켓은 "기능"은 맞지만 **실행 환경 전제가 상시 서버**다. 발행 전 E-2 블록을 끼워 **1차는 REST only + 폴링/Cron/KV로 치환**하면, postmortem이 겪은 배포 연쇄 장애를 회피할 수 있다.
