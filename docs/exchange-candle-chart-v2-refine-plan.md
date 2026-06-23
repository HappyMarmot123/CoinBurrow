# Exchange 캔들차트 v2 개선 — pane 분리 / 현재가 라벨 / 실시간 틱 (기획설계)

작성일: 2026-06-23
대상: `CoinBurrow` `web/src/features/exchange/CandleChartV2.vue`
상태: 증상 진단 + 스크리닝 + 기획설계 + 코드베이스 구체화
선행: `docs/exchange-candle-chart-v2-plan.md`(v2 신규 구축 — 본 문서는 그 후속 개선)
환경: `lightweight-charts@5.2.0`(설치 확인) — **panes API 사용 가능**

---

## 1. 배경 — 보고된 3가지 증상

현재 v2(`CandleChartV2.vue`)는 동작하지만, 가상화폐 거래소 차트 대비 3가지 미흡점이 있다.

1. **볼륨이 가격 영역 하단에 겹쳐 있음** — 가격/볼륨이 한 pane에 오버레이라 영역 구분이 약하고, **볼륨 수치가 y축(price scale)에 안 보인다.** → 거래소처럼 **별도 pane + 볼륨 축 숫자**를 원함.
2. **현재가 라벨이 y축에 안 보임** — 우측 가격축에 "지금 가격" 태그/라인이 없음.
3. **가격 캔들의 실시간성이 거칢** — 형성 중인 봉이 갱신되긴 하나, 호가창처럼 **체결 틱 단위로 세밀·실시간**으로 움직이지 않는다.

## 2. 증상 → 원인 진단 (현재 코드 기준)

| # | 증상 | 코드상 원인 |
|---|---|---|
| 1 | 볼륨이 같은 영역에 겹침 + 축 숫자 없음 | 볼륨을 **별도 pane이 아니라 오버레이 price scale**로 그림. `volumeSeries`가 `priceScaleId:"volume"` overlay이고 `scaleMargins {top:0.78, bottom:0}`(하단 22%)로 가격 pane 안에 깔림(`CandleChartV2.vue:28,134-145,256-261`). 게다가 그 볼륨 scale은 `visible:false`(:138,:143) → 축 숫자 비표시. |
| 2 | 현재가 라벨 없음 | `candleSeries`에 `priceLineVisible` 미설정 → 기본 `false`라 현재가 수평선/태그 강조가 없음(:246-254). `lastValueVisible`은 기본 true지만 오버레이 마진(`pricePanelMargins.bottom:0.3`)·볼륨 겹침으로 묻힘. |
| 3 | 실시간성 거칢 | 차트가 **`candleStore.candles`만 watch**(:291-295). 형성봉은 `candle.{tf}` WS 메시지 올 때만 갱신 → 1m/5m 등 고TF에선 체결 틱보다 빈도가 낮아 가격이 끊겨 보임. **trade/ticker 틱은 이미 수신 중인데 차트에 미반영.** |

> 실시간 소스는 이미 존재: `useExchangeData`가 선택 종목에 `trade`·`orderbook`·`candle.{tf}` 구독, 전 종목 `ticker` 구독(`useExchangeData.ts:117,166-170`). 따라서 **데이터는 충분하고, 차트가 trade/ticker 틱을 형성봉에 입히기만** 하면 된다.

## 3. 개선 항목별 스크리닝 & 설계

### 3-A. 가격/볼륨 pane 분리 + 볼륨 축 표시

**스크리닝**

| 방법 | 설명 | 평가 |
|---|---|---|
| (현행) overlay + `scaleMargins` | 한 pane을 마진으로 위/아래 나눔 | 축 숫자 X, 경계 흐림 → 거래소 룩 미달 |
| **v5 `panes`(paneIndex)** | 가격=pane 0, 볼륨=pane 1 별도 pane | ✅ **채택**. pane 경계선·독립 price scale·리사이즈 핸들 기본 제공 |

**설계 (v5 panes)**
- 볼륨 시리즈를 **pane 1**에 생성: `chart.addSeries(HistogramSeries, opts, 1)`.
- 볼륨 pane price scale **`visible: true`** + `priceFormat: { type: "volume" }` → y축에 `1.2K/3.4M` 형식 숫자 노출.
- 오버레이 잔재 제거: `pricePanelMargins`/`volumePanelMargins`/`VOLUME_PRICE_SCALE_ID` overlay·`applyVolumePanelOptions()` 삭제. 가격 pane은 표준 마진(`{top:0.1, bottom:0.1}` 정도)만.
- pane 높이 비율(가격 ~75% / 볼륨 ~25%): `chart.panes()[0].setStretchFactor(3); chart.panes()[1].setStretchFactor(1)`.
- pane 사이 구분선(separator)은 v5 기본 표시 → 거래소 룩. 드래그 리사이즈 허용(기본) 유지.
- 캔버스 높이: 현행 `chartCanvasHeight`(460+18) 유지하되 내부에서 두 pane이 stretch factor로 분할.

### 3-B. 현재가 라벨 / price line

**설계** — `candleSeries` 옵션 추가:
- `lastValueVisible: true`(명시) + **`priceLineVisible: true`** → 우측 축에 현재가 태그 + 차트 가로질러 현재가 라인.
- `priceLineWidth: 1`, `priceLineStyle: LineStyle.Dashed`, `priceLineColor`: 봉 방향색(상승 `--c-up`/하락 `--c-down`) 또는 중립 `--text-muted`.
- pane 분리(3-A) 후 가격 pane 우측 스케일이 볼륨과 안 겹쳐 라벨이 또렷이 보임.
- 실시간 틱(3-C)과 결합되면 이 라벨이 **체결가를 실시간 추종** → 거래소 체감.
- (선택) 강조가 더 필요하면 `candleSeries.createPriceLine({ price, color, title })`로 커스텀 라인 추가 가능하나, 1차는 series 옵션으로 충분.

### 3-C. 실시간 틱 반영 (형성봉 라이브 오버레이)

**스크리닝 (실시간 소스)**

| 소스 | 빈도 | 평가 |
|---|---|---|
| `candle.{tf}` WS (현행) | TF 주기/부정기 | 형성봉 갱신 느림 |
| **trade WS (`tradeStore.recent[0]`)** | 체결마다 | ✅ **채택**(가장 세밀) |
| ticker WS (`tickerStore.byMarket[m].tradePrice`) | 잦음 | ✅ 보조/폴백 |

**설계 (차트 로컬 오버레이 — store 불변)**
- 컴포넌트에서 `useTradeStore` 구독, `watch(() => tradeStore.recent[0])`로 최신 체결 감지.
- 갱신 로직: 마지막 렌더 봉 `last` 기준
  - `close = price`, `high = max(last.high, price)`, `low = min(last.low, price)`, `open`/`time` 유지 → `candleSeries.update(liveBar)`.
- **store는 변경하지 않음**(차트 내부 상태만). `candle.{tf}` WS가 새 메시지로 `candleStore`를 갱신하면 기존 `syncFromStore`가 자연 reconcile.
- **버킷 경계 가드 (중요)**: trade 틱이 현재 형성봉 time 버킷을 벗어나면(= 새 캔들 구간 진입) **라이브 업데이트 보류**하고 `candle.{tf}` WS의 새 봉을 기다림. 틱으로 새 봉을 만들지 않는다(잘못된 봉/중복 time 방지).
  - 버킷 판정: `timeframe→초` 매핑(`1m=60`, `5m=300`, …)으로 `floor(tradeTsSec / bucketSec) * bucketSec === lastBarTime` 일 때만 적용.
- **볼륨**: 틱 누적하지 않고 `candle.{tf}` WS의 권위값 유지(단순·정확). 형성봉 볼륨은 candle WS 갱신으로 충분.
- **성능**: 고빈도 틱은 `requestAnimationFrame` 1프레임 1회 또는 ~100ms throttle로 `update` 합치기.

## 4. 코드베이스 구체화 (`CandleChartV2.vue` 변경)

### 4-1. import / 상수
- `import { HistogramSeries, LineStyle, ... }` 추가(`LineStyle`).
- `import { useTradeStore } from "../../stores/trade.js"`.
- 제거 대상: `pricePanelMargins`, `volumePanelMargins`, `VOLUME_PRICE_SCALE_ID`, `applyVolumePanelOptions()`.
- 추가: `const TF_SECONDS: Record<CandleTimeframe, number>`(최소 intraday: 1s=1,1m=60,3m=180,5m=300,10m=600,15m=900,30m=1800,60m/1h=3600,240m/4h=14400, 그 외 일/주/월/년은 86400/604800/2592000/31536000 근사).

### 4-2. 시리즈 생성(`setupChart`)
```ts
// 가격: pane 0 (기본)
candleSeries.value = chart.value.addSeries(CandlestickSeries, {
  upColor: c.up, downColor: c.down,
  wickUpColor: c.up, wickDownColor: c.down,
  borderVisible: false,
  lastValueVisible: true,          // (3-B)
  priceLineVisible: true,          // (3-B)
  priceLineWidth: 1,
  priceLineStyle: LineStyle.Dashed,
  priceLineColor: c.label,
});

// 볼륨: pane 1 (3-A)
volumeSeries.value = chart.value.addSeries(HistogramSeries, {
  priceFormat: { type: "volume" },
  lastValueVisible: false,
  priceLineVisible: false,
}, 1);                              // ← paneIndex = 1

// pane 비율 + 볼륨 축 노출
const panes = chart.value.panes();
panes[0].setStretchFactor(3);
panes[1].setStretchFactor(1);
volumeSeries.value.priceScale().applyOptions({ visible: true, borderColor: c.axis });
```

### 4-3. 가격 pane 마진(`applyChartTheme`/`setupChart`)
- `rightPriceScale.scaleMargins`를 `{ top: 0.1, bottom: 0.1 }`로(오버레이용 0.3 제거). 볼륨은 자체 pane이라 가격 pane을 더 쓸 수 있음.

