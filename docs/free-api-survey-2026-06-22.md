# CoinBurrow 무료 API 조사 (Upbit 제외)
# 작성일: 2026-06-22
# 대상: CoinBurrow 기능 고도화용 무료/저비용 API 정리

> 목적: Upbit에서 이미 구현된 핵심 기능(현재가, 체결, 호가, 주문, 잔고, 기본 차트)을 제외하고, 신규 확장성 관점에서 **추가 키 발급 없이 공개 엔드포인트만** 사용 가능한 무료 API를 정리하고 구현 가능한 계획으로 확정한다.

## 1) 문서 요약

- 수집 대상은 `가격/호가`, `파생 지표`, `KRW 보완`, `메타/이벤트`의 4군데로 분리.
- 기능 중복 방지를 위해 동일 기능군은 `1개 활성 소스 + 1개 백업 소스` 원칙 적용.
- 본 문서는 **키 발급 불필요 API만** 대상으로 한다.
- 공개 엔드포인트만 사용하므로 인증이 필수인 endpoint는 2차 후보에서 제외한다.
- API 안정성은 문서 기준이 자주 바뀔 수 있으므로, **“도입 시점 기준”**으로 표기.
- 현재 버전은 구현 단계로 넘길 수 있는 수준으로 정리되어 있음: 스키마, 스케줄, 실패 규칙, 검증 지표, 티켓 형태 반영.

## 1-1) 진행 플랜(우선순위)

| 상태 | 티켓 | 범위 | 우선순위 | 시작 단계 |
|---|---|---|---|---|
| 진행중 | CBR-API-1001 | Binance Adapter(Upbit 미지원 커버리지) | P0 | 1순위 |
| 진행중 | CBR-API-1002 | Bybit Derivatives | P0 | 2순위 |
| 진행중 | CBR-API-1003 | Bithumb KRW 보강 | P0 | 3순위 |
| 진행중 | CBR-API-1004 | CoinGecko 메타/카테고리 | P1 | 4순위 |
| 진행중 | CBR-API-1005 | CoinPaprika 이벤트/소개 | P1 | 5순위 |
| 미시작 | CBR-API-1006 | 공통 Adapter/DTO 정착 | P1 | 6순위 |
| 미시작 | CBR-API-1007 | 복구 체계(REST-only + TTL 캐시) | P1 | 7순위 |
| 미시작 | CBR-API-1008 | 모니터링/알람 | P1 | 8순위 |
| 미시작 | CBR-API-1009 | 운영 문서 완성 | P2 | 9순위 |
| 미시작 | CBR-API-1010 | 정책 동기화 자동 체크 | P2 | 10순위 |
| 미시작 | CBR-UI-1401 | DerivativesPanel + derivatives store | P1 | 병행 |
| 미시작 | CBR-UI-1402 | 코인 상세 drawer/route | P1 | 병행 |
| 미시작 | CBR-UI-1403 | CoinList source 배지 | P2 | 병행 |
| 미시작 | CBR-UI-1404 | KRW 김프 배지 + 정렬 | P2 | 병행 |

### 진행 운영 규칙

- 티켓은 한 번에 하나씩 오픈하고, DoD 충족 전에는 다음 티켓을 시작하지 않는다.
- 서버리스 제약(15-1 ~ 15-6)은 각 구현 티켓 DoD에 반드시 첨부한다.
- 구현 착수 전, `docs/free-api-issue-template.md`로 티켓 본문을 맞춰 Issue를 먼저 생성한다.
- 문서에 신규 endpoint/제한 변경이 있을 경우, 즉시 섹션 2~6의 비교표와 각 티켓의 scope를 동기화한다.

## 2) 리뷰(현 문서 점검)와 수정 방향

### 2-1. 기존 문서의 장점
- 플랫폼별 endpoint/기능 리스트가 이미 존재해 구현 착수성이 좋음.
- 파이프라인/Job, fallback, adapter 인터페이스까지 선행되어 있음.
- 테스트 조건, DoD, 운영 규칙이 어느 정도 정리되어 있음.

### 2-2. 기존 문서의 주요 문제
1. 텍스트 인코딩 손상으로 가독성 저하.
2. 일부 섹션에서 표기 중복 및 용어 충돌이 잦음.
3. 기능 비교 시 “중복 기능 선택 기준”이 분명하지 않아, 구현 시 오버랩이 생길 수 있음.
4. 일부 endpoint 표기가 실제 경로와 상이한 가능성(예: 경로/카테고리)을 실도입 전 재확인 필요 항목으로 명시해야 함.
5. 테스트 항목이 존재하지만 우선순위(필수/권장/선택)의 명확한 구분이 부족.

### 2-3. 수정 원칙
- 문서 전체를 **요약 → 선별 기준 → provider별 결정사항 → 구현 스펙 → 실행계획** 순서로 정렬.
- API 제약(레이트, 인증, 경로)은 “가능성 높은 값”과 `재확인 필수`를 분리.
- 모든 실행 항목을 `CBR-ZOD`와 동일한 티켓 스타일처럼 번호화해 착수성 강화.

## 3) Upbit 제외 중복 제거 전략

### 3-1. 기본 원칙
1. Upbit에서 이미 있는 기능(틱커, 주문, 잔고, 기본 차트, 기본 체결)은 채택 대상에서 제외.
2. 동일 기능이 여러 API에 존재하면 아래 우선순위로 하나를 주 채널로 확정.
   - 호출 안정성
   - 실시간 확장성(WS 지원)
   - 문서 품질 및 한도/폴백 관리 쉬움
   - 키 없이 동작 가능(우선 필터)
3. 2차로 backup 소스를 1개만 지정(필수).
4. 키 필요 endpoint(주문/포지션/잔고/주문내역)는 전부 제외.

### 3-2. 기능군별 최종 선별(정리본)

| 기능군 | 1차 채널(활성) | 2차 채널(백업) | 이유 |
|---|---|---|---|
| Spot 커버리지(**Upbit 미지원 심볼** 한정) | Binance | KuCoin | **Upbit가 이미 가진 심볼의 기본 가격/호가/거래는 채택 제외(Upbit 우선).** Binance는 Upbit에 없는 페어 커버리지 + 깊은 depth(>30)/`lastUpdateId` 동기화가 필요한 경우에만 사용 |
| Spot 캔들(Upbit 미지원 심볼 한정) | Binance | CoinGecko(보조) | Upbit 커버 심볼 캔들은 제외(중복). Binance는 미지원 심볼 캔들 + 파생 정합용, CoinGecko는 보조 메타 결합 |
| 파생 펀딩/OI | Bybit | OKX | Bybit가 지표군이 넓고 운영 경험 기반이 좋음 |
| 마크프라이스/리스크 보완 | OKX | Bybit | OKX는 마크/레버리지 보완성이 상대적으로 명확 |
| KRW 로컬 보완 | Bithumb | CoinPaprika(메타 보조) | 국내 KRW 마켓 직접성, 이벤트/정보 보조 필요 시 분리 사용 |
| 메타/카테고리/이미지 | CoinGecko | CoinPaprika | 시각적 정보 + 프로젝트 메타 균형 |
| 이벤트/팀/소개 | CoinPaprika | CoinGecko | 이벤트/팀/백서/카테고리 정보 강점 |

### 3-3. 키 발급 필요성별 판별(도입 확정표)

| Provider | 포함 대상(공개 엔드포인트) | 키가 필요한 엔드포인트(제외) | 판단 |
|---|---|---|---|
| Binance | `/api/v3/ticker/*`, `/api/v3/depth`, `/api/v3/klines`, `/fapi/v1/fundingRate`, `/fapi/v1/openInterest` | 주문/계정/잔고/체결내역 관련 private API | 공개 엔드포인트만 사용 |
| Bybit | `/v5/market/*`, `/v5/market/open-interest`, `/v5/market/funding/history` | `/v5/account/*`, `/v5/trade/*` 계열, 지갑/포지션 조회 | 공개 시장/파생 지표만 채택 |
| OKX | `/api/v5/public/*`, `/api/v5/market/*` | `/api/v5/account/*`, `/api/v5/trade/order`, 출금/지갑 계열 | 공개 채널(마크/시세)만 채택 |
| Bithumb | `/public/ticker/*`, `/public/orderbook/*`, `/public/candlestick/*`, `/public/transaction_history/*` | 주문/잔고/거래 내역 private API | KRW 보강만 공개 조회로 고정 |
| CoinGecko | `/api/v3/simple/price`, `/api/v3/coins/*`, `/api/v3/coins/markets`, `/api/v3/events` | 인증 토큰 기반 유료 라이트/제한형 API 경로(현재 단계 제외) | keyless 우선 사용, 실패 시 캐시/폴백 |
| CoinPaprika | `/v1/coins*`, `/v1/tickers*`, `/v1/coins/*/events` | API 토큰 요구 경로(도입 단계 제외) | 공개 메타 API 중심으로 고정 |
| KuCoin | 공개 마켓 엔드포인트(백업용): ticker/orderbook/klines | private/주문/계정 계열 | 2차 백업으로 공개 경로만 사용 |
| Kraken | 공개 마켓 엔드포인트(백업용): ticker/orderbook/ohlc | private/트레이딩/잔고 계열 | 2차 백업으로 공개 경로만 사용 |
| CoinCap | `/assets`, `/assets/{id}`, `/assets/{id}/history` | 인증 토큰 경로(현재 제외) | 2차 메타 fallback 공개 채널 |

기록: 본 표의 endpoint명은 도입 직전 공식 문서에서 path/쿼터 정책 재확인 후 적용한다.

## 4) 최종 포함 API 리스트 (확정)

### 4-1. 1차 구현 추천(핵심)
1. Binance
2. Bybit v5
3. OKX v5
4. Bithumb
5. CoinGecko
6. CoinPaprika

### 4-2. 2차/백업 추천
1. KuCoin
2. Kraken
3. CoinCap

## 5) provider별 상세 스펙(실무형)

