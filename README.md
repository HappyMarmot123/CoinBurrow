# CoinBurrow

CoinBurrow는 Upbit 공개 REST/WS를 사용해 주요 KRW 마켓 시세를 보여주는 Vue 3 + Fastify 기반 크립토 대시보드입니다.

프론트엔드는 Vue 3, Vite, Pinia, RxJS, Highcharts, GSAP, Spline runtime으로 구성됩니다. 실시간 시세는 브라우저 Web Worker가 Upbit WebSocket에 직접 연결하고, 백엔드는 Fastify 서버리스 REST 함수로 Upbit 공개 REST 응답을 정규화합니다.

## 실행법

### 백엔드 (로컬)

```bash
cd server && npm install && npm run dev
```

http://localhost:4000

### 프론트엔드 (로컬)

```bash
cd web && npm install && npm run dev
```

http://localhost:3000 (REST는 :4000으로 프록시)

### 테스트

```bash
cd server && npm test
cd web && npm test
```

### 배포

Vercel에 루트 연결. `web`가 정적 SPA로 빌드되고 `api/`가 Fastify REST 서버리스 함수로 동작.
API 키, DB 불필요 (Upbit 공개 REST/WS 사용). 랜딩 3D 사용 시 `VITE_SPLINE_SCENE` 환경변수 설정.

## 구조

```text
api/      Vercel 서버리스 진입점
server/   Fastify REST API
web/      Vue 3 SPA
docs/     설계 및 migration plan
```

## 웹 라우트

- `/` 랜딩
- `/exchange` 거래소
- `/insights` 시장 동향 — 글로벌 시총 · 시장심리 · 김치프리미엄을 한 페이지에 세로 배치
  - 기존 `/global`, `/sentiment`, `/kimchi`는 `/insights`로 redirect

## REST 엔드포인트

- `GET /market/coin-list`
- `GET /market/exchange/quotes`
- `GET /market/exchange/ticker`
- `GET /market/exchange/tickers?markets=KRW-BTC,KRW-ETH`
- `GET /market/exchange/markets?quote=KRW`
- `GET /market/exchange/market-overview?markets=KRW-BTC`
- `GET /market/exchange/candle?market=KRW-BTC&timeframe=1m&count=200`
  - timeframe: `1s,1m,3m,5m,10m,15m,30m,60m,240m,1h,4h,1d,1w,1M,1mo,1y`
- `GET /market/exchange/orderbook?market=KRW-BTC`
- `GET /market/exchange/trade-ticks?market=KRW-BTC`
- `GET /market/exchange/market-status?markets=KRW-BTC`
- `GET /market/exchange/exchange-rates`
- `GET /market/global` (CoinGecko 글로벌 시총 스냅샷, keyless)
