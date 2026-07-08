# CoinBurrow

CoinBurrow는 Upbit 공개 REST API와 WebSocket을 기반으로 만든 실시간 크립토 마켓 대시보드입니다.

현재 버전은 Vue 3 SPA와 Fastify 서버리스 API로 구성되어 있으며, 별도의 데이터베이스나 인증 서버 없이 공개 시장 데이터를 빠르게 보여주는 데 집중합니다. 실시간 시세 처리는 브라우저 메인 스레드가 아니라 Web Worker에서 수행하고, RxJS 파이프라인으로 빈번한 WebSocket 메시지를 정규화·검증·스로틀링합니다.

## 기술 스택

| 영역            | 기술                                           |
| --------------- | ---------------------------------------------- |
| Frontend        | Vue 3, Vite, TypeScript, Pinia, Vue Router     |
| Realtime        | Web Worker, Native WebSocket, RxJS             |
| Chart           | Highcharts, highcharts-vue, lightweight-charts |
| Motion / Visual | GSAP, Spline runtime                           |
| Backend         | Fastify 5, TypeScript, undici, Zod             |
| Test            | Vitest, Vue Test Utils                         |
| Deploy          | Vercel static build + serverless functions     |

## 아키텍처

CoinBurrow는 실시간 WebSocket 서버를 직접 운영하지 않습니다. Vercel 서버리스 환경은 장시간 유지되는 stateful WebSocket gateway와 맞지 않기 때문에, 브라우저의 Web Worker가 Upbit WebSocket에 직접 연결합니다. REST 데이터는 Fastify 서버가 얇은 프록시 계층으로 정규화합니다. 초기 캔들, 호가, 최근 체결, 코인 목록 같은 스냅샷은 `/market/...` API에서 가져오고, 이후의 실시간 갱신은 Worker WebSocket 스트림으로 이어집니다.

## 마이그레이션 배경

초기 설계에는 NestJS, Next.js, Supabase, PostgreSQL, Drizzle, 모바일 앱, 인증, QR 로그인, 이메일 기능까지 포함되어 있었습니다. 이후 실제 제품 목표를 다시 줄이면서 현재 구조로 마이그레이션했습니다.

마이그레이션의 기준은 명확했습니다.

- 인증과 데이터 영속화가 필요 없는 공개 마켓 대시보드에 DB를 두지 않는다.
- 서버리스와 맞지 않는 상시 WebSocket gateway를 제거한다.
- 실시간 처리는 브라우저 Worker로 이동한다.
- 백엔드는 Upbit REST 응답을 정규화하는 얇은 API 계층으로 제한한다.
- SSR이 필요 없는 화면은 Vue 3 + Vite SPA로 단순화한다.

그 결과 프로젝트는 `Vue 3 + Fastify + Vercel serverless` 구조로 정리되었습니다.

## 실시간 데이터 처리

실시간 스트림은 `marketSocket.worker.ts`와 RxJS 파이프라인이 담당합니다.

Worker는 Upbit WebSocket에서 binary 메시지를 받고 `TextDecoder`로 디코딩한 뒤 JSON으로 파싱합니다. 파싱된 메시지는 Zod 스키마 검증을 거쳐 ticker, orderbook, trade, candle 채널로 분리됩니다.

RxJS 파이프라인은 채널별 특성에 맞게 처리합니다.

- ticker: 짧은 시간 안에 들어온 메시지를 묶고 종목별 최신값만 반영
- orderbook / trade / candle: `groupBy`, `throttleTime` 기반으로 UI 갱신 빈도 제어
- validation-error: 스키마 불일치 이벤트를 별도 상태로 기록

이 구조 덕분에 대량의 WebSocket 메시지가 들어와도 Vue 컴포넌트 렌더링과 사용자 인터랙션은 메인 스레드에서 상대적으로 안정적으로 유지됩니다.

## 개발 기록

프로젝트의 주요 의사결정은 GitHub Issues에 기록되어 있습니다.

| Issue                                                                                       | 내용                                                                                    |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [#14 스택 마이그레이션](https://github.com/HappyMarmot123/CoinBurrow/issues/14)             | NestJS/Next.js/Supabase 중심 구조에서 Vue + Fastify 서버리스 구조로 마이그레이션한 설계 |
| [#15 Vercel API 배포 오류 회고](https://github.com/HappyMarmot123/CoinBurrow/issues/15)     | Vercel rewrite, serverless entry, ESM, 함수 번들링 문제를 추적한 배포 회고              |
| [#18 Web Worker 및 RxJS 파이프라인](https://github.com/HappyMarmot123/CoinBurrow/issues/18) | Upbit WebSocket 실시간 스트림을 Worker와 RxJS로 처리하는 프론트엔드 아키텍처            |
| [#11 Web Worker / RxJS](https://github.com/HappyMarmot123/CoinBurrow/issues/11)             | 실시간 웹소켓 성능 최적화 초기 명세                                                     |


## 실행 방법

```bash
# 1) 의존성 설치
npm install

# 2) 서버 실행(터미널 1)
npm run dev --workspace server

# 3) 웹 앱 실행(터미널 2)
npm run dev --workspace web
```

참고: 웹 앱의 API 경로는 Vite 프록시(`/market`, `/api`)로 `localhost:4000`을 가리킵니다.