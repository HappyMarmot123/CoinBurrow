# Crypto Simulator Design

## Goal

CoinBurrow의 기존 시장 대시보드를 기반으로, Supabase Auth와 Postgres를 사용하는 단일 사용자 모의 투자 게임 v1을 만든다.

v1은 실제 거래를 수행하지 않는다. 사용자는 로그인 후 가상 현금으로 매수/매도하고, `exchange` 화면에서 현재가, 평균매수가, 포지션, 손익, 최근 투자내역을 즉시 확인한다.

## Current Context

- 현재 앱은 Vue 3/Vite 기반이며 주요 화면은 `/exchange`, `/insights` 중심이다.
- `exchange`는 차트, 호가, 체결, 코인 리스트, 시장 요약을 보여주는 대시보드 성격이다.
- `insights`는 시장 동향 페이지로 글로벌 시총, 시장 심리, 김치프리미엄을 보여준다.
- `mypage`는 아직 없다.
- 서버는 Fastify 기반이며 기존 시장 데이터 API는 `/market/*` 아래에 있다.
- 모의투자 API는 기존 시장 데이터 API와 분리하여 `/api/simulator/*` 네임스페이스로 둔다.

## Navigation

v1 메뉴는 3개로 고정한다.

- `exchange`: 게임 플레이 화면
- `시장동향`: 독립 시장 분석 화면
- `마이페이지`: 로그인, 프로필, 계좌, 투자내역, 초기화 화면

라우트 기준은 다음과 같다.

- `/exchange`
- `/insights`
- `/mypage`

기존 `/global`, `/sentiment`, `/kimchi` 호환 라우트는 `/insights`로 리다이렉트 유지한다.

## Product Scope

### In Scope

- OAuth 로그인/로그아웃
- 세션 유지와 미인증 라우트 가드
- 최초 로그인 시 가상 계좌 자동 생성
- 시작 자금 100,000,000 KRW
- 시장가 매수/매도
- 평균매수가, 현재가, 평가손익, 실현손익 계산
- 주문/체결 이력 저장
- `exchange` 패널 확장
- `마이페이지` 신규 추가
- `시장동향` 기존 기능 유지 및 `exchange` 요약 연동
- 주문 실패/인증 실패/가격 동기화 실패 로그

### Out of Scope

- 실제 거래소 주문
- 지정가, 예약주문, IOC, GTC
- 레버리지, 청산, 공매도
- 멀티유저 경쟁
- 랭킹, 등급, 레벨링
- 알림 정책
- 자동매매
- 시간 가속 버튼

시간 가속 버튼은 구현하지 않는다. 과거 시세 리플레이 엔진, 캔들 재생기, 주문 시점 고정 원장, 과거 호가/체결 재구성이 없으면 정합성을 보장할 수 없으므로 v1과 후속 단기 계획에서 제외한다.

## User Experience

### Exchange

`exchange`는 기존 대시보드에서 투자 게임 플레이 화면으로 진화한다.

기존 패널은 유지한다.

- 차트
- 호가
- 체결
- 코인 리스트
- 시장 요약

신규 패널을 추가한다.

- 계좌 요약: 현금, 총 평가금액, 평가손익, 수익률
- 주문 패널: 매수/매도, 수량 입력, 예상 체결금액, 예상 수수료, 주문 가능 금액
- 내 포지션: 심볼, 보유수량, 평균매수가, 현재가, 평가손익, 수익률
- 최근 투자내역: 최근 주문 5~10개
- 가격 정합성: 차트 현재가, 호가 중간가, 체결가, quote 가격, 마지막 업데이트 시각
- 시장동향 요약: 시장 심리, 글로벌 지표, 김치프리미엄 주요 값

미인증 사용자는 기존 시장 데이터는 볼 수 있지만 주문, 계좌, 포지션, 투자내역 패널은 로그인 CTA를 보여준다.

### 시장동향

`시장동향`은 기존 `/insights` 화면을 유지한다.

- 직접 주문 기능을 넣지 않는다.
- `exchange`에 필요한 요약값만 제공한다.
- 데이터 조회 실패가 `exchange` 주문 기능을 막으면 안 된다.

### 마이페이지

`마이페이지`는 개인 데이터 허브다.

- 로그인 상태 카드
- 프로필/이메일/인증 Provider
- 가상 계좌 요약
- 전체 투자내역
- 계좌 초기화
- 로그아웃

계좌 초기화는 확인 모달을 거쳐야 한다. v1 기본 정책은 이력 유지(`keepHistory: true`)이며, 현금과 포지션만 초기 상태로 되돌린다.

## Authentication

v1부터 인증은 필수다.