### 5-1. Binance (Upbit 미지원 커버리지 + 파생 보완)
- 역할: **Upbit가 커버하지 않는 Spot 영역만** 보강 — Upbit 미지원 심볼의 시장 데이터(가격/호가/캔들)
- 분류: `coverage(market/orderbook/candles)`
- **중복 제거 원칙(3-1) 적용:**
  - Upbit가 이미 가진 심볼의 기본 `market/orderbook/candles`는 **채택 제외 (Upbit 우선).**
  - Binance 시장 데이터는 **Upbit에 없는 페어**에 한정해 수집.
  - orderbook은 **깊은 depth(>30 레벨) 또는 `lastUpdateId` 동기화가 필요한 경우에만** 보조 사용(기본 호가창 표시는 Upbit로 충분).
  - 따라서 단순 현재가/기본 호가/기본 캔들은 중복이므로 도입 근거가 아님.
  - **파생(`/fapi`)은 주채택 아님:** funding/OI는 Bybit, mark price는 OKX가 1차(3-2절). 거래소별 funding 주기·OI 단위·mark 산식이 비표준이라 멀티소스 시 값 정합이 깨지므로, **메트릭당 단일 소스 원칙**을 지킨다. Binance `/fapi`는 Bybit/OKX 동시 장애 시 **선택적 3차 백업**으로만 사용.
- 공개 조회만 사용(주문/계정/잔고/내역 endpoint는 대상 제외)
- 핵심 endpoint
  - 공개: `/api/v3/ping`, `/api/v3/time`, `/api/v3/exchangeInfo`
  - 커버리지용 시장(**Upbit 미지원 심볼 한정**): `/api/v3/ticker/24hr`, `/api/v3/depth`, `/api/v3/klines`
  - 파생(**선택적 3차 백업 전용**, 평시 비활성): `/fapi/v1/fundingRate`, `/fapi/v1/openInterest`, `/fapi/v1/premiumIndex`
- WS: `wss://stream.binance.com:9443/ws`
- 주의:
  - `/exchangeInfo`의 rate limit 데이터 기반 limiter 동적 동기화 필요
  - **Upbit overlap 심볼은 수집 전 필터링** (중복 row 0건 원칙, 9-1 DoD와 연동)
  - `/api/v3/depth`는 limit별 가중치 차등(최대 5000=가중치 250) → 깊은 depth가 실제 필요한 경우에만 호출
  - 파생을 3차 백업으로 켤 때도 **Bybit/OKX와 동일 심볼을 동시에 합산하지 말 것**(소스 전환 방식으로만 사용)

### 5-2. Bybit v5
- 역할: 파생 지표/카테고리형 시장군 보강
- 분류: `market`, `derivatives`
- 핵심 endpoint
  - 시장: `/v5/market/time`, `/v5/market/tickers`, `/v5/market/instruments-info`, `/v5/market/orderbook`, `/v5/market/recent-trade/list`, `/v5/market/kline`
  - 파생: `/v5/market/open-interest`, `/v5/market/funding/history`
- WS: `wss://stream.bybit.com/v5/public/spot`, `/v5/public/linear`
- 주의: category(`spot/linear/inverse/option`)별 파라미터 스키마 분기 필수

### 5-3. OKX v5
- 역할: mark price/funding/risk 보완 채널
- 핵심 endpoint (공개)
  - `/api/v5/public/time`, `/api/v5/public/instruments`, `/api/v5/public/mark-price`
  - `/api/v5/market/tickers`, `/api/v5/market/candles`, `/api/v5/market/books`
- WS: `wss://ws.okx.com:8443/ws/v5/public`
- 주의: 공개 채널 기준으로만 운영 (인증 채널은 제외)

### 5-4. Bithumb
- 역할: KRW 마켓 정보 보강(국내 가격 비교)
- 핵심 endpoint
  - `/public/ticker/{currency}`, `/public/ticker/ALL_TICKER`
  - `/public/orderbook/{currency}`
  - `/public/candlestick/{currency}`
  - `/public/transaction_history/{currency}`
- 공개 조회는 키 없이 사용 가능(거래/잔고/계정 API는 대상 제외)
- 주의: 한글명/심볼 정규화가 핵심

### 5-5. CoinGecko
- 역할: 프로젝트 메타 + 시장 통계 보완
- 핵심 endpoint
  - `/api/v3/simple/price`, `/api/v3/global`, `/api/v3/coins/markets`
  - `/api/v3/coins/{id}`, `/api/v3/coins/{id}/market_chart`, `/api/v3/coins/{id}/ohlc`, `/api/v3/events`
- 장점: keyless 중심 + 풍부한 메타
- 주의: keyless 정책은 변경될 수 있어 캐시와 fallback 필요

### 5-6. CoinPaprika
- 역할: 이벤트/소개/팀 정보 보완
- 핵심 endpoint
  - `/v1/coins`, `/v1/coins/{coin_id}`
  - `/v1/tickers`, `/v1/tickers/{coin_id}`
  - `/v1/coins/{coin_id}/events`, `/v1/coins/{coin_id}/ohlcv/historical`
- 장점: 메타 텍스트·이벤트 강점
- 주의: 월간 제한을 고려해 배치 동기화 우선

### 5-7. 2차 후보
- KuCoin: 글로벌 커버리지 보강 소스(심볼 수 많음)
- Kraken: 장기 정합성/역사 데이터 비교군
- CoinCap: 추가 메타 fallback 용

## 6) 구현 아키텍처 제안

