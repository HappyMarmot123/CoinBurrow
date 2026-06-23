# Exchange 캔들차트 v2 (Lightweight Charts) 신규 구축 — 아이디어 제안 & 기획설계

작성일: 2026-06-23
대상: `CoinBurrow` `/exchange` 캔들 차트
상태: 결정 확정 + 코드베이스 기반 구체화 완료 (구현 대기)

---

## 1. 배경 / 문제

- 현재 `/exchange` 차트는 **Highcharts Stock 기반 `CandleChart.vue`** (캔들 + 거래량 2-pane).
- 이 v1을 **deprecated 처리**하고, **TradingView 오픈소스(Lightweight Charts) 기반 v2를 신규 구축**한다. (기존 코드 수정/마이그레이션이 아니라 신규 컴포넌트로 대체)
- 동기:
  - Highcharts는 **상용 라이선스** 부담 + 캔들/거래량 용도엔 과한 번들(`highcharts` + `highcharts-more` + `stock`).
  - 크립토 거래소 표준 룩(TradingView)에 가까운 캔들 엔진이 필요.
  - 실시간 갱신(WS) + 향후 지표 오버레이 확장 여지 확보.

## 2. 목표 / 비목표

**확정 방향 (사용자 결정 2026-06-23)**

- A안(Advanced Charts) **사용 불가** → 후보 제외.
- B(임베드 위젯)은 **iframe 기반이라 커스텀 난이도 높음** → 인앱 메인 차트로는 제외.
- **인앱 차트 = Lightweight Charts**로 직접 구현.
- **드로잉 툴/지표는 자체 구현하지 않고 TradingView 본가에 위임** → "전체보기" 버튼을 누르면 `https://kr.tradingview.com/chart/?symbol=...` 외부 페이지로 이동(새 탭), 사용자가 거기서 툴바·지표를 자유롭게 사용.

**목표**

- v1과 **동일한 외부 인터페이스**(props `timeframe`, `candleStore` 소비, CSS 테마 토큰, 빈 상태)를 유지한 v2 컴포넌트.
- 캔들스틱 + 거래량(하단 오버레이) + 다크 테마 + 실시간 갱신.
- **전체보기 버튼 → TradingView 외부 차트 딥링크**(현재 종목 심볼 자동 매핑, 새 탭).
- Highcharts 의존 제거(`CandleChart.vue`가 유일 사용처 — grep 확인 완료).

**비목표 (이번 범위 밖)**

- 인앱 드로잉 툴바 / 인앱 지표 GUI 자체 구현 → **TradingView 외부 페이지로 위임**(전체보기 링크).
- A안(Advanced Charts) 자체 호스팅 / B 위젯 임베드.
- 김치프리미엄 라인 → **배제**(사용자 결정 2026-06-23).
- 데이터 파이프라인 변경(서버/WS) → **불필요**(v1과 동일 데이터 재사용).

## 3. 라이브러리 스크리닝

| 후보                                     | 라이선스        | 캔들+거래량     | 번들  | 결론                             |
| ---------------------------------------- | --------------- | --------------- | ----- | -------------------------------- |
| **Lightweight Charts** (TradingView OSS) | Apache-2.0 무료 | 기본 유스케이스 | ~45KB | ✅ **채택**                      |
| Highcharts Stock (현행 v1)               | 상용            | 가능            | 큼    | ❌ deprecated                    |
| klinecharts                              | Apache-2.0      | 강함(크립토)    | 중간  | △ "TradingView" 요구와 결이 다름 |
| ECharts                                  | Apache-2.0      | 직접 구현 부담  | 큼    | ❌ 캔들 UX 수작업                |
| TV Advanced Charts                       | 무료(승인 필요) | 강함            | 수 MB | ❌ 사용 불가(사용자 결정)        |

→ **Lightweight Charts (현재 v5)** 채택. 캔들/거래량이 정확히 기본 기능이고, 라이선스·번들 모두 유리.