### 4-4. 실시간 틱(3-C) — 신규 watch
```ts
const tradeStore = useTradeStore();
let liveBucket: number | null = null;

watch(() => tradeStore.recent[0], (t) => {
  if (!t || t.market !== props.market || !candleSeries.value) return;
  if (!renderedSnapshot.length) return;
  const last = renderedSnapshot[renderedSnapshot.length - 1];
  const bucketSec = TF_SECONDS[props.timeframe];
  const lastTime = Math.floor(last.timestamp / 1000);
  const tickBucket = Math.floor((t.timestamp / 1000) / bucketSec) * bucketSec;
  if (tickBucket !== lastTime) return;            // 버킷 경계 가드 → 새 봉은 candle WS 대기
  const price = t.price;
  candleSeries.value.update({
    time: lastTime as UTCTimestamp,
    open: last.open,
    high: Math.max(last.high, price),
    low: Math.min(last.low, price),
    close: price,
  });
}, { flush: "post" });
// 성능 필요 시 rAF/throttle로 래핑
```
- 종목/타임프레임 변경 시 `renderedSnapshot`이 `setFullData`로 리셋되므로 별도 정리 불필요(틱은 market 가드로 차단).

### 4-5. 영향 없는 부분(유지)
- 데이터 흐름·`candleStore`·`useExchangeData`·서버/WS: **변경 없음**(3-C는 차트 로컬 오버레이).
- KST 포맷터·테마 토큰·resize·빈 상태: 유지.

## 5. 리스크 / 엣지케이스

| 리스크 | 대응 |
|---|---|
| 틱으로 잘못된 새 봉 생성 | **버킷 경계 가드**로 같은 버킷일 때만 `update`, 새 봉은 candle WS 대기 |
| 고빈도 틱 성능 | rAF/100ms throttle로 `update` 합치기 |
| trade 지연·과거 틱 | `tickBucket !== lastTime`이면 무시(자동) |
| candle WS와 충돌(되감김) | store가 권위 → candle WS 갱신이 라이브 오버레이를 덮어씀(정상 reconcile) |
| pane 분리 후 높이 | `setStretchFactor`로 비율 고정, 캔버스 높이 460 유지 |
| 볼륨 축 폭 증가로 정렬 | 가격/볼륨 모두 우측 scale → 폭 일관(`resize` 검증) |
| daily+ 버킷(KST 09:00) | intraday 우선, 일봉 이상은 근사 버킷 — 새 봉은 어차피 candle WS가 공급 |

## 6. 작업 티켓

- **CBR-CHARTV2-1401**: 볼륨 pane 분리(paneIndex=1) + 볼륨 price scale `visible` + `priceFormat:volume` + stretchFactor, 오버레이 잔재 제거 — P0
- **CBR-CHARTV2-1402**: 현재가 라벨/price line(`lastValueVisible`/`priceLineVisible`/색) — P0
- **CBR-CHARTV2-1403**: 실시간 틱 오버레이(trade watch + 버킷 가드 + high/low/close update) — P0
- **CBR-CHARTV2-1404**: 틱 throttle(rAF/100ms) + 타임프레임 `TF_SECONDS` 맵 — P1
- **CBR-CHARTV2-1405**: 검증(빌드/스모크/엣지) — P1

## 7. 수용 기준(DoD) · 테스트

**DoD**
- [ ] 가격/볼륨이 **별도 pane**으로 분리, 사이 구분선 표시.
- [ ] 볼륨 pane y축에 **수치(1.2K/3.4M 등) 표시**.
- [ ] 우측 가격축에 **현재가 라벨 + price line** 표시.
- [ ] 형성 중 봉의 close/high/low가 **체결 틱마다 실시간** 갱신(현재가 라벨 동반 이동).
- [ ] 새 캔들 구간 진입 시 틱이 **잘못된 새 봉을 만들지 않음**(candle WS가 새 봉 공급).
- [ ] 종목/타임프레임 전환 시 라이브 오버레이가 올바르게 리셋.
- [ ] `npm run build`(vue-tsc) 통과.

**테스트**
- 단위: `TF_SECONDS` 버킷 판정(같은/다른 버킷), high/low 갱신 로직, market 불일치 틱 무시.
- 스모크: pane 2개 렌더, 볼륨 축 visible, 현재가 라벨 존재, 틱 주입 시 last 봉 close 변화.
- 회귀: 타임프레임 전환·종목 전환 후 라이브 오버레이/스냅샷 정상.

## 8. 한 줄 요약

세 증상의 원인은 모두 코드에서 특정된다 — 볼륨이 **별도 pane이 아니라 오버레이 scale**이고(축 숨김), `candleSeries`에 **현재가 priceLine 미설정**, 차트가 **candle WS만 watch**(이미 들어오는 trade 틱 미반영). 해결은 lightweight-charts 5.2 **panes로 볼륨 분리(+볼륨 축 visible)**, candleSeries **`lastValueVisible`/`priceLineVisible`**, 그리고 **trade 틱을 형성봉에 라이브 오버레이**(버킷 경계 가드로 잘못된 봉 방지, store 불변)하는 것이다. 데이터 파이프라인 변경은 없다.