> ⚠️ **배포 전제 주의:** 본 절의 WS 스트리밍·백그라운드 job·in-memory 큐·circuit breaker 상태는 **상시 구동 서버**를 가정한다. 프로덕션은 **Vercel 서버리스(단명·무상태)** 이므로 그대로면 동작하지 않는다. 반드시 **15절(Vercel 서버리스 제약 및 적응)** 을 함께 적용할 것. (근거: `docs/vercel-api-error-postmortem.md`)

### 6-1. 정규화 규칙
- symbol 규칙: `BASE/QUOTE|provider=...`
- 시간: UTC epoch ms
- 가격/수치: 문자열 수치 안전 파싱 (`coerce`)
- 상태: 시장 데이터와 파생 데이터는 별도 namespace 사용

### 6-2. adapter 계층
- 인터페이스: `IExchangeApiAdapter`
  - `supports(capability)`
  - `fetchMarketSnapshot(symbols)`
  - `fetchOrderBook(symbol, depth)`
  - `fetchKlines(symbol, interval, from, to)`
  - `fetchDerivatives(symbol)`
  - `fetchMeta(coinId)`
- 모듈 분리:
  - `adapters/binance`, `adapters/bybit`, `adapters/okx`, `adapters/bithumb`, `adapters/coingecko`, `adapters/coinpaprika`

### 6-3. job 분리
1. market-job (1~5초): binance + bybit + bithumb
2. derivatives-job (5~10초): bybit + okx
3. meta-job (30분): coingecko + coinpaprika
4. reconcile-job (30초): latency, 실패율, stale, limiter hit 집계

## 7) 실패/폴백 정책

### 7-1. 공통
- `429/rate limit`: `Retry-After` 우선, 실패 누적 없이 backoff
- `418/접속제한성 에러`: 공급자 격리 타이머 적용(예: 60초)
- `5xx`: 지수 백오프(최대 3회)
- `타임아웃`: 1회 즉시 재시도 후 실패 시 fallback

### 7-2. fallback 라우팅
- market/orderbook: active → backup → stale cache
- derivatives: active → backup → null + stale flag
- meta: active → backup → 마지막 유효값 유지

### 7-3. 재동기화 조건
- backup에서 3회 연속 성공 시 primary 복귀 시도
- 동일 엔드포인트 3회 이상 연속 실패 시 circuit breaker 활성

## 8) 품질/보안 계획 보완

### 8-1. 보안
- 키 기반 API 미사용 원칙을 유지하여 키 발급/저장, 서명/권한 토큰 운영은 제외.
- 공개 API 사용 시 허용 도메인, user-agent, 호출 빈도 제어(rate-limit 준수)를 통해 남용을 차단.
- 응답 스키마 검증을 통해 과도/이상 응답을 즉시 격리.

### 8-2. 모니터링
- 지표:
  - success rate
  - p95 latency
  - rateLimit hit
  - WS reconnect 수
  - stale ratio
- 임계치:
  - 1분 실패율 1% 이상 지속 시 경보
  - p95 2초 초과 3회 연속 시 경보
  - limiter hit 20% 이상 시 경보

### 8-3. 버전/문서 운영
- 월간 정책 점검(문서 링크 변화, endpoint deprecate, 인증 변경)
- 정책 변경시: 문서(diff) + 영향 API + 배포 전 회귀 항목 갱신

## 9) 테스트 및 수용 기준

### 9-1. 수용 기준(Dod)
1. 기능군당 active provider 1개 + backup 1개 구조 완료
2. symbol 병합에서 중복 row 0건
3. 24h 기준 실패율 1% 이하
4. fallback 전환이 3개 이상 항목에서 실제 검증
5. 문서의 구현 산출물(섹션 12~15) 실제 경로와 1:1 대응

### 9-2. 테스트 카탈로그(우선순위)
- P0: REST/WS 파싱, symbol/time 정규화, mismatch 수집
- P1: rate limit fallback, reconnect+polling 대체, provider 전환
- P2: UI 표시(stale/error/source), 장기 soak 24h

## 10) 작업 티켓(즉시 착수용)

### 10-1. 핵심 티켓
- CBR-API-1001: 공통 adapter 인터페이스 + 정규화 유틸 (기본 골격 완료, 공용 라우팅/지원 메타 항목 반영 중)
- CBR-API-1002: Binance 시장 데이터(adapter: market/orderbook/klines, Upbit overlap 필터 반영)
- CBR-API-1003: Bybit 파생 지표(adapter: openInterest/funding history)
- CBR-API-1004: OKX mark price adapter(백업 보조, 위험 보정 지표)
- CBR-API-1005: Bithumb KRW 마켓 보강(adapter)
- CBR-API-1006: CoinGecko 메타/카테고리(로고/가격속성)
- CBR-API-1007: CoinPaprika 이벤트/팀/백서 메타
- CBR-API-1008: 백업 소스 실패 시 fallback/격리/재시도 정책
- CBR-API-1009: 모니터링 대시보드 + 경보
- CBR-API-1010: 운영 runbook + 월간 정책 점검 루틴