## 4. 아키텍처 / 데이터 흐름 (재사용)

v2는 **렌더링 레이어만 교체**한다. 데이터 경로는 v1 그대로 재사용:

```
Upbit REST/WS ─→ server ─→ web worker(pipeline.ts) ─→ useExchangeData ─→ candleStore ─→ [v2 차트]
                                                         │ getCandles() → setInitial(오름차순)
                                                         └ WS candle.{tf} → applyCandle(마지막봉 교체/추가)
```

- 데이터 모델: `CandleView { market, timestamp(ms), open, high, low, close, volume }` (`web/src/stores/types.ts`).
- 진행봉: WS 캔들의 `close = trade_price`(실시간 갱신), `applyCandle`이 같은 `timestamp`면 마지막봉 교체.
- 로딩: `useExchangeData`가 종목 변경 시 `getCandles(market, { timeframe, count })` → `candleStore.setInitial`, WS `candle.{tf}` 구독.
- **변경 없음:** store / composable / 서버 / WS / REST.

## 5. 핵심 설계 결정 (Lightweight Charts 특성상 반드시)

1. **타임스탬프 단위 변환** ⚠️ 최우선
   - Upbit `timestamp`는 **ms UTC epoch**(`workers/pipeline.ts` `raw.timestamp` 그대로).
   - Lightweight Charts intraday `time`은 **초 단위 `UTCTimestamp`** → `Math.floor(ts / 1000)` 필수. (안 하면 1970년대로 찍혀 미표시)
   - 모든 resolution을 `UTCTimestamp`(초)로 통일 → `BusinessDay` 분기 불필요(일/주/월/년도 초 epoch로 OK).

2. **타임존(KST) 표기**
   - epoch는 UTC. v1(Highcharts datetime)은 로컬 표기였음.
   - Lightweight Charts는 기본 UTC 표기 → **확정(§12-2): `localization.timeFormatter` + `timeScale.tickMarkFormatter`에서 +9h(KST) 포맷.** 데이터 time은 정확한 epoch 유지(오프셋 가산 방식 미채택).

3. **v5 API** — 구버전 예제 주의
   - `chart.addCandlestickSeries()` **폐기** → `chart.addSeries(CandlestickSeries, opts)`.
   - `import { createChart, CandlestickSeries, HistogramSeries } from "lightweight-charts"`.

4. **거래량 오버레이(2-pane 룩 재현)**
   - 거래량 히스토그램: `priceScaleId: ""`(overlay) + 해당 series price scale `scaleMargins { top: 0.8, bottom: 0 }`.
   - 가격 series price scale `scaleMargins { top: 0.1, bottom: 0.25 }` → 상단 74% 가격 / 하단 20% 거래량(v1 레이아웃과 동일 톤).

5. **테마 토큰 주입** — CSS 자동 인식 안 됨
   - v1의 `readCssToken` 로직 재사용하되, 값을 `chart.applyOptions({ layout, grid, timeScale, rightPriceScale })` + series 옵션으로 **명시 주입**.
   - 토큰 출처: `web/src/styles/_variables.scss` 단일 `:root`(다크 전용) — 실측값:
     - `--c-up: #9be15d`(상승), `--c-down: #ffb02e`(하락)
     - `--chart-axis: rgba(255,255,255,0.2)`, `--chart-axis-soft: rgba(255,255,255,0.15)`, `--chart-grid: rgba(255,255,255,0.1)`
     - `--text-muted: #9fb0c6`(라벨), 배경 transparent
   - 거래량 막대 색: 봉 방향대로 up/down(v1 규칙 유지).
   - **테마 토글 없음(확정)**: 코드베이스에 다크/라이트 토글이 없으므로 **mount 시 1회 주입**으로 충분(런타임 재주입 로직 불필요).

