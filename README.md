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

## REST 엔드포인트

- `GET /market/coin-list`
- `GET /market/exchange/ticker`
- `GET /market/exchange/candle?market=KRW-BTC`
- `GET /market/exchange/orderbook?market=KRW-BTC`
- `GET /market/exchange/trade-ticks?market=KRW-BTC`