### 10-2. 각 티켓 산출물 공통 규칙
- endpoint 목록, 실패코드 맵, 재시도 규칙, 테스트 케이스 3개 이상, 롤백 플랜 포함
- “완료 정의”는 수치(성공률/지연/오류율)로 표기
- **[필수] serverless 1차 제약(15절):** WS·상시 background job·in-memory 공유 상태(큐/limiter/circuit) **미사용**. **REST only + provider별 분리 endpoint + 짧은 TTL 캐시**로 구현하고, fan-out 동시성 상한·외부 호출 timeout(함수 maxDuration 미만)을 DoD에 수치로 명시. (공유 상태가 필요하면 KV=2차, WS 실시간=상시 워커 3차로 분리 — 15-6절)

## 11) 샘플 데이터 모델(공통)

```ts
export interface IExchangeApiAdapter {
  name: string
  supports(capability: 'market' | 'orderbook' | 'kline' | 'derivatives' | 'meta'): boolean
  fetchMarketSnapshot(symbols: string[]): Promise<MarketSnapshot[]>
  fetchOrderBook(symbol: string, depth: number): Promise<OrderBook>
  fetchKlines(symbol: string, interval: string, fromMs: number, toMs: number): Promise<Kline[]>
  fetchDerivatives(symbol: string): Promise<DerivativesSnapshot | null>
  fetchMeta(coinId: string): Promise<CoinMeta | null>
}

export type MarketSnapshot = {
  symbol: string
  source: string
  lastPrice: string
  changeRate: string
  volume: string
  quoteVolume: string
  ts: number
}

export type OrderBook = {
  symbol: string
  source: string
  bids: Array<[string, string]>
  asks: Array<[string, string]>
  lastUpdateTs: number
  depth: number
}

export type Kline = {
  symbol: string
  interval: string
  open: string
  high: string
  low: string
  close: string
  volume: string
  ts: number
}

export type DerivativesSnapshot = {
  symbol: string
  fundingRate?: string
  openInterest?: string
  markPrice?: string
  ts: number
  source: string
}

export type CoinMeta = {
  coinId: string
  name: string
  symbol: string
  logo?: string
  category?: string
  website?: string
  description?: string
  tags?: string[]
}
```

## 12) 최종 문구 보완(실행 체크)

- 본 문서는 **구현 전 마지막 정리본**이 아니라, **구현 주기별 보완본**으로 관리한다.
- 매월 정책 변경을 반영하고, 주 1회 provider별 health 체크를 실행한다.
- 다음 작업은 `우선순위 티켓 세분화 + OpenAPI 스타일 스펙 + 샘플 응답 매핑` 단계로 넘어간다.

## 13) GitHub Issue 템플릿(즉시 사용)

아래 템플릿을 복사해 Issue 생성 시 각 티켓에 맞게 `{{...}}` 값만 채우면 됩니다.

### 13-1. 공통 Issue 템플릿

**Title**
`[CBR-API-100X] {{요약}`

**Labels**
`api`, `backend`, `phase-{{N}}`, `priority-{{P0|P1|P2}}`

**Goal**
- {{구현 목표 1~2문장}}

**Scope**
- Provider: `{{provider}}`
- Capability: `{{market|orderbook|kline|derivatives|meta}}`
- Endpoints: `{{endpoint 목록}}`
- 변경 파일: `{{예: src/server/...}}`

**Acceptance Criteria**
- 성공율: `{{예: 1분 실패율 1% 이하}}`
- 레이턴시: `{{예: p95 2초 이내}}`
- 폴백: `{{예: primary 실패 시 backup 전환 검증}}`
- 검증 항목: `{{테스트 2~3개}}`

**Error/Retry Policy**
- Rate limit: `{{429/418 처리 방식}}`
- Timeout: `{{재시도 횟수}}`
- Fallback: `{{primary→backup→cache 규칙}}`

**Artifacts**
- 코드: `{{생성/수정 파일}}`
- 문서: `docs/free-api-survey-2026-06-22.md` 내 해당 섹션 체크
- 테스트: `{{테스트 케이스 ID}}`

**Rollback**
- 문제 발생 시: `{{비활성화 플래그/기능 토글/배포 되돌림 기준}}`

---

### 13-2. 티켓별 실행 분해

#### CBR-API-1001 Binance Adapter(Upbit 미지원 커버리지 + 파생)
- Goal: **Upbit 미지원 심볼**의 market/orderbook/candle 수집 및 canonical 정규화 적용 (Upbit overlap 심볼은 제외). 파생(`/fapi`)은 본 티켓 범위 밖 — Bybit/OKX 동시 장애 대비 **선택적 3차 백업**으로만 추후 연결
- Priority: P0
- DoD:
  - `tickers`, `orderbook`, `klines` 수집이 adapter 인터페이스로 노출
  - **Upbit 커버 심볼 필터링 적용** — overlap 심볼은 수집 대상에서 제외
  - symbol/시간 정규화 통과
  - 중복 symbol 없이 `market-job` 저장 (중복 row 0건)
  - depth는 필요 시에만 깊게 호출(가중치 차등 반영)
  - mismatch/timeout 로그가 수집됨
- Test: REST 정상/누락/타입오류 + **Upbit overlap 심볼 제외** 케이스 각각 1개