- 프론트엔드는 Supabase 세션을 사용한다.
- 서버는 모든 `/api/simulator/*` 요청에서 `Authorization: Bearer <access_token>`를 검증한다.
- 토큰이 없거나 만료되면 `401`을 반환한다.
- 사용자 소유 데이터가 아니면 `403` 또는 존재 숨김 목적의 `404`를 반환한다.
- `SUPABASE_SERVICE_ROLE_KEY`는 서버에서만 사용한다.
- 브라우저에는 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`만 노출한다.

## API Boundary

신규 API는 `/api/simulator/*`로 둔다.

- `GET /api/simulator/session`
- `GET /api/simulator/state`
- `GET /api/simulator/market/quote?symbols=BTC,ETH`
- `POST /api/simulator/order`
- `GET /api/simulator/history`
- `GET /api/simulator/performance`
- `POST /api/simulator/reset`
- `POST /api/simulator/positions/close`

기존 `/market/*` API는 공개 시장 데이터 조회용으로 유지한다. simulator API는 기존 시장 데이터 API를 내부적으로 재사용할 수 있지만, 프론트엔드는 모의투자 상태 변경을 위해 `/api/simulator/*`만 호출한다.

## Data Model

Drizzle ORM을 서버 DB 계층으로 사용한다.

필수 테이블:

- `profiles`: Supabase `auth.users.id`와 1:1로 연결
- `sim_accounts`: 사용자별 paper 계좌
- `sim_positions`: 보유 자산, 수량, 평균매수가
- `sim_orders`: 주문/체결 이력
- `sim_market_snapshots`: 주문 시점 가격 스냅샷
- `sim_audit_events`: 주문 성공/실패, 인증 실패, 초기화, 정합성 경고

금액/수량은 부동소수점 오차를 피하기 위해 Postgres `numeric`을 사용한다. 시간은 `timestamptz`로 저장한다.

## Trading Rules

v1은 시장가 즉시 체결만 지원한다.

- 시작 자금: 100,000,000 KRW
- 수수료: 거래금액의 0.1%
- 슬리피지: v1 기본값 0%
- 매수 가능 금액: 현금 잔고에서 예상 거래금액과 수수료를 뺀 값
- 매도 가능 수량: 현재 포지션 수량 이하
- 체결 성공 시 `cash`, `positions`, `orders`, `market_snapshots`, `audit_events`를 하나의 트랜잭션으로 갱신

평균매수가 정책:

- 추가 매수 시 가중평균으로 갱신한다.
- 일부 매도 시 평균매수가는 유지한다.
- 전량 매도 시 포지션 수량은 0이 되고 평균매수가는 0 또는 null로 정리한다.

## Price Synchronization

`exchange` 화면에서 가격 기준이 흔들리면 게임 신뢰도가 깨진다. v1은 다음 값을 같은 `symbol`, `source`, `timestamp` 기준으로 추적한다.

- 차트 현재가
- 호가 중간가
- 최근 체결가
- simulator quote 가격

주문 체결 가격은 `/api/simulator/market/quote`의 가격 스냅샷을 기준으로 한다. UI의 차트/호가/체결 표시는 주문 기준 가격과 다를 수 있으므로, 차이가 허용치를 넘으면 가격 정합성 패널에 경고를 표시한다.

v1 허용 기준:

- 같은 심볼 기준 마지막 업데이트가 1초 이내면 정상
- 1초 초과 5초 이하면 지연 경고
- 5초 초과면 주문 버튼 비활성

## Error Policy

에러 코드는 `SIM_*` 형식으로 통일한다.

- `SIM_AUTH_REQUIRED`: 401
- `SIM_AUTH_FORBIDDEN`: 403
- `SIM_VALIDATION_ERROR`: 400
- `SIM_INSUFFICIENT_BALANCE`: 409
- `SIM_INSUFFICIENT_POSITION`: 409
- `SIM_OUT_OF_SYNC`: 409
- `SIM_UPSTREAM_RATE_LIMIT`: 429
- `SIM_UPSTREAM_FAILURE`: 502

프론트엔드는 주문 실패 시 사용자가 바로 이해할 수 있는 짧은 메시지를 보여준다.

## Implementation Order

1. Supabase Auth와 세션 기반 라우트 가드
2. Drizzle 스키마와 DB 연결
3. simulator 인증 미들웨어
4. 계좌 생성과 `/api/simulator/session`
5. quote/state API
6. 주문 계산기와 주문 API
7. history/performance/reset API
8. `exchange` 게임 패널 확장
9. `마이페이지` 추가
10. `시장동향` 요약 연결
11. 회귀 테스트와 운영 로그 정리

## Acceptance Criteria

- 미로그인 사용자는 주문 API 호출 시 `401`을 받는다.
- 로그인 사용자는 최초 진입 시 100,000,000 KRW 가상 계좌를 받는다.
- 사용자는 `/exchange`에서 매수/매도를 실행할 수 있다.
- 매수 후 현금이 감소하고 포지션 수량과 평균매수가가 갱신된다.
- 매도 후 현금이 증가하고 포지션 수량과 실현손익이 갱신된다.
- 주문 내역은 `/mypage`에서 전체 조회 가능하다.
- 최근 주문은 `/exchange`에서 5~10개 표시된다.
- 가격 동기화 지연이 5초를 넘으면 주문 버튼이 비활성화된다.
- `/insights` 데이터 실패는 주문 기능을 막지 않는다.
- 시간 가속 버튼은 어떤 v1 화면에도 노출되지 않는다.

## Review Notes

- 이 설계는 기존 3개 메뉴 원칙을 유지한다.
- 새 `/simulator` 메뉴를 만들지 않는다.
- `exchange`를 게임 화면으로 확장하되 기존 대시보드 기능은 삭제하지 않는다.
- v1 구현 범위가 크므로 implementation plan은 EPIC별로 여러 작업으로 나눈다.