6. **반응성: 선언형 → 명령형 전환 (= 리얼타임 갱신)**
   - Highcharts-vue는 옵션 객체 교체로 재렌더했지만, Lightweight Charts는 명령형.
   - **실시간 갱신은 공식 realtime 데모와 동일 패턴**으로 구현(`series.update()`로 마지막 봉 갱신 — https://tradingview.github.io/lightweight-charts/tutorials/demos/realtime-updates).
   - `watch(() => candleStore.candles, ...)`:
     - 전체 교체(종목/타임프레임 변경): `candleSeries.setData(...)`, `volumeSeries.setData(...)`.
     - **진행봉 실시간 갱신**(WS `applyCandle`로 마지막 봉 변동): `series.update(lastBar)`로 최적화(전량 setData도 수백 봉이면 무난).
   - 판별: 길이·마지막 timestamp 비교로 `update` vs `setData` 선택.
   - 데이터 소스는 이미 실시간(WS `candle.{tf}` → store) → **차트는 store 변화를 `update`로 반영만 하면 리얼타임 완성.**

7. **라이프사이클 / 리사이즈**
   - `onMounted`에서 `createChart(container)`, `onUnmounted`에서 `chart.remove()`.
   - `ResizeObserver`로 컨테이너 폭 변화 시 `chart.resize(w, h)` (반응형/패널 레이아웃 대응). **높이 460px 고정(§12-3), 폭만 추종.**

8. **빈 상태 / 초기 로딩**
   - `candleStore.candles.length === 0`이면 v1과 동일하게 "차트 데이터가 없습니다." placeholder, 차트 인스턴스는 생성 보류 또는 빈 setData.

## 6. 컴포넌트 설계

신규 파일: `web/src/features/exchange/CandleChartV2.vue` (확정 후 v1 `CandleChart.vue`는 deprecated 주석 → 제거)

```ts
// props — v1 시그니처 + 전체보기 매핑용 market
const props = withDefaults(
  defineProps<{ timeframe?: CandleTimeframe; market: string }>(),
  { timeframe: "1m" },
)

// 내부 구조
const container = ref<HTMLDivElement>()
let chart: IChartApi
let candleSeries: ISeriesApi<"Candlestick">
let volumeSeries: ISeriesApi<"Histogram">

onMounted(() => {
  chart = createChart(container.value!, { layout/ grid/ timeScale/ rightPriceScale ... }) // 테마 토큰 주입
  candleSeries = chart.addSeries(CandlestickSeries, { upColor, downColor, borderVisible:false, wickUpColor, wickDownColor })
  volumeSeries = chart.addSeries(HistogramSeries, { priceScaleId: "", priceFormat:{type:"volume"} })
  volumeSeries.priceScale().applyOptions({ scaleMargins:{ top:0.8, bottom:0 } })
  syncData()           // 초기 setData
  observeResize()
})
onUnmounted(() => { chart?.remove(); resizeObs?.disconnect() })

watch(() => candleStore.candles, syncData, { deep:false }) // 길이/마지막봉 비교 → update vs setData

function toBar(c: CandleView) {
  return { time: Math.floor(c.timestamp/1000) as UTCTimestamp, open:c.open, high:c.high, low:c.low, close:c.close }
}
function toVol(c: CandleView) {
  return { time: Math.floor(c.timestamp/1000) as UTCTimestamp, value:c.volume,
           color: c.close >= c.open ? upColor : downColor }
}
```

- **타임프레임 컨트롤은 그대로 `ExchangePage.vue`가 소유**(라이브러리 내장 컨트롤 사용 안 함) → `props.timeframe` 변경 시 데이터 교체만 반영.
- 테마 토큰: 토글 없음 → **mount 시 1회 주입**(§5-5).
- **전체보기 버튼**: 차트 우상단에 아이콘 버튼 1개. 클릭 시 현재 종목을 TradingView 심볼로 매핑해 `https://kr.tradingview.com/chart/?symbol=...` 를 **새 탭**(`target="_blank"`, `rel="noopener noreferrer"`)으로 연다. (인앱 풀스크린이 아니라 TradingView 본가로 위임 — §8 참조). 버튼 스타일은 기존 `web/src/components/TooltipButton.vue` 패턴 재사용.
- **컨테이너 높이는 명시 필수**: Lightweight Charts는 auto-height가 없으므로 래퍼 `div`에 `height: 460px`(v1 동일) 고정 + `chart.resize`로 폭만 추종.
- 추가 prop: v1은 `timeframe`만 받았으나 v2는 매핑용 `market`(예: `"KRW-BTC"`)을 함께 받는다 → `defineProps<{ timeframe?: CandleTimeframe; market: string }>()`.

### 6-1. ExchangePage 통합 지점 (실측)

- `market` ref는 이미 존재(`ExchangePage.vue:25` `const market = ref(DEFAULT_MARKET)`) → 그대로 전달.
- import 교체: `ExchangePage.vue:4` `import CandleChart from "./CandleChart.vue"` → `CandleChartV2`.
- 사용처 교체: `ExchangePage.vue:279`
  ```html
  <!-- before --> <CandleChart :timeframe="candleTimeframe" />
  <!-- after  --> <CandleChartV2 :timeframe="candleTimeframe" :market="market" />
  ```
- Highcharts 의존: **`CandleChart.vue` 단 한 곳에서만 사용**(전수 grep 확인) → v1 컴포넌트 제거 시 `highcharts`/`highcharts-vue` 패키지 동시 제거 안전.

## 7. 타임프레임 매핑

- 데이터 자체는 `useExchangeData`가 timeframe별로 이미 공급 → v2는 **time 변환만** 담당.
- 전 resolution(`1s`~`1y`)을 `UTCTimestamp`(초)로 통일. 일/주/월/년도 epoch 초 그대로 사용(별도 `BusinessDay` 분기 불필요).
- 초 봉(`1s`)·분 봉: 그대로. 주의: 동일 timeframe 내 `time` 중복(동일 초)이 있으면 Lightweight Charts가 에러 → store가 마지막봉 교체 정책이라 중복 없음(검증 1회).

## 8. 전체보기 → TradingView 외부 차트 연동 (핵심)

드로잉·지표는 자체 구현하지 않고 **TradingView 본가 차트 페이지로 위임**한다. 전체보기 버튼이 현재 종목을 TradingView 심볼로 변환해 딥링크를 연다.

### 8-1. 심볼 매핑 (Upbit 마켓 → TradingView 심볼)

- 인앱 마켓 포맷: `"{QUOTE}-{BASE}"` (Upbit 스타일, 예 `"KRW-BTC"`, `DEFAULT_MARKET="KRW-BTC"`).
- TradingView 심볼 포맷: `"{EXCHANGE}:{BASE}{QUOTE}"`.
- 데이터 출처가 Upbit이므로 **기본 거래소 prefix = `UPBIT`**.

| 인앱 마켓  | quote | base | TradingView 심볼 |
| ---------- | ----- | ---- | ---------------- |
| `KRW-BTC`  | KRW   | BTC  | `UPBIT:BTCKRW`   |
| `KRW-ETH`  | KRW   | ETH  | `UPBIT:ETHKRW`   |
| `USDT-BTC` | USDT  | BTC  | `UPBIT:BTCUSDT`  |
| `BTC-ETH`  | BTC   | ETH  | `UPBIT:ETHBTC`   |

```ts
// web/src/features/exchange/tradingViewSymbol.ts (신규)
export function toTradingViewSymbol(
  market: string,
  exchange = "UPBIT",
): string {
  const [quote, base] = market.split("-");
  if (!quote || !base) return `${exchange}:${market.replace("-", "")}`;
  return `${exchange}:${base}${quote}`;
}

export function toTradingViewChartUrl(market: string): string {
  const symbol = toTradingViewSymbol(market);
  return `https://kr.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;
  // 예: KRW-BTC → https://kr.tradingview.com/chart/?symbol=UPBIT%3ABTCKRW
}
```

### 8-2. 커버리지 / 폴백 ⚠️

- TradingView `UPBIT` 거래소는 **KRW 페어 커버리지 양호**, 일부 소형/USDT·BTC 페어는 미수록일 수 있음.
- 미수록 심볼이어도 링크 자체는 열리며 TradingView가 "심볼 없음" UI를 보여줌 → **치명적이지 않음**.
- **확정(§12-6): `UPBIT` 고정, 폴백 테이블 미도입.** (USDT→BINANCE 등 거래소 매핑은 추후 필요 시에만 재검토)

### 8-3. 동작 규격

- 트리거: 차트 우상단 "전체보기"(⛶) 버튼.
- 동작: `window.open(toTradingViewChartUrl(market), "_blank", "noopener,noreferrer")` 또는 `<a target="_blank" rel="noopener noreferrer">`.
- 새 탭으로 열어 인앱 세션 유지(이탈 아님).
- 접근성: `aria-label="TradingView에서 전체 차트 보기"`, 외부 링크 아이콘 표기.
- (선택) UTM: 참고 링크처럼 `&utm_source=coinburrow.com` 부착 가능(불필요시 생략).

## 9. 확장 여지 (후속, 이번 미구현)

- **지표(MA/EMA/볼린저)**: 인앱 자체 구현은 미정 — 1차는 §8 전체보기(TradingView 외부)로 충분. 필요 시 LineSeries 추가로 가격 pane에 오버레이.
- v2는 series 추가가 쉬운 구조라 확장 비용 낮음.
- ※ 김치프리미엄 라인은 **배제**(현 범위·후속 모두 제외).

## 10. 리스크

| 리스크                  | 영향                   | 대응                                              |
| ----------------------- | ---------------------- | ------------------------------------------------- |
| ms→초 변환 누락         | 차트 미표시            | `toBar`/`toVol` 단일 변환 함수로 강제, 테스트     |
| KST 표기 누락           | 시간축 9h 오차         | `tickMarkFormatter`/`timeFormatter` +9h           |
| v5 API 변경             | 구예제 오류            | `addSeries(Series, opts)` 패턴 준수               |
| 진행봉 깜빡임/중복 time | 렌더 에러              | 마지막봉 `update`, 중복 time 방어                 |
| Highcharts 제거 부작용  | 타 페이지 영향         | 유일 사용처 `CandleChart.vue` 확인 완료(grep)     |
| 번들/SSR                | `window` 접근          | 클라이언트 전용 마운트(현 SPA라 무관)             |
| 모바일 터치/리사이즈    | 레이아웃               | `ResizeObserver` + 높이 정책 검증                 |
| TradingView 심볼 미수록 | 전체보기 시 빈 차트    | UPBIT 고정 허용(§12-6), 빈도 높으면 폴백 재검토   |
| 팝업 차단               | 전체보기 새 탭 안 열림 | `<a target="_blank">` 사용(클릭 제스처 직접 연결) |

## 11. 작업 티켓

- **CBR-CHARTV2-1301**: `lightweight-charts` 설치 + `CandleChartV2.vue` 골격(생성/시리즈/테마 주입/언마운트) — P0
- **CBR-CHARTV2-1302**: 데이터 바인딩(setData/update 반응성 + ms→초 + 거래량 색/오버레이) — P0
- **CBR-CHARTV2-1303**: KST 포맷터 + 리사이즈 + 빈 상태 + 타임프레임 전환 검증 — P1
- **CBR-CHARTV2-1304**: **전체보기 버튼 + `tradingViewSymbol.ts`(심볼 매핑/URL) + 새 탭 연동** — P0
- **CBR-CHARTV2-1305**: `ExchangePage`에서 v1→v2 교체(+ `market` prop 전달), `CandleChart.vue`(Highcharts) 및 `highcharts`/`highcharts-vue` 의존 제거(전수 확인 후) — P1
- **CBR-CHARTV2-1306**: 테스트(변환 함수·심볼 매핑 단위 + 렌더 스모크) + `npm run build`(vue-tsc) — P1

## 12. 확정 결정 (모두 권장안 채택, 2026-06-23)

| #   | 항목                   | 확정                                                                              |
| --- | ---------------------- | --------------------------------------------------------------------------------- |
| 1   | 컴포넌트명             | **`CandleChartV2.vue` 신규** → 안정 후 v1 `CandleChart.vue` 제거                   |
| 2   | 시간 표기              | **KST(+9h) 포맷터** (`tickMarkFormatter`/`timeFormatter`, 데이터는 정확 epoch 유지) |
| 3   | 높이 정책              | **460px 고정**(v1 동일) + `resize`로 폭 추종                                       |
| 4   | 진행봉 갱신            | **`update` 최적화** (전체 교체 시에만 `setData`)                                   |
| 5   | Highcharts 제거        | **이번 작업서 동시 제거** — `CandleChart.vue`가 유일 사용처(grep 확인 완료)        |
| 6   | 전체보기 거래소 prefix | **`UPBIT` 고정** — 미수록은 폴백 없이 TradingView "심볼 없음" UI 허용              |
| 7   | TradingView 도메인     | **`kr.tradingview.com`** (한국어)                                                 |

## 13. 수용 기준(DoD) · 테스트 · 롤백

**DoD**

- [ ] 종목/타임프레임 선택 시 캔들 + 거래량 정상 렌더(시간축 KST).
- [ ] WS 갱신 시 진행봉 실시간 반영, 끊김 시 마지막 봉 유지.
- [ ] 빈 데이터/로딩 시 placeholder, 레이아웃 깨짐 없음.
- [ ] 다크 테마 토큰 반영(상승/하락/그리드/축/라벨 색).
- [ ] 리사이즈 시 차트 폭 추종.
- [ ] **전체보기 버튼 클릭 시 현재 종목의 TradingView 차트가 새 탭으로 열림**(예 `KRW-BTC`→`UPBIT:BTCKRW`).
- [ ] `npm run build`(vue-tsc) 통과, Highcharts 제거 시 잔존 import 없음.

**테스트**

- 단위: `toBar`/`toVol`(ms→초, 거래량 색), update vs setData 판별, `toTradingViewSymbol`/`toTradingViewChartUrl`(KRW/USDT/BTC 마켓).
- 스모크: 마운트/언마운트 누수 없음(`chart.remove`), 빈→데이터 전환, 전체보기 링크 href 검증.
- 회귀: ExchangePage 타임프레임 탭 전환 시 데이터 교체.

**롤백**

- v1 `CandleChart.vue`는 v2 안정화 전까지 보존 → `ExchangePage` import 한 줄 되돌리기로 즉시 롤백(§12-1 "신규 후 제거" 순서가 이 롤백 여유를 보장).

## 14. 한 줄 요약

v1(Highcharts) 캔들차트를 deprecated하고, **데이터 경로(candleStore/useExchangeData/서버·WS)는 그대로 재사용한 채 렌더 레이어만 TradingView Lightweight Charts(v5)로 교체한 v2(`CandleChartV2.vue`)** 를 신규 구축한다. 인앱은 캔들+거래량에 집중하고, **드로잉·지표는 "전체보기" 버튼으로 `kr.tradingview.com/chart?symbol=UPBIT:…` 외부 차트에 위임**(심볼 자동 매핑, 새 탭)한다. 핵심 주의는 **ms→초 타임스탬프 변환·KST 포맷터·v5 `addSeries` API·명령형 반응성(setData/update)·거래량 오버레이·테마 토큰 주입·심볼 매핑**이다.