#### CBR-API-1002 Bybit Derivatives
- Goal: funding/openInterest/펀딩 히스토리 수집
- Priority: P0
- DoD:
  - `/v5/market/open-interest`, `/v5/market/funding/history` 연동
  - category 매핑 실패 처리 구현
  - 10초 주기 수집 완료
- Test: category mismatch, 429, invalid symbol 3종

#### CBR-API-1003 Bithumb KRW 보강
- Goal: KRW 티커/호가/캔들 수집 및 매핑
- Priority: P0
- DoD:
  - `ALL_TICKER` + per-symbol 조회 동작
  - KRW 심볼 정규화 테이블 적용
  - Upbit와 overlap 시 우선순위 정책 적용
- Test: KRW 조회, 심볼 변환 실패, 응답 문자열 숫자 파싱

#### CBR-API-1004 CoinGecko 메타
- Goal: 로고/카테고리/시세메타 동기화
- Priority: P1
- DoD:
  - `coins/{id}` 파싱
  - coin id 기준 캐시 조회/갱신(10분 TTL)
  - TTL 캐시 적용
- 완료 반영(1차): `/market/freeapi/coingecko/meta?coinId=...` 라우팅, cache+파서 적용
- Test: keyless 정책 실패 모사, 캐시 갱신 테스트

#### CBR-API-1005 CoinPaprika 이벤트/소개
- Goal: 이벤트/팀/백서 링크 보강
- Priority: P1
- DoD:
  - `/events`, `/coins/{id}` 병행 조회 파이프라인
  - meta-job와 병합(서버 구조 반영)
- Test: 월간 제한 시나리오/폴백 시뮬레이션
- 완료 반영(1차): `/market/freeapi/coinpaprika/meta?coinId=...` 라우팅, 이벤트/백서 후보 텍스트 결합, 캐시 적용

#### CBR-API-1006 공통 Adapter/DTO 정착
- Goal: 인터페이스·정규화 유틸 단일화
- Priority: P1
- DoD:
  - `IExchangeApiAdapter` 구현 완료
  - symbol/time/number 정규화 유틸 표준화
  - provider 우선순위 로직 연동
- Test: 다중 provider 교차 정규화 테스트

#### CBR-API-1007 복구 체계 (1차: REST polling, WS는 3차로 연기)
- Goal: **serverless 1차에서는 REST 폴링 + 짧은 TTL 캐시 기반 복구**를 구현(15-6절). WS snapshot/delta·circuit breaker 상태 공유는 **상시 워커 도입(3차) 또는 KV 도입(2차) 이후**로 연기.
- Priority: P1
- DoD:
  - 1차: 폴링 주기 + 캐시 TTL 명시, 실패 시 stale 반환(전체 500 금지)
  - 1차: circuit breaker는 **per-invocation best-effort**로만 적용(상태 공유는 KV 도입 시)
  - 3차(분리): WS snapshot/delta 파이프라인, reconnect, failover — 상시 워커 환경에서만
- Test: 폴링 실패→stale, 부분 성공 응답, (3차) WS 끊김/reconnect

#### CBR-API-1008 모니터링/알람
- Goal: rateLimit/failure/reconnect/staleness 지표 수집
- Priority: P1
- DoD:
  - 3개 이상 경보 임계치 알림 동작
  - provider별 리포트 대시보드 항목 생성
- Test: 임계치 초과 트리거 회귀 테스트

#### CBR-API-1009 운영 문서 완성
- Goal: release-checklist/runbook 문서화
- Priority: P2
- DoD:
  - provider-policy-diff/incident-runbook 추가
  - 월간 정책 검토 절차 반영
- Test: 문서 감사 항목 체크리스트 통과

#### CBR-API-1010 정책 동기화 자동 체크(보완)
- Goal: 월별 문서/제한 정책 차이점 자동 추적
- Priority: P2
- DoD:
  - 정책 변경 체크 항목표 추가
  - 배포 전 회귀 체크 항목 연동
- Test: 가짜 URL 변경 시나리오(변경 감지)

---

### 13-3. 바로 생성 가능한 Issue Body 예시(복붙용)

```text
## 목적
- {{Issue 목적}}

## 작업 범위
- provider: {{provider}}
- 대상 capability: {{market/orderbook/kline/derivatives/meta}}
- API 엔드포인트:
  - {{endpoint1}}
  - {{endpoint2}}

## 구현 내용
1. {{작업1}}
2. {{작업2}}

## 에러 처리
- 429/리미트: {{방식}}
- timeout: {{방식}}
- fallback: {{방식}}

## 수용 조건
- [ ] {{조건1}}
- [ ] {{조건2}}
- [ ] {{조건3}}

## 테스트
- [ ] 정상 응답 파싱
- [ ] 타입 불일치 실패 처리
- [ ] rate limit + fallback 동작

## 위험/보완
- {{리스크}}
- {{롤백 기준}}
```

### 13-4. 다음 제안
- 이 템플릿을 `docs/free-api-issue-template.md`로 분리하면 관리가 더 쉬워집니다.
- 3-step import 플로우용 JSON 샘플은 아래 파일을 생성해둬서 바로 발행 자동화에 바로 사용할 수 있습니다.

### 13-5. 보조 템플릿 분리
- 실행 템플릿 전문(`공통 템플릿 + 티켓 완성본`)은 아래 파일로 분리했습니다.
- 파일: [C:\Users\SR83\test\CoinBurrow\docs\free-api-issue-template.md](C:\Users\SR83\test\CoinBurrow\docs\free-api-issue-template.md)
- 다음 단계: 각 티켓을 GitHub Issue JSON import 형식으로 일괄 등록할 수 있도록 아래 파일을 추가해두었습니다.
- 파일: [C:\Users\SR83\test\CoinBurrow\docs/free-api-issue-import.json](C:\Users\SR83\test\CoinBurrow\docs/free-api-issue-import.json)

## 14) 화면 매핑 및 신규 UI 영역

각 신규 기능이 현재 웹앱(`web/src/features/exchange/`)의 어디에 붙는지 정리한다. 현재 `/exchange` 한 페이지에 **ExchangeHero → CandleChart → 호가/체결(split-grid) → MarketMovementPanel + 사이드바 CoinList** 구조다.

### 14-1. 기능 → 컴포넌트 매핑

| 기능군(섹션) | 제공처 | 붙는 위치 | 표시 형태 | 구분 |
|---|---|---|---|---|
| 글로벌 Spot 커버리지(5-1) | Binance | `CoinList.vue` + 기준통화 셀렉터(`ExchangePage.vue`) | 심볼 확장 + source 배지(Upbit/Binance) | 기존 확장 |
| 펀딩비·OI(5-2) | Bybit | **신규 `DerivativesPanel.vue`** + `ExchangeHero` 요약칩 | 펀딩률/OI 칩 + 다음 정산 카운트다운 | **신규** |
| 마크프라이스/리스크(5-3) | OKX | `DerivativesPanel.vue` + `CandleChart.vue` 오버레이 | 마크가격 라인 + 현재가 괴리(%) | 신규+확장 |
| KRW 김프(5-4) | Bithumb | `ExchangeHero`(KRW 한정) + `CoinList` 행 | "김프 +x%" 배지 + 정렬 옵션 | 기존 확장 |
| 프로젝트 메타(5-5) | CoinGecko | `CoinList` 행 아이콘 + **신규 코인 상세** | 로고/카테고리 태그/시총 | 행 확장 + **신규** |
| 이벤트/팀/백서(5-6) | CoinPaprika | **신규 코인 상세 drawer/route** | 이벤트 탭 + 팀·백서 링크 | **신규** |

### 14-2. 신규로 만들어야 하는 UI 영역(공간 없음)

현재 화면에 자리가 없어 **새 영역 신설이 필요한 항목**:

1. **파생 패널** (`DerivativesPanel.vue`)
   - 위치: `ExchangePage.vue`의 `panel-stack` 내, 호가/체결 `split-grid` 인접
   - 내용: 펀딩률, OI, 마크프라이스, 다음 정산 카운트다운
   - 표시 조건: 해당 심볼의 파생 데이터 존재 시에만 노출(없으면 패널 숨김)
2. **코인 상세 영역** (메타/이벤트/팀)
   - 방식: `/exchange/:coin` 라우트 추가(`web/src/router/index.ts`) **또는** CoinList 클릭 시 drawer/모달
   - 내용: 로고·카테고리·시총(CoinGecko) + 이벤트·팀·백서(CoinPaprika)
   - 권장: 1차는 **drawer**로 가볍게, 확장 시 전용 route로 승격

### 14-3. 데이터 계층(stores) 추가

기존 `ticker/market/orderbook/candle/trade`에 더해:

- `stores/derivatives.ts` — 펀딩/OI/마크 (파생 패널)
- `stores/meta.ts` — 로고/카테고리/이벤트/팀 (코인 상세)
- `stores/premium.ts` — Upbit↔Bithumb 김프 계산(또는 `ticker` 확장)

→ 6-3절 job 분리(market/derivatives/meta)와 1:1 대응.

### 14-4. UI 티켓(10절 연계)

- CBR-UI-1401: `DerivativesPanel.vue` 신설 + `derivatives` store 연동(P1)
- CBR-UI-1402: 코인 상세 drawer + `meta` store(CoinGecko/CoinPaprika)(P1)
- CBR-UI-1403: CoinList source 배지 + 글로벌 심볼 확장(P2)
- CBR-UI-1404: ExchangeHero 김프 배지 + 정렬 옵션(P2)
- 공통 규칙: 데이터 없음/실패 시 패널·배지 **숨김 처리**(stale flag 연계, 7-2절)
- **[필수] serverless 1차 제약(15절):** UI 데이터는 **REST 폴링 + 짧은 TTL 캐시**로 취득(WS 미사용). 각 티켓 DoD에 **폴링 주기와 캐시 TTL을 수치로 명시**하고, 부분 실패 시 해당 패널만 숨김 처리.

## 15) Vercel 서버리스 제약 및 적응 (필수 반영)

> 근거: [`docs/vercel-api-error-postmortem.md`](C:\Users\SR83\test\CoinBurrow\docs\vercel-api-error-postmortem.md)
> 본 문서의 6-3(job)·7-3(circuit breaker)·5-x(WS, 동적 limiter)는 **상시 구동 서버 전제**다. 프로덕션은 Vercel serverless(단명·무상태)이므로 그대로면 동작하지 않거나 cold start·타임아웃·중복 호출 문제가 발생한다. 포스트모템이 겪은 "로컬은 되는데 프로덕션만 깨짐"이 신규 다중 거래소 API에서 더 크게 재현될 수 있다.

### 15-1. 핵심 충돌 4가지와 적응

| 문서 설계 | serverless 현실 | 적응 방안 |
|---|---|---|
| WS 스트리밍(각 provider `wss://...`) | 함수는 단명, WS 연결 유지 불가 | **WS 제거 → REST 폴링 + 짧은 TTL 캐시.** 실시간성 필수면 Vercel 밖 상시 워커를 별도 도입 |
| 백그라운드 job(market 1~5s, meta 30분, reconcile 30s) | 상시 프로세스/스케줄러 없음 | **Vercel Cron**(분 단위 최소)으로 meta/snapshot 갱신. 1~5s 실시간은 **클라이언트 요청 구동** 폴링으로 |
| in-memory 요청 큐(1s 간격), 동적 limiter(`exchangeInfo`) | 인스턴스마다 격리, cold start마다 초기화 → 큐·토큰 의미 없음 | rate 토큰·limiter 상태를 **공유 저장소(Vercel KV / Upstash Redis)** 로 이전 |
| circuit breaker 상태(7-3, 3회 실패 차단) | 인스턴스 간 공유 안 됨 → 매번 리셋 | 상태를 **KV에 저장** 또는 per-invocation best-effort로 축소 명시 |

### 15-2. fan-out / 타임아웃 (postmortem '남은 리스크' 연계)

신규 기능은 **다수 거래소로 fan-out**한다(market snapshot = Binance+Bithumb+…, meta = CoinGecko+CoinPaprika). 포스트모템 399줄이 경고한 "한 API가 내부적으로 여러 외부 요청"이 훨씬 심해진다.

- provider fan-out **동시성 상한** 설정(예: 4).
- 각 외부 호출 timeout을 **함수 maxDuration보다 충분히 낮게**(예: 함수 10s → 외부 3s).
- 묶음 endpoint(overview) 지양 → **provider별 분리 endpoint + 클라이언트 병렬**.
- **부분 성공 허용**: 실패 provider는 stale/null 반환(7-2절 fallback), 전체 500 금지.

### 15-3. 라우팅/모듈 규칙 (postmortem 재발 방지 그대로 적용)

신규 provider adapter를 Fastify에 추가할 때:

- 외부 API는 **브라우저 직접 호출 금지, Fastify 프록시 경유**(정규화/한도/모니터링 일관). 단일 prefix `/market/...` 유지 또는 신규 고정 함수 entry 추가.
- adapter는 **`server/src`에 정적 import**. `server/dist` 동적 import 금지(postmortem 4절·248줄).
- helper는 `/api` 밖에 둔다(`apiBridge.ts` 패턴, postmortem 135줄).
- 루트 ESM(`"type": "module"`) 유지. 신규 `/api/*.ts` entry 추가 시 postmortem 358~363줄 ESM 로딩 검증 수행.

### 15-4. 신규 provider 배포 전 체크(포스트모템 체크리스트 확장)

- [ ] `/market/<provider>/...`가 SPA fallback(HTML)로 안 빠지는지 preview에서 smoke check
- [ ] 외부 호출 timeout + fan-out 동시성 상한 설정 확인
- [ ] WS 의존 코드 없는지(serverless면 폴링/Cron으로 대체)
- [ ] 공유 상태(큐/limiter/circuit) 외부 저장소 사용 or per-invocation 명시
- [ ] 신규 함수 entry ESM 로딩 검증(postmortem 361줄 명령)
- [ ] `npx tsc --noEmit` / `npm test` / `npm run build` 통과(postmortem 348~356줄)

### 15-5. 문서 내 영향 표기(정정 사항)

- **5-1~5-6의 `WS:` 항목은 serverless 1차 범위에서 제외** — 상시 워커 도입 전까지 REST only.
- **6-3 job 주기:** market-job 1~5s → 클라이언트 폴링 + 짧은 TTL 캐시로 대체, meta-job 30분 → Vercel Cron, reconcile-job → Cron 집계.
- **7-3 circuit breaker/재동기화:** 상태 저장소(KV) 필요. 없으면 per-invocation best-effort로 명시.
- **5-1 `exchangeInfo` 동적 limiter:** 인스턴스 공유 불가 → KV 기반 한도 토큰 또는 정적 보수값 사용.

### 15-6. 권장 단계 전략

1. **1차(serverless 친화):** REST only + 클라이언트 폴링 + provider별 분리 endpoint + 짧은 TTL 캐시. WS/상시 job 없이 출시.
2. **2차(필요 시):** Vercel KV 도입 → 공유 rate limiter / circuit breaker / 스냅샷 캐시.
3. **3차(실시간 요구 시):** Vercel 밖 상시 워커(예: Fly.io/Render)에서 WS 수집 → KV/DB push, 프론트는 그 캐시를 읽음.
