# CoinBurrow 단일 사용자 모의 투자 시뮬레이터

> 문서 상태: `BLOCKED`
>
> 기준일: 2026-07-15
>
> 실행 모드: 오토모드
>
> 구현 상태: 코드·DB migration·자동 회귀·Google Provider 활성화 완료, 실제 최초 가입·시각 E2E 대기

## 1. 문서 목적

이 문서는 수정된 MVP 아이디어의 스크리닝, 제품 기획, 코드베이스 분석, 기술 설계, 구현 Task, 구현 결과, 회귀 검증을 하나로 관리한다.

기존 CoinBurrow 공개 시장 대시보드를 유지하면서, 인증된 사용자가 100,000,000 KRW 가상자금으로 BTC와 ETH를 시장가 매매하고 통합 손익을 확인하는 기능을 추가한다.

## 2. 변경된 MVP 정의

### 2.1 목표

- 실제 자금 없이 코인 매매 흐름을 연습한다.
- OAuth 로그인 후 개인 모의 계좌를 자동 생성한다.
- 보유 수량, 매수가인 평단가, 현재 평가액, 통합 손익을 확인한다.
- 단일 사용자 경험에 집중하되 데이터는 사용자별로 분리한다.

### 2.2 포함 범위

- Google OAuth 로그인과 로그아웃
- 최초 Google 가입 직후 3단계 웰컴 가이드
- 최초 계좌 생성 및 초기 자금 100,000,000 KRW 지급
- 지원 자산 `BTC`, `ETH`
- 시장가 매수·매도와 즉시 전량 체결
- 계좌 초기화 전까지 종목별 매수 1회
- 수수료 0%, 슬리피지 0%
- 현금 잔고, 보유 수량, 평단가, 현재가, 평가액 표시
- 총자산, 통합 손익, 통합 수익률 표시
- 주문 원장 DB 저장
- 계좌 초기화
- 기존 `/exchange`에서 선택한 BTC/ETH의 모의 주문
- `/mypage`에서 계좌 요약과 보유 자산 확인

### 2.3 제외 범위

- 실거래와 실거래/모의 모드 전환
- 거래 히스토리 화면
- 실현손익과 미실현손익의 별도 표시
- 지정가, 예약, 지연, 부분 체결
- 수수료와 슬리피지 모델
- 이벤트 시나리오 생성기
- 일간·주간 성과 스냅샷
- 레버리지, 공매도, 청산
- 리더보드, 미션, 멀티유저 상호작용
- 별도 모의투자 전용 거래 페이지

### 2.4 범위 해석

“매수/매도 히스토리는 없고 손실손익을 하나로 계산”은 거래 히스토리 UI와 손익 분리 표시를 제외한다는 의미로 확정했다. 주문 레코드는 다음 이유로 내부 DB에 계속 저장한다.

- 계좌 정산 결과 추적
- 중복·오류 주문 조사
- 향후 기능 확장

별도 주문 내역 조회 API와 화면은 MVP에 포함하지 않는다.

모의 투자는 독립된 거래 페이지가 아니다. 사용자는 기존 `/exchange`에서 시장을 분석하고 같은 화면에서 모의 주문을 실행한다. `/mypage`는 주문 기능 없이 계좌 요약, 보유 자산, 계좌 초기화만 제공한다. 기존 `/simulator` 주소는 저장된 링크 호환을 위해 `/mypage`로 리다이렉트한다.

### 2.5 스크리닝 Guardrail

`PASS`

- 범위: 포함·제외 기능이 구분됨
- 근거: 사용자가 수정한 축소 범위를 반영함
- 기존 동작: 공개 시장 대시보드 경로를 유지함
- 회귀: 기존 전체 테스트를 검증 대상으로 지정함

## 3. 제품 규칙

### 3.1 주문 규칙

1. 클라이언트는 `symbol`, `side`, `quantity`만 전송한다.
2. 서버가 JWT와 사용자 ID를 검증한다.
3. 서버가 Upbit 현재가를 조회한다.
4. 서버가 지원 자산, 주문 방향, 수량과 소수점 자릿수를 검증한다.
5. 계좌 초기화 이후 같은 종목의 매수 이력이 있으면 `409 BUY_LIMIT_REACHED`로 거절한다.
6. 매수 금액이 현금보다 크면 `409 INSUFFICIENT_CASH`로 거절한다.
7. 매도 수량이 보유 수량보다 크면 `409 INSUFFICIENT_POSITION`으로 거절한다.
8. MVP 평단가는 해당 종목의 최초 매수 체결가로 확정한다.
9. 계좌, 포지션, 주문 원장은 하나의 DB 트랜잭션으로 변경한다.
10. 현재가 조회 또는 DB 정산 실패 시 주문을 체결하지 않는다.

수량은 0보다 크고 1,000,000 이하이며 최대 소수점 8자리다.

### 3.2 손익 규칙

```text
보유 자산 평가액 = 보유 수량 × 현재가
총 평가액 = 모든 보유 자산 평가액의 합
총자산 = 현금 잔고 + 총 평가액
통합 손익 = 총자산 - 초기 자금
통합 수익률 = 통합 손익 ÷ 초기 자금 × 100
평단가 = 계좌 초기화 이후 해당 종목의 최초 매수 체결가
```

매도 후 발생한 손익도 현금 잔고에 반영되므로 통합 손익에 포함된다.

### 3.3 완료 조건

- 로그인 전 모의 계좌 API 접근이 차단된다.
- 로그인 후 계좌가 없으면 자동 생성된다.
- BTC와 ETH 매수·매도 정산이 원자적으로 처리된다.
- 평단가와 통합 손익이 정의한 공식과 일치한다.
- BTC와 ETH는 계좌 초기화 전까지 각각 한 번만 매수할 수 있다.
- 잔고·보유량 부족 주문은 데이터 변경 없이 거절된다.
- 계좌 초기화 시 포지션과 주문 원장이 제거되고 초기 자금이 복구된다.
- 기존 거래소에서 선택한 BTC 또는 ETH가 동일한 종목의 모의 주문으로 연결된다.
- 마이페이지는 계좌 조회와 관리만 제공하고 주문 입력을 포함하지 않는다.
- 기존 `/`, `/exchange`, `/insights` 동작에 회귀가 없다.

## 4. 코드베이스 분석

### 4.1 기존 구조

- 프론트엔드: Vue 3, Vite, TypeScript, Pinia, Vue Router
- 백엔드: Fastify 5, TypeScript, Zod, Vercel serverless
- 시장 데이터: Upbit REST와 브라우저 WebSocket Worker
- 기존 경로: `/`, `/exchange`, `/insights`
- 기존 인증과 DB: 없음
- 기존 테스트: Vitest 기반 서버·웹 테스트

### 4.2 적용 방침

- 기존 공개 시장 라우트와 WebSocket 파이프라인을 수정하지 않는다.
- 모의 주문 UI는 기존 `/exchange`, 계좌 조회 UI는 `/mypage`에 배치한다.
- `/simulator`는 `/mypage` 호환 리다이렉트로만 유지하고 서버 도메인 API는 `/api/simulator/*`를 사용한다.
- 주문 가격은 기존 Upbit REST 클라이언트를 재사용한다.
- 인증은 Supabase Auth, 저장은 Vercel 연동 Supabase Postgres를 사용한다.
- service/secret key는 서버에서만 사용한다.
- 브라우저는 publishable 또는 anon key만 사용한다.

### 4.3 코드베이스 분석 Guardrail

`PASS`

- 기존 Vue/Fastify/Vercel 구조를 유지했다.
- 상태 계산, 인증, 저장소, 화면을 독립 모듈로 분리했다.
- 기존 시장 API의 계약을 변경하지 않았다.
- 기존 전체 테스트를 회귀 기준으로 사용했다.

## 5. 구현 설계

### 5.1 서버 구조

- `server/src/simulator/auth.ts`: Bearer token 파싱과 Supabase 사용자 검증
- `server/src/simulator/quoteProvider.ts`: BTC/ETH Upbit 현재가 조회
- `server/src/simulator/repository.ts`: Supabase RPC와 테이블 접근
- `server/src/simulator/service.ts`: 통합 손익 계산과 주문 흐름 조정
- `server/src/routes/simulator.ts`: 상태, 주문, 초기화, 현재가 HTTP 계약
- `server/scripts/migrateSimulator.ts`: Vercel Supabase migration 실행

### 5.2 웹 컴포넌트 구조

- `MyPage`: 계좌 요약, 보유 자산, 초기화를 조합하는 route view
- `ExchangeSimulatorPanel`: 거래소 선택 마켓과 모의 주문 계좌를 연결
- `SimulatorSummary`: 총자산, 통합 손익, 현금, 평가액 표시
- `SimulatorPositions`: 보유 수량, 평단가, 현재가, 평가손익 표시
- `SimulatorOrderForm`: 거래소가 고정한 자산의 방향·수량 입력과 주문 이벤트 발생
- `useSimulatorAccount`: 인증 세션과 계좌 조회·주문·초기화를 두 화면에서 공유
- `simulatorMarket`: `KRW-BTC`, `KRW-ETH`를 simulator symbol로 제한 매핑
- `WelcomeGuide`: 3단계 진행, 포커스 순환, 이전·다음·건너뛰기를 담당하는 중앙 모달
- `WelcomeGuidePreview`: 1억원 계좌, BTC 주문, 손익 요약 장면을 제품 UI로 축약
- `stores/auth.ts`: Supabase 세션의 단일 상태 원천과 웰컴 가이드 메타데이터 저장
- `stores/simulator.ts`: 계좌 조회, 주문, 초기화 요청 상태

Vue 3 Composition API와 `<script setup lang="ts">`를 사용했고, 데이터는 props로 내리고 주문은 emit으로 올린다.

### 5.3 데이터 모델

#### `profiles`

- `id uuid primary key references auth.users(id)`
- `display_name text`
- `starting_cash numeric(20, 2) default 100000000`
- `created_at`, `updated_at`

#### `sim_accounts`

- `id uuid primary key`
- `user_id uuid unique references profiles(id)`
- `cash_balance numeric(20, 2)`
- `mode text check (mode = 'paper')`
- `created_at`, `updated_at`

#### `sim_positions`

- `account_id uuid references sim_accounts(id)`
- `symbol text check (symbol in ('BTC', 'ETH'))`
- `quantity numeric(28, 8) check (quantity > 0)`
- `avg_price numeric(20, 2) check (avg_price > 0)`
- unique(`account_id`, `symbol`)

#### `sim_orders`

- `account_id uuid references sim_accounts(id)`
- `symbol`, `side`, `quantity`, `price`
- `executed_at timestamptz`
- `status text check (status = 'filled')`

모든 테이블에 RLS를 활성화했다. 브라우저에서 가능한 동작은 자신의 데이터 조회뿐이며, 쓰기와 정산은 서버 전용 RPC로 처리한다.

### 5.4 DB RPC

- `ensure_sim_account(user_id)`: 프로필과 계좌를 멱등 생성
- `execute_sim_order(user_id, symbol, side, quantity, price)`: 계좌 잠금, 검증, 포지션 갱신, 주문 기록
- `reset_simulator(user_id)`: 포지션·주문 삭제와 초기 자금 복구

RPC 실행 권한은 `service_role`에만 부여하고 `public`, `anon`, `authenticated`에서는 회수했다.

### 5.5 API 계약

| Method | Path | 인증 | 목적 |
| --- | --- | --- | --- |
| `GET` | `/api/simulator/state` | 필요 | 계좌와 현재 평가 상태 조회 |
| `POST` | `/api/simulator/order` | 필요 | 서버 현재가로 시장가 주문 |
| `POST` | `/api/simulator/reset` | 필요 | 계좌 초기화 |
| `GET` | `/api/market/quote?symbols=BTC,ETH` | 불필요 | 지원 자산 현재가 조회 |

오류 규칙은 `400` 입력 오류, `401` 인증 오류, `409` 잔고·보유량 충돌, `503` 가격·저장소 장애다.

### 5.6 환경변수

#### 웹

| 변수 | 용도 |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | 권장 브라우저 공개 키 |
| `VITE_SUPABASE_ANON_KEY` | publishable key가 없을 때의 기존 공개 키 |

#### 서버

| 변수 | 용도 |
| --- | --- |
| `SUPABASE_URL` 또는 `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
| `SUPABASE_SECRET_KEY` | 우선 사용하는 서버 전용 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 기존 service role fallback |
| `POSTGRES_URL_NON_POOLING` 또는 `POSTGRES_URL` | migration 실행 |

서버 키는 웹 번들 또는 API 응답에 포함하지 않는다.

## 6. Task 결과

### Task 1. Supabase 기반과 인증

- 해야 할 일: 웹 세션, Google OAuth, 로그아웃, 서버 JWT 검증
- 이유: 사용자별 계좌 소유권 보장
- 변경 범위: 웹 auth store, Supabase client, 서버 authenticator
- 완료 조건: 로그인 전 차단, 로그인 후 사용자 식별
- 검증 방법: 비인증 API, 세션·OAuth 브라우저 흐름
- 구현 결과: 코드 완료, 실제 비인증 요청 `401 UNAUTHORIZED` 확인, 공개 Auth settings에서 Google Provider 활성 상태 확인
- 상태: `BLOCKED`
- 차단 사유: 실제 Google 계정 동의와 OAuth callback을 거친 로그인·로그아웃 E2E와 Dashboard URL 설정 확인이 남음

### Task 2. DB와 정산 도메인

- 해야 할 일: DDL, RLS, 계좌 생성, 매수·매도, 초기화 트랜잭션
- 이유: 계좌와 포지션 일관성 보장
- 변경 범위: `supabase/migrations`, `server/src/simulator`
- 완료 조건: 주문 정산의 원자 처리
- 검증 방법: 손익 계산, 가격 전달, 잔고 부족, 보유량 부족, 수량 경계값
- 구현 결과: migration을 실제 Supabase DB에 적용하고 PostgREST 테이블 접근 확인
- 상태: `PASS`

### Task 3. Simulator API

- 해야 할 일: 상태, 주문, 초기화, 현재가 라우트와 Zod 검증
- 이유: 브라우저와 정산 도메인 분리
- 변경 범위: `server/src/routes/simulator.ts`, 서버 테스트
- 완료 조건: 인증 사용자의 요청만 계좌를 변경
- 검증 방법: 정상·401·400·409·현재가 조회 테스트
- 구현 결과: 신규 서버 테스트 13개 통과, 실제 환경 BTC/ETH 현재가 2건 `200` 확인
- 상태: `PASS`

### Task 4. 거래소 주문과 마이페이지 UI

- 해야 할 일: `/exchange` 모의 주문, `/mypage` 인증·요약·포지션·초기화
- 이유: MVP 사용자 흐름 제공
- 변경 범위: Vue route, Pinia stores, API client, simulator 컴포넌트, AppNav
- 완료 조건: 데스크톱·모바일에서 로그인부터 주문 결과 확인까지 가능
- 검증 방법: API·컴포넌트 테스트, build, 브라우저 시각 검증
- 구현 결과: 거래소 선택 종목 고정 주문, 마이페이지 분리, 최초 가입 웰컴 가이드 구현, 웹 전체 테스트 108개와 Vue 타입·프로덕션 빌드 통과
- 상태: `BLOCKED`
- 차단 사유: 기존 계좌 화면 브라우저 렌더링은 통과했지만 실제 최초 Google 가입 이후 웰컴 모달 시각 E2E를 검증하지 못함

### Task 5. 회귀 검증과 배포 점검

- 해야 할 일: 기존 기능 전체 테스트, 전체 build, 환경변수와 DB 적용 확인
- 이유: 공개 시장 대시보드의 기존 동작 보존
- 변경 범위: 전체 저장소
- 완료 조건: 자동 검증 통과, 알려진 핵심 미검증 경로 없음
- 검증 방법: `npm test`, `npm run build`, 실제 환경 smoke test
- 구현 결과: 자동 테스트와 build는 통과했으나 OAuth E2E가 남음
- 상태: `BLOCKED`

## 7. 구현 결과

### 7.1 추가된 기능

- Google OAuth 진입과 세션 유지, 로그아웃 UI
- Google Provider 비활성 상태 사전 감지와 외부 오류 페이지 이동 차단
- 웰컴 완료 이력이 없는 사용자에게 한 번 노출되는 3단계 가이드
- 웰컴 완료·건너뛰기 상태를 Supabase `user_metadata`에 저장해 재노출 방지
- 최초 접근 시 모의 계좌 자동 생성
- BTC/ETH 실시간 시장가 표시
- 시장가 매수·매도 입력과 25%·50%·최대 수량 단축 버튼
- 주문 가능 현금과 보유 수량에 따른 클라이언트 사전 검증
- 서버 입력 검증과 현재가 확정
- DB 트랜잭션 기반 계좌·포지션·주문 원장 정산
- 기존 거래소의 선택 마켓과 연결된 BTC/ETH 모의 주문 패널
- 마이페이지의 총자산, 통합 손익, 평단가, 보유 자산 평가손익 표시
- 2단계 계좌 초기화 버튼
- 기존 내비게이션에 `마이페이지` 경로 추가
- 기존 `/simulator`의 `/mypage` 호환 리다이렉트

### 7.2 적용된 DB

다음 migration을 Vercel 연동 Supabase DB에 적용했다.

```text
supabase/migrations/20260715000000_simulator_mvp.sql
```

재적용 명령은 다음과 같다. migration은 멱등 실행을 고려해 작성했다.

```text
npm run db:migrate:simulator --workspace server
```

### 7.3 구현 Guardrail

`PASS`

- 범위 밖 기능을 추가하지 않았다.
- 가격과 금액 정산을 서버와 DB에서 수행한다.
- DB 쓰기는 원자적 RPC로 제한한다.
- service/secret key는 서버에만 존재한다.
- 기존 공개 시장 API와 페이지 계약을 유지한다.

## 8. 회귀 검증

### 8.1 자동 테스트

```text
npm test
```

| 영역 | 파일 | 테스트 | 결과 |
| --- | ---: | ---: | --- |
| 서버 | 13 | 130 | `PASS` |
| 웹 | 30 | 108 | `PASS` |
| 합계 | 43 | 238 | `PASS` |

simulator, Auth Provider, 웰컴 가이드 직접 계약·화면 책임 검증은 서버 13개, 웹 30개다.

### 8.2 빌드

```text
npm run build
```

- 서버 TypeScript build: `PASS`
- 웹 `vue-tsc`와 Vite production build: `PASS`
- `git diff --check`: `PASS`

### 8.3 실제 환경 smoke test

| 경로 | 기대 | 결과 |
| --- | --- | --- |
| BTC/ETH 현재가 | `200`, 2건 | `PASS` |
| 비인증 계좌 상태 | `401 UNAUTHORIZED` | `PASS` |
| Supabase DB migration | 4개 테이블과 3개 RPC 적용 | `PASS` |
| Supabase secret key | 서버 요청 허용 | `PASS` |

### 8.4 정상 흐름

- 통합 손익과 수익률 공식: `PASS`
- 실현 손실이 현금에 남은 상태의 통합 손익: `PASS`
- 서버 현재가로 주문 실행: `PASS`
- 계좌 상태 조회와 초기화: `PASS`
- 주문 폼 정상 매수·매도 emit: `PASS`
- 거래소 ETH 선택 시 ETH 주문 payload 유지: `PASS`
- 지원하지 않는 거래소 마켓 주문 차단: `PASS`
- 웰컴 상태가 없는 사용자의 `pending` 생성과 3단계 완료 저장: `PASS`
- 기존 사용자라도 상태가 없으면 1회 노출, `completed` 사용자는 미노출: `PASS`

### 8.5 실패 흐름

- 인증 없음: `401` 검증 `PASS`
- 현금 부족: `409` 검증 `PASS`
- 보유량 부족: DB 오류 매핑과 UI 제한 구현 `PASS`
- 지원하지 않는 자산: `400` 검증 `PASS`
- 서버 오류 응답의 웹 메시지 보존: `PASS`
- Google Provider 비활성 시 OAuth redirect 미실행: `PASS`
- 웰컴 완료 메타데이터 저장 실패 시 모달 유지와 재시도 안내: `PASS`

### 8.6 경계값

- 수량 `0`, 음수: 거절 `PASS`
- 소수점 8자리 초과: 거절 `PASS`
- 최대 수량 1,000,000 초과: 거절 `PASS`
- 매도 수량이 보유량보다 큼: UI 비활성화 `PASS`
- 포지션이 없는 통합 손익: `PASS`
- 인증 시각과 무관한 웰컴 `missing/pending/completed` 메타데이터 우선순위: `PASS`

### 8.7 기존 기능 회귀

- `/`, `/exchange`, `/insights`, `/mypage`: 웹 테스트 통과
- `/simulator`에서 `/mypage` 호환 이동: `PASS`
- Upbit REST, 요청 큐, 김치프리미엄, 글로벌, 심리, 환율: 기존 서버 테스트 통과
- Vercel API URL 정규화와 rewrites: 기존 테스트 통과
- Web Worker 프로토콜과 pipeline: 기존 웹 테스트 통과

알려진 자동 회귀는 없다.

### 8.8 보안·품질 점검

- `npm audit --omit=dev`: 프로덕션 취약점 0건
- 전체 audit: 기존 Vitest 2 개발 의존성에서 moderate 3, high 1, critical 1 경고
- Vite build: 기존 대형 Spline 번들로 500 kB 초과 chunk 경고
- Sass 테스트: legacy JS API deprecation 경고

개발 의존성 major upgrade와 기존 번들 최적화는 이번 MVP 범위에서 제외했다.

## 9. 미검증 경로와 차단 사항

### 9.1 확인된 Supabase 상태

- Supabase API 연결: 정상
- DB migration: 적용 완료
- 서버 secret key: 정상
- Google OAuth: 활성화
- 공개 `/auth/v1/settings`: `external.google=true` 확인
- Google Authorized JavaScript origins: 로컬과 Vercel origin 안내 완료
- Google Authorized redirect URI: Supabase `/auth/v1/callback` 안내 완료
- Supabase Site URL과 Redirect URL: Dashboard 설정값은 공개 settings API로 확인할 수 없음
- 활성 로그인 방식: email, Google

### 9.2 필요한 외부 설정

Google Provider 활성화는 확인했다. 다음 값이 Dashboard에 저장되었는지 최종 점검한다. Client Secret은 문서나 프런트엔드 환경변수에 기록하지 않는다.

1. Google Auth Platform에서 Web application 유형 OAuth Client를 생성한다.
2. Google Authorized JavaScript origins에 `http://localhost:3000`과 `https://coinburrow.vercel.app`을 등록한다. 경로와 끝 `/`는 포함하지 않는다.
3. Google Authorized redirect URIs에 Supabase Callback URL인 `https://vkpvxcnlnlzmrxwtsucg.supabase.co/auth/v1/callback`을 그대로 등록한다. 동일한 값은 Supabase `Authentication > Sign In / Providers > Google`에서도 확인한다.
4. Supabase의 Google Provider를 활성화하고 Google Client ID와 Client Secret을 등록한다.
5. Supabase `Authentication > URL Configuration`의 Site URL을 `https://coinburrow.vercel.app`으로 설정한다.
6. 현재 route 복귀를 위해 Redirect URL 허용 목록에 `http://localhost:3000/**`와 `https://coinburrow.vercel.app/**`를 등록한다. Google Authorized redirect URI의 Supabase Callback URL은 변경하지 않는다.
7. 앱을 새로고침해 Provider 상태를 다시 조회한다. Provider 활성화만으로는 프런트엔드 재빌드가 필요하지 않다.

근거 문서:

- [Supabase Google 로그인 설정](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase Redirect URL 설정](https://supabase.com/docs/guides/auth/redirect-urls)

설정 후 다음을 검증해야 한다.

- Google 로그인 성공과 취소
- OAuth redirect 후 세션 복구
- 웰컴 상태 `missing/pending`에서만 모달 노출, 3단계 이동, `completed` 후 재로그인 미노출
- 최초 계좌 자동 생성
- 실제 첫 매수, 동일 종목 추가 매수 차단, 부분·전량 매도, 전량 매도 후 재매수 차단, 계좌 초기화 후 잠금 해제
- 서로 다른 사용자 간 RLS 격리
- 로그아웃과 만료 토큰
- 데스크톱·모바일 시각 레이아웃
- Vercel 배포 환경의 `/api/simulator/*` 라우팅

## 10. 최종 Guardrail

| 확인 항목 | 상태 | 근거 |
| --- | --- | --- |
| 범위가 명확한가 | `PASS` | 포함·제외 범위와 손익 해석 확정 |
| 판단 근거가 있는가 | `PASS` | 사용자 수정안, 코드 구조, 테스트 결과 기록 |
| 기존 동작과 모순되지 않는가 | `PASS` | 기존 전체 테스트 238개 통과 |
| 문서가 이해 가능한가 | `PASS` | 기획·설계·Task·검증을 단일 문서로 통합 |
| 회귀 영향과 검증 방법이 확인됐는가 | `PASS` | 정상·실패·경계·기존 기능 검증 기록 |
| 핵심 사용자 흐름이 E2E 검증됐는가 | `BLOCKED` | Provider는 활성화됐으나 실제 Google 최초 가입과 웰컴 모달 시각 E2E 미수행 |

## 11. Docker Compose

### 11.1 실행 모드

| 모드 | Compose 파일 | frontend | backend |
| --- | --- | --- | --- |
| 개발 기본값 | `compose.yml` | `coinburrow-frontend:dev`, Vite HMR | `coinburrow-backend:dev`, `tsx watch` |
| production 검증 | `compose.prod.yml` | `coinburrow-frontend:local`, Nginx 정적 SPA | `coinburrow-backend:local`, 컴파일된 Fastify runtime |

기존 `compose.yml`은 production build 결과를 Nginx에서 제공해 소스 파일을 mount하지 않았으므로 HMR이 존재하지 않았다. 이 때문에 UI 변경마다 frontend image rebuild가 필요했고, rebuild를 생략하면 이전 hashed asset이 계속 제공됐다.

개발 기본값은 `web`과 `server`를 bind mount한다. frontend는 Vite를 `0.0.0.0:3000`에서 실행하고 Windows Docker Desktop의 파일 이벤트 누락을 피하도록 polling을 사용한다. backend는 `tsx watch`로 TypeScript 변경 시 재시작한다. 호스트의 플랫폼별 의존성이 컨테이너에 섞이지 않도록 각 workspace의 `node_modules` 경로는 named volume으로 가린다.

두 모드 모두 backend health check가 통과한 뒤 frontend를 시작한다. 개발 Vite proxy와 production Nginx는 `/api/*`의 `/api` prefix를 제거하고 `/market/*`는 경로를 유지한 채 backend로 전달한다.

### 11.2 파일

- `compose.yml`: 기본 개발 모드, bind mount, named volume, Vite HMR, backend watch
- `compose.prod.yml`: 기존 Nginx·컴파일 runtime production 모드
- `server/Dockerfile`: `dependencies`, `development`, `build`, `production-dependencies`, `runtime` stage
- `web/Dockerfile`: `dependencies`, `development`, `build`, `runtime` stage
- `web/vite.config.ts`: 컨테이너에서는 `backend:4000`, 로컬 직접 실행에서는 `localhost:4000` proxy
- `web/nginx.conf`: production SPA fallback과 reverse proxy
- `.dockerignore`: 의존성, build, Git, 환경변수 제외

### 11.3 환경변수

- 개발 backend는 `server/.env`를 runtime에 주입하고 source mount로 watch한다.
- 개발 frontend는 bind mount된 `web/.env.local`을 Vite가 runtime에 읽는다.
- production frontend의 `web/.env.local`은 Vite build 시 BuildKit secret으로만 mount한다.
- 두 환경변수 파일은 Docker build context와 최종 production 이미지에 복사하지 않는다.
- `VITE_*` 값은 공개 브라우저 설정이므로 Vite 산출물에는 정상적으로 포함된다.
- Supabase server secret은 backend runtime 환경에만 존재한다.

### 11.4 실행 명령

개발 환경을 처음 구성하거나 Dockerfile·`package.json`·lockfile이 변경된 경우에만 이미지를 build한다.

```text
docker compose up -d --build
```

일반적인 `.vue`, `.ts`, `.scss` 수정에는 build나 컨테이너 재시작이 필요 없다. 저장 즉시 frontend는 HMR update를 보내고 backend는 필요한 경우 재시작한다. 이미 만든 개발 환경을 다시 켤 때는 다음 명령만 사용한다.

```text
docker compose up -d
```

상태와 로그를 확인한다.

```text
docker compose ps
docker compose logs -f
```

접속 주소는 frontend `http://localhost:3000`, backend `http://localhost:4000`이다. 개발 환경은 `docker compose down`으로 중지한다.

production 이미지를 빌드하고 실행할 때만 별도 파일을 지정한다.

```text
docker compose -f compose.prod.yml up -d --build
```

### 11.5 이미지와 런타임 검증

| 검증 | 결과 |
| --- | --- |
| 개발·production `docker compose config --quiet` | 모두 `PASS` |
| 개발 backend·frontend image build | 모두 `PASS` |
| 개발 backend·frontend container health | 모두 `healthy` |
| `/exchange`와 `/@vite/client` | 모두 `200`, Vite client 주입 확인 |
| frontend → backend `/api/health` proxy | `200`, `{"status":"ok"}` |
| Vue SFC 변경 감지 | `PASS` - `vite-hmr` WebSocket에서 `file-changed`, `js-update` 수신 |
| backend TypeScript 변경 감지 | `PASS` - `tsx` restart와 listen 재개 확인 |
| production backend TypeScript build | `PASS` |
| production frontend `vue-tsc`·Vite build | `PASS` |
| 검증용 임시 소스 변경 | 모두 제거 |

production 최종 runtime은 기존과 같이 Nginx와 non-root Node 이미지이며 개발 의존성이나 source bind mount를 포함하지 않는다.

### 11.6 Docker Guardrail

`PASS`

- FE와 BE가 한 Compose 명령으로 함께 실행된다.
- 일반 소스 수정에는 Docker image rebuild가 필요하지 않다.
- frontend HMR과 backend watch를 실제 파일 변경으로 검증했다.
- 호스트 `node_modules`가 Linux 컨테이너 의존성을 덮어쓰지 않는다.
- 환경변수 파일이 production 이미지에 복사되지 않는다.
- API proxy와 production build가 모두 유지된다.

## 12. 화면과 정보 구조 재정비

### 12.1 Planning

모의 투자는 독립 페이지가 아니라 기존 거래소의 거래 기능이다. 화면 책임을 다음처럼 확정한다.

| 경로 | 책임 |
| --- | --- |
| `/exchange` | 시장 탐색, 차트·호가·체결 확인, 선택한 BTC/ETH 모의 주문 |
| `/mypage` | 계좌 요약, 통합 손익, 보유 자산, 계좌 초기화 |
| `/simulator` | 저장된 링크 호환을 위한 `/mypage` 리다이렉트 |

화면은 기존 CoinBurrow의 어두운 시장 대시보드 언어를 유지한다. 마이페이지는 `1120px` 중앙 컨테이너를 사용하고, 거래소는 차트 아래에 호가를 왼쪽·주문을 오른쪽에 둔 2열 작업대를 제공한다. `1120px` 이하에서는 호가·주문·체결 순서의 1열로 전환한다. 거래소가 종목의 단일 상태 원천이며 주문서에서 별도 자산을 다시 선택하지 않는다.

Planning Guardrail은 `PASS`다. 제품 행동과 URL 책임이 구분되고 기존 시장 데이터 흐름과 서버 API 계약을 유지한다.

### 12.2 Task 6. 시각 정돈

| 항목 | 기록 |
| --- | --- |
| 해야 할 일 | 과장된 히어로·영문 장식·원형 배지를 제거하고 정보 중심 화면으로 재배치 |
| 이유 | 장식이 계좌·손익·주문 정보의 위계를 약화했음 |
| 변경 범위 | 계좌 요약, 보유 자산, 주문서, 중앙·반응형 레이아웃 |
| 완료 조건 | 영문 장식 제거, 중앙 배치, 데스크톱·모바일 가로 오버플로 없음 |
| 검증 방법 | 소스 계약, component test, production build, 실제 렌더링 |

Task 결과는 `PASS`다.

### 12.3 Task 7. 거래소 주문과 마이페이지 분리

| 항목 | 기록 |
| --- | --- |
| 해야 할 일 | 주문 기능을 `/exchange`로 이동하고 기존 화면을 `/mypage` 계좌 조회로 전환 |
| 이유 | 사용자는 시장을 분석한 거래소에서 바로 주문해야 하며 마이페이지는 계좌 관리가 목적임 |
| 변경 범위 | Router, AppNav, OAuth redirect, `MyPage`, `ExchangeSimulatorPanel`, `SimulatorOrderForm`, 공통 composable, 테스트 |
| 완료 조건 | 거래소 선택 BTC/ETH만 주문, 마이페이지에 주문서 없음, 기존 `/simulator` 링크 호환 |
| 검증 방법 | 마켓 매핑·payload·라우트 계약 테스트, 전체 회귀, Docker, 데스크톱·모바일 브라우저 렌더링 |

Task 결과는 `PASS`다.

### 12.4 Task 8. 비활성 OAuth Provider 차단

| 항목 | 기록 |
| --- | --- |
| 해야 할 일 | Supabase Google Provider 상태를 로그인 전에 확인하고 비활성 상태에서는 OAuth redirect 차단 |
| 이유 | 비활성 Provider로 이동하면 앱을 벗어나 `Unsupported provider: provider is not enabled` JSON 오류가 노출됨 |
| 변경 범위 | Supabase client helper, auth store, 마이페이지·거래소 로그인 버튼, Auth tests |
| 완료 조건 | Google 비활성 시 버튼 disabled, 한국어 안내 표시, `signInWithOAuth` 미호출 |
| 검증 방법 | settings parser와 auth store test, 실제 Supabase settings 조회, Docker 브라우저 클릭 검증 |

Task 구현은 `PASS`다. 공개 Auth settings에서 Google Provider 활성화도 `PASS`로 전환했다. 실제 Google 계정 OAuth E2E는 아직 `BLOCKED`다.

### 12.5 Task 9. 최초 가입 웰컴 가이드

| 항목 | 기록 |
| --- | --- |
| 해야 할 일 | 최초 Google 가입 직후에만 3단계 환영·거래·손익 가이드 노출 |
| 이유 | 신규 사용자가 1억원 모의 계좌, 거래소 주문, 마이페이지 조회 흐름을 첫 진입에서 이해해야 함 |
| 변경 범위 | auth store, `useSimulatorAccount`, `MyPage`, `WelcomeGuide`, `WelcomeGuidePreview`, Auth·component tests |
| 완료 조건 | 웰컴 완료 상태가 없는 사용자에게만 1회 노출, 3페이지 이동, 완료·건너뛰기 영구 저장, 저장 실패 시 모달 유지 |
| 검증 방법 | 신규·기존·경계값 auth test, 3단계·건너뛰기·Escape component test, 전체 회귀, build, Docker, 실제 OAuth 브라우저 E2E |

초기 구현은 Google OAuth `user.created_at`과 `last_sign_in_at`이 5분 이내인 경우만 최초 로그인으로 판정했다. 실제 Auth 사용자는 두 시각 차이가 약 27분이고 `coinburrow_welcome_guide`가 없어 안내를 보지 않았음에도 모달이 숨겨졌다.

인증 시각은 가입 완료 여부의 영구적 근거가 아니므로 판정에서 제거했다. `coinburrow_welcome_guide`가 없거나 `pending`이면 노출하고, 완료나 건너뛰기 시 `completed`를 Supabase `user_metadata`에 저장한다. 기존 사용자도 이 상태가 없으면 최초 1회 안내를 보게 되고, `completed`는 재로그인에서도 숨긴다.

수정본은 2026-07-15 Vercel production deployment `dpl_D2cQfS39wXp3QoJCKbbkbs2ASbwW`로 배포하고 `https://coinburrow.vercel.app`에 연결했다. 운영 `/mypage` 응답은 `200`이며, 실제 제공 번들에서 상태 키 `coinburrow_welcome_guide`와 웰컴 문구를 확인했다.

이미지 생성은 사용하지 않았다. 실제 계좌·주문·손익 UI를 축약한 CSS 미리보기가 사용법을 더 직접 설명하고, 비트맵 자산과 추가 네트워크 비용을 피할 수 있다.

코드·자동 검증·Docker·Vercel production 반영은 `PASS`다. 브라우저 제공 불가로 실제 최초 가입과 모달 시각 E2E는 `BLOCKED`다.

### 12.6 Task 10. 호가·주문 인접 작업대

| 항목 | 기록 |
| --- | --- |
| 해야 할 일 | 거래소 호가 패널 오른쪽에 주문 패널을 붙여 업비트 PC와 같은 거래 흐름 제공 |
| 이유 | 호가 확인과 주문 입력 사이의 시선 이동을 줄이고 선택 종목을 즉시 거래하기 위함 |
| 변경 범위 | `ExchangePage`, `ExchangeSimulatorPanel`, 정보 구조·반응형·컴포넌트 테스트 |
| 완료 조건 | 데스크톱 `호가 | 주문` 2열, 작은 화면 `호가 → 주문 → 체결` 1열, 기존 주문 payload와 계좌 흐름 유지 |
| 검증 방법 | 패널 DOM 순서, 2열·1열 CSS 계약, 주문 component test, 전체 회귀, build, Docker, 실제 뷰포트 시각 점검 |

[업비트 PC 디지털 자산 매매 가이드](https://support.upbit.com/hc/ko/articles/900005595146-%EB%94%94%EC%A7%80%ED%84%B8-%EC%9E%90%EC%82%B0-%EB%A7%A4%EB%A7%A4-%EB%B0%A9%EB%B2%95-PC)의 호가 확인과 주문 입력이 인접한 정보 구조를 기준으로 삼았다. 현재 서버 계약은 시장가만 지원하므로 지정가·예약 주문을 동작하는 것처럼 노출하지 않고, `모의투자 · 시장가`를 명시했다.

`ExchangeSimulatorPanel`은 주문 기능에 집중한다. `계좌 보기` 링크, `실제 자산이 아닌 모의 계좌로 체결됩니다.` 안내, `exchange-simulator__asset` 종목명 헤더는 제거했다. 주문서 안에서는 총 자산을 선택 종목 바로 위에 배치하고, 현재 시장가 바로 아래에 매수 상태면 주문 가능 현금, 매도 상태면 선택 종목 보유 수량만 표시한다. `1120px` 이하에서는 호가·주문 작업대 전체를 1열로 전환한다.

수정본은 2026-07-15 Vercel production deployment `dpl_PkWLCu3MoHKMrwyhipWTrJSXBNak`로 배포하고 `https://coinburrow.vercel.app`에 연결했다. 운영 `/exchange` 응답은 `200`이며, 실제 제공 JS/CSS에서 총 자산은 선택 종목 위에, 매수·매도별 주문 가능 현금·보유 수량은 현재 시장가 아래에 배치된 것을 확인했다.

로컬 Docker 화면이 갱신되지 않은 원인은 frontend 컨테이너가 수정 전 asset `index-CZo9_riC.js`를 계속 제공한 것이었다. frontend 이미지를 다시 build하고 컨테이너를 recreate한 뒤 `/exchange` 응답 asset이 `index--ww21HUh.js`로 바뀌었으며, 새 번들에서 `account-total`, `order-availability`, `주문 가능 현금`, `보유 수량`을 모두 확인했다.

코드·자동 테스트·build·Docker·Vercel production 반영은 `PASS`다. 실행 환경에 제어 가능한 브라우저가 없어 새 작업대의 실제 데스크톱·모바일 시각 점검은 `BLOCKED`다.

### 12.7 Task 11. 주문 3필드와 수량 제어

| 항목 | 기록 |
| --- | --- |
| 해야 할 일 | 주문서에 매수·매도가격, 주문수량, 주문총액 3필드와 비율·slider·`- / +` 제어 추가 |
| 이유 | 사용자가 현재 체결 가격과 주문 결과 금액을 확인하면서 가용 자산 기준 수량을 빠르게 결정하도록 하기 위함 |
| 변경 범위 | `SimulatorOrderForm`의 파생값·입력 상태·템플릿·SCSS, 기존 주문 form·panel component test |
| 완료 조건 | 가격은 읽기 전용, 수량과 총액은 모두 직접 입력 가능, 두 입력 양방향 환산, native spinner 대신 row형 `- / +`, 음수 차단, 0.01 단위·소수점 둘째 자리 제한, 비율과 slider 유지 |
| 검증 방법 | 필드·계산·전환 component test, 웹 전체 회귀, `vue-tsc`·Vite build, 실행 중 Docker Vite source와 HMR log 확인 |

[업비트 PC 디지털 자산 매매 가이드](https://support.upbit.com/hc/ko/articles/900005595146-%EB%94%94%EC%A7%80%ED%84%B8-%EC%9E%90%EC%82%B0-%EB%A7%A4%EB%A7%A4-%EB%B0%A9%EB%B2%95-PC)는 시장가 매수에서 주문총액, 시장가 매도에서 주문수량을 입력하도록 안내한다. 이번 주문서는 사용자 요구에 따라 두 필드를 모두 편집 가능하게 제공하되, 매수에서는 총액 테두리, 매도에서는 수량 테두리를 강조해 주 입력의 차이를 남긴다.

서버 주문 API는 `symbol`, `side`, `quantity`만 받는 시장가 계약이므로 가격과 주문총액을 임의로 주문 조건처럼 전송하지 않는다. 가격 필드는 선택 종목의 live ticker를 읽기 전용으로 표시한다. 수량을 입력하면 `가격 × 수량`으로 총액을 계산하고, 총액을 입력하면 `총액 ÷ 가격`을 0.01 단위 수량으로 내려 환산한다. live ticker가 바뀌면 마지막으로 사용자가 편집한 필드는 유지하고 반대 필드만 다시 계산한다. 매도 상태에서는 가격 라벨을 `매도가격`으로 바꾼다.

기본 수량 제어는 주문 가능 현금 또는 선택 종목 보유 수량의 `10%`, `25%`, `50%`, `100%`를 0.01 단위로 내림한다. `직접입력`을 누르면 다섯 버튼을 DOM에서 제거하고 0~100% range slider를 표시한다. slider 이동은 같은 수량 상태를 갱신하므로 주문총액과 submit 가능 여부가 즉시 동기화되며, `비율 선택`으로 기존 버튼 모드에 돌아갈 수 있다.

주문수량과 주문총액은 `type="text"`와 `inputmode="decimal"` 조합으로 browser native up/down spinner를 제거했다. 각 input 오른쪽에는 border로 구분한 `- | +` 버튼을 한 행에 배치한다. 두 버튼은 0.01씩 조절하고 0 아래로 내려가지 않으며, 직접 입력은 음수를 0으로 바꾸고 세 번째 이후 소수 자리를 제거한다. 가격 input은 이 stepper 없이 기존 읽기 전용 상태를 유지한다.

관련 component test 2파일 9개와 웹 전체 30파일 111개가 통과했고 production `vue-tsc`·Vite build도 통과했다. 양방향 환산, live 가격 재계산, 두 stepper, 음수 차단, 소수점 절삭을 검증했다. Docker 이미지는 다시 만들지 않았으며 실행 중 Vite가 HMR update를 기록하고 변환된 SFC에서 `order-stepper`, 0.01 증가 handler, 입력 sanitizer를 제공한 것을 확인했다. Task 결과는 `PASS`다.

### 12.8 Task 12. 계좌·시장 정보 섹션 통합

| 항목 | 기록 |
| --- | --- |
| 해야 할 일 | 총 자산, 선택 종목, 현재 시장가, 주문 가능 현금·보유 수량을 하나의 정보 섹션으로 래핑하고 시각적 위계 개선 |
| 이유 | 주문 입력 전 확인해야 하는 계좌·시장 정보가 분리된 선과 여백으로 흩어져 있어 정보 묶음과 읽기 순서가 불명확했기 때문 |
| 변경 범위 | `SimulatorOrderForm` 템플릿·scoped SCSS와 기존 component test의 구조 검증 |
| 완료 조건 | 네 정보가 하나의 의미론적 섹션에 포함되고, 총 자산·종목·시세·주문 가능 값의 우선순위와 매수·매도 상태가 명확하며 기존 주문 동작은 유지 |
| 검증 방법 | 직접 자식 구조 component test, `vue-tsc`·Vite build, 실제 `/exchange` 데스크톱·모바일 시각 점검 |

`account-summary`를 `aria-label="계좌 및 시장 정보"`인 단일 `section`으로 추가하고 기존 네 정보 블록을 직접 자식으로 이동했다. 총 자산은 17px tabular 숫자를 사용하는 상단 헤더로 강조하고, 선택 종목·현재 시장가·주문 가능 값은 동일한 높이와 내부 간격을 가진 ledger형 행으로 정렬했다. 등락률은 작은 상태 badge로 분리하고 주문 가능 값은 매수·매도 색상을 적용했다. 별도 component는 추가하지 않았으며 props, emit, 주문 계산 계약도 변경하지 않았다.

기존 주문 form component test 1파일 7개와 production `vue-tsc`·Vite build는 `PASS`다. 한 섹션의 직접 자식 구조와 접근성 이름을 검증했다. 다만 실행 환경에 연결 가능한 브라우저가 없어 실제 렌더링, 좁은 주문 패널의 overflow, 데스크톱·모바일 시각 위계는 검증하지 못했다. Task 결과는 `BLOCKED`이며 사용자 화면 확인이 필요하다.

### 12.9 Task 13. 전역 인증 액션과 비로그인 주문 UX

| 항목 | 기록 |
| --- | --- |
| 해야 할 일 | 모든 페이지에서 로그인 상태에 따라 로그인·로그아웃 버튼을 항상 제공하고, 주문 패널의 비로그인 상태 UI 개선 |
| 이유 | 로그아웃이 마이페이지에만 있어 다른 경로에서 세션을 종료할 수 없고, 기존 비로그인 주문 패널은 현재 선택한 주문 맥락과 로그인 후 이점을 충분히 설명하지 못했기 때문 |
| 변경 범위 | `AppNav`, `LandingPage`, `MyPage`, `ExchangeSimulatorPanel`, 인증·페이지·주문 panel component/source test |
| 완료 조건 | 네 주요 페이지에 같은 인증 버튼이 존재하고 비로그인은 로그인, 로그인은 로그아웃으로 분기하며, 비로그인 주문 패널은 종목 제목·시작 포인트·명확한 CTA만 간결하게 표시 |
| 검증 방법 | 인증 action component test, 네 페이지 source contract, 주문 panel component test, 웹 전체 회귀, `vue-tsc`·Vite build, Docker HMR·served SFC 확인 |

`AppNav`가 Pinia auth store를 직접 초기화하도록 책임을 옮겼다. 인증 버튼은 항상 DOM에 있으며 세션 확인 중에는 `확인 중`, 비로그인은 `로그인`, 로그인은 `로그아웃`으로 전환된다. Supabase 미설정 또는 Google Provider 비활성 상태에서도 버튼 위치를 유지하고 disabled 사유를 `aria-label`과 `title`로 제공한다. 로그인 세션은 상태 점으로 구분하고 로그아웃 중 중복 동작을 차단한다.

기존 `AppNav`가 있던 거래소·시장 동향·마이페이지에 더해 랜딩에도 overlay `AppNav`를 추가해 모든 route page가 같은 인증 action을 사용한다. 마이페이지 slot에 있던 중복 로그아웃 버튼과 전용 SCSS는 제거했다. auth store의 기존 초기화 promise가 중복 호출을 합치므로 `AppNav`와 simulator composable이 함께 mount되어도 세션 요청은 중복 실행되지 않는다.

비로그인 주문 패널은 dashed 빈 상태 대신 solid 주문 잠금 카드로 변경했다. `BTC/ETH 주문을 시작하세요` 제목, 로그인 시 지급되는 1억원 포인트, `Google 로그인` CTA, 마이페이지 확인 경로를 한 흐름으로 표시한다. 후속 UI 조정에서 중복되는 `선택 종목`·`현재 시장가` label 행과 관련 formatter를 제거하고 제목 크기를 18px에서 21px로 키웠으며, 카드 최소 높이는 desktop 238px·mobile 230px로 줄였다. 로그인 완료 후 사용하는 주문 form, 주문 payload, OAuth callback 경로는 변경하지 않았다.

타깃 테스트 4파일 10개와 웹 전체 31파일 114개, production `vue-tsc`·Vite build가 통과했다. 첫 전체 회귀에서 랜딩 smoke test가 실제 앱과 달리 Pinia 없이 mount되어 실패했으나 production 구성과 동일하게 Pinia를 설치하도록 수정한 뒤 전체 재실행에서 통과했다. 상세 label 제거 후 주문 panel test 1파일 3개와 웹 전체 31파일 114개를 다시 통과했다. Docker frontend·backend는 `healthy`, `/exchange`는 `200`이며 image rebuild 없이 Vite HMR에서 로그인 카드 template·style 갱신을 확인했다. 실제 로그인·비로그인 데스크톱·모바일 시각 검증은 연결 가능한 브라우저가 없어 `BLOCKED`다.

### 12.10 Task 14. OAuth 현재 route 복귀

| 항목 | 기록 |
| --- | --- |
| 해야 할 일 | 로그인 시도 위치를 기억하고 Google OAuth 완료 후 같은 route로 복귀 |
| 이유 | 거래소에서 로그인을 시작해도 `/mypage`로 강제 이동해 사용자가 선택한 작업 맥락을 잃었기 때문 |
| 변경 범위 | auth store의 OAuth `redirectTo`, auth·AppNav·navigation test, Supabase Redirect URL 운영 설정 문서 |
| 완료 조건 | 현재 origin의 pathname·query가 보존되고 `/mypage` 고정 redirect가 제거되며 Provider 비활성 guard 유지 |
| 검증 방법 | `/exchange?market=KRW-ETH`와 `/insights?section=kimchi` unit/component test, 웹 전체 회귀, `vue-tsc`·Vite build, Docker served source 확인 |

auth store의 `currentAuthRedirectUrl`은 로그인 버튼을 누른 시점의 `window.location.origin`, `pathname`, `search`를 조합한다. `signInWithGoogle`은 이 값을 Supabase `signInWithOAuth`의 `redirectTo`로 전달하므로 거래소에서 시작한 인증은 거래소로, 시장 동향에서 시작한 인증은 시장 동향으로 돌아온다. route를 외부 입력으로 받지 않고 현재 same-origin location만 사용하며 기존 Google Provider 활성 여부 확인은 OAuth 호출 전에 그대로 수행한다. client-only 기본 implicit flow가 OAuth token을 URL fragment에 전달하므로 충돌 방지를 위해 기존 hash는 복귀 주소에서 제외한다.

Supabase 공식 Redirect URLs 문서에 따라 `redirectTo`는 Dashboard allow list와 일치해야 한다. 기존 `/mypage` 전용 항목 대신 local `http://localhost:3000/**`와 production `https://coinburrow.vercel.app/**`를 허용해야 한다. 이 값은 앱이나 공개 settings API로 확인할 수 없으므로 Dashboard 확인 전 실제 OAuth E2E는 `BLOCKED`다. Google Authorized redirect URI인 Supabase `/auth/v1/callback`은 변경 대상이 아니다.

타깃 테스트 3파일 10개와 웹 전체 31파일 115개가 통과했고 production `vue-tsc`·Vite build도 통과했다. Docker `/exchange`는 `200`이며 served auth source에서 현재 route helper와 `/mypage` 고정값 제거를 확인했다. 알려진 자동 회귀는 없다.

### 12.11 Task 15. 차트 평균 매수가 라벨

| 항목 | 기록 |
| --- | --- |
| 해야 할 일 | 모의 매수 후 현재 거래소 차트에 해당 종목의 매수가 라벨 표시 |
| 이유 | 주문 체결 뒤 사용자가 현재가와 자신의 진입 단가를 차트에서 바로 비교할 수 없었기 때문 |
| 변경 범위 | `ExchangePage`, `CandleChartV2`, 거래소 page·차트 가격선 component test |
| 완료 조건 | 선택 종목 포지션의 매수가가 `매수가` 가격선으로 표시되고 종목 전환·전량 매도·계좌 초기화 상태를 즉시 반영 |
| 검증 방법 | Pinia 포지션 연동 test, Lightweight Charts 가격선 생성·갱신·제거 test, 웹·서버 전체 회귀, production build, Docker served SFC 확인 |

주문 API는 체결 후 갱신된 계좌 상태를 반환하고 Pinia simulator store는 이를 즉시 교체한다. 개별 주문 순간 가격을 별도로 복제하지 않고 서버가 정산한 선택 종목 포지션의 `avgPrice`를 사용하므로 새로고침 후에도 기준이 유지된다. 현재 MVP에서는 추가 매수를 제한하므로 이 값은 계좌 초기화 이후 해당 종목의 최초 체결가다. `ExchangePage`는 `KRW-BTC`, `KRW-ETH`를 simulator symbol로 변환해 현재 종목의 `avgPrice`만 `CandleChartV2`에 전달한다.

차트는 Lightweight Charts의 `createPriceLine`으로 밝은 라임색 점선과 우측 축의 `매수가` 라벨을 만든다. 가격 prop 변경 시 기존 가격선의 options를 갱신하고, 포지션 없음·다른 종목 전환·전량 매도·계좌 초기화로 값이 없어지면 `removePriceLine`으로 즉시 제거한다. 계좌 초기화 후 같은 종목을 새로 매수하면 가격선을 다시 생성하며 component unmount에서도 정리한다.

타깃 테스트 2파일 3개에서 BTC 평균가 전달, ETH 종목 전환, ETH 포지션 생성, 가격 prop 갱신, 포지션 제거, 가격선 재생성을 검증했다. 웹 전체 32파일 117개, 서버 전체 13파일 130개와 production `vue-tsc`·Vite build가 통과했다. Docker frontend·backend는 `healthy`이고 Vite가 image rebuild 없이 `매수가`, `createPriceLine`, `selectedBuyPrice`가 포함된 최신 SFC를 HTTP `200`으로 제공한다. 실행 환경에 연결 가능한 브라우저가 없어 로그인 후 실제 주문과 차트 라벨의 시각 검증은 `BLOCKED`다.

### 12.12 Task 16. 종목별 매수 1회 제한

| 항목 | 기록 |
| --- | --- |
| 해야 할 일 | MVP에서 BTC·ETH 각 종목을 계좌 초기화 전까지 한 번만 매수하도록 제한 |
| 이유 | 추가 매수와 평균단가 누적을 MVP 범위에서 제외하고 한 번의 진입과 매도 결과에 집중하기 위함 |
| 변경 범위 | Supabase 주문 RPC·migration runner, server snapshot·error contract, web API schema, `ExchangeSimulatorPanel`, `SimulatorOrderForm`, Vercel simulator API entry·rewrite, server·web test |
| 완료 조건 | 첫 매수는 체결되고 같은 종목의 추가 매수와 전량 매도 후 재매수는 차단되며, 다른 종목 매수·기존 종목 매도·계좌 초기화 후 재매수는 가능 |
| 검증 방법 | DB migration source·repository·route test, form·panel·API component test, Supabase migration 실제 적용, 전체 회귀, production build, Docker health·served SFC, Vercel production API 확인 |

제한의 기준은 현재 포지션이 아니라 계좌 초기화 이후의 `sim_orders` 매수 이력이다. 따라서 부분 매도나 전량 매도로 포지션이 줄거나 삭제되어도 매수 횟수는 복구되지 않으며 `reset_simulator`가 주문 이력과 포지션을 함께 삭제한 뒤에만 다시 매수할 수 있다. BTC와 ETH는 서로 독립적으로 각각 한 번씩 매수 가능하다.

새 migration `20260715010000_single_buy_per_symbol.sql`은 계좌 row를 `for update`로 잠근 트랜잭션 안에서 기존 buy order 또는 position을 확인하고 `BUY_LIMIT_REACHED`를 발생시킨다. 동일 계좌의 동시 요청도 직렬화되므로 우회할 수 없다. repository는 이를 사용자 메시지를 포함한 HTTP `409` domain error로 변환한다. migration runner는 migrations directory의 SQL을 이름순으로 읽어 한 트랜잭션에서 적용하도록 변경했으며 실제 Supabase에 base와 신규 migration이 정상 적용됐다. 기존 계좌·주문·포지션 데이터는 유지했다.

계좌 state에는 중복 제거된 `purchasedSymbols`가 추가됐다. 주문 panel이 이를 `SimulatorOrderForm`에 전달하고, 매수 완료 종목에서는 수량·총액·비율 제어와 submit을 비활성화하며 `BTC/ETH 매수 완료`와 계좌 초기화 전 제한 안내를 표시한다. 매도 탭은 그대로 활성화되고, 초기화 응답에서 `purchasedSymbols`가 비면 매수 입력이 다시 열린다. 서버 RPC가 최종 권한을 가지므로 UI 우회 요청도 같은 `409`로 차단된다.

타깃 테스트는 서버 4파일 18개와 웹 5파일 18개가 통과했다. 최초 production 배포 확인에서 `/api/simulator/state`가 `404`인 기존 Vercel routing 누락을 발견해 market API와 같은 고정 `api/simulator.ts` entry와 rewrite를 추가했고, API handler 테스트 1파일 20개를 통과했다. 최종 서버 전체 15파일 137개, 웹 전체 32파일 119개, 합계 47파일 256개와 양쪽 production build가 모두 통과했다. Docker frontend·backend는 `healthy`, health와 served SFC는 HTTP `200`이며 image rebuild 없이 `purchasedSymbols`, 제한 안내, `매수 완료` 반영을 확인했다.

Vercel production deployment `dpl_68cwFNLAB5WHUdPJ7mkeC5JtjCFZ`를 `https://coinburrow.vercel.app`에 연결했다. 운영 `/exchange`와 JS bundle은 HTTP `200`이고 `purchasedSymbols`와 종목별 1회 제한 문구를 포함한다. 인증 없이 호출한 운영 `/api/simulator/state`는 Fastify 계약인 `401 UNAUTHORIZED`를 반환해 function routing까지 확인했다. 실제 로그인 계정에서 첫 매수·중복 매수·전량 매도 후 재매수·초기화 후 재매수 시각 E2E는 연결 가능한 브라우저가 없어 `BLOCKED`다.

### 12.13 Developing

| 컴포넌트 | 구현 내용 |
| --- | --- |
| `MyPage` | 인증, 계좌 요약, 보유 자산, 초기화, 거래소 이동만 제공 |
| `ExchangeSimulatorPanel` | 로그인 사용자는 시장가 주문서, 비로그인 사용자는 종목 제목·시작 포인트·Google 로그인 CTA를 제공 |
| `SimulatorOrderForm` | 계좌·시장 정보를 단일 요약 section으로 표시하고, 읽기 전용 가격, 양방향 수량·총액, row형 `- / +`, 비율 버튼과 slider를 제공하며 매수 완료 종목은 계좌 초기화 전까지 재매수를 차단 |
| `useSimulatorAccount` | 두 화면의 인증 초기화, 계좌 로딩, 주문, 재시도, 초기화 공유 |
| `simulatorMarket` | `KRW-BTC → BTC`, `KRW-ETH → ETH`만 허용하고 나머지는 주문 차단 |
| Router와 AppNav | `/mypage` 정식 경로와 `/simulator` 호환 리다이렉트, 모든 route page의 로그인·로그아웃 인증 action 제공 |
| Supabase client와 auth store | `/auth/v1/settings`의 `external.google`을 확인해 비활성 OAuth를 차단하고 인증 시작 route로 복귀 |
| auth store 웰컴 상태 | `missing/pending/completed` 판정, `pending/completed` 순차 저장, 저장 실패 피드백 관리 |
| `WelcomeGuide` | Teleport 중앙 모달, 3단계 이동, 포커스 순환, Escape, 본문 스크롤 잠금, 축소 모션 지원 |
| `WelcomeGuidePreview` | 1억원 계좌, BTC 모의 매수, 통합 손익 요약을 반응형 CSS 장면으로 표현 |
| `ExchangePage`와 `CandleChartV2` | 선택 종목 포지션의 서버 평균단가를 라임색 점선과 우측 축 `매수가` 라벨로 표시하고 상태 변화에 따라 갱신·제거 |
| Supabase 주문 RPC와 repository | 계좌 lock 안에서 종목별 buy 이력을 검사하고 `purchasedSymbols`·`BUY_LIMIT_REACHED` 상태와 오류 계약 제공 |

`/api/simulator/*` 경로와 Pinia action 형태는 유지하고 state에 `purchasedSymbols`만 추가했다. DB 정산 RPC는 종목별 1회 제한을 원자적으로 강제하며, 표시 예상가는 거래소 live ticker를 사용하고 실제 체결가는 기존처럼 서버가 주문 시점 Upbit 현재가로 확정한다.

### 12.14 Regression

| 검증 | 결과 |
| --- | --- |
| 정보 구조·거래소 주문 타깃 테스트 6파일, 17개 | `PASS` |
| Provider guard 타깃 테스트 4파일, 10개 | `PASS` |
| 웰컴 가이드 타깃 테스트 2파일, 7개 | `PASS` |
| 호가·주문 작업대 타깃 테스트 6파일, 13개 | `PASS` |
| 주문 3필드·양방향 입력·stepper·비율 제어 타깃 테스트 2파일, 9개 | `PASS` |
| 계좌·시장 정보 단일 section 구조 테스트 1파일, 7개 | `PASS` |
| 계좌·시장 정보 실제 렌더링과 반응형 시각 점검 | `BLOCKED` - 연결 가능한 브라우저 없음 |
| 전역 인증 action·비로그인 주문 UX 타깃 테스트 4파일, 10개 | `PASS` |
| 전역 인증 action·비로그인 주문 UX 시각 점검 | `BLOCKED` - 연결 가능한 브라우저 없음 |
| OAuth 현재 route 복귀 타깃 테스트 3파일, 10개 | `PASS` |
| Supabase Redirect URL allow list | `BLOCKED` - Dashboard 설정값 확인 필요 |
| 차트 평균 매수가 전달·생성·갱신·종목 전환·제거 타깃 테스트 2파일, 3개 | `PASS` |
| 로그인 후 실제 체결과 차트 매수가 라벨 시각 점검 | `BLOCKED` - 연결 가능한 브라우저 없음 |
| 종목별 1회 매수 DB·server·UI 타깃 테스트 9파일, 36개 | `PASS` |
| Vercel simulator 고정 API entry·rewrite 테스트 1파일, 20개 | `PASS` |
| Supabase base·종목별 1회 제한 migration 적용 | `PASS` - 한 transaction으로 적용, 기존 데이터 유지 |
| 실제 계정 첫 매수·중복 차단·전량 매도 후 차단·초기화 후 해제 E2E | `BLOCKED` - 연결 가능한 브라우저 없음 |
| 웹 전체 테스트 32파일, 119개 | `PASS` |
| 서버 전체 테스트 15파일, 137개 | `PASS` |
| 전체 테스트 47파일, 256개 | `PASS` |
| 서버 TypeScript와 웹 `vue-tsc`·Vite build | `PASS` |
| Docker frontend image rebuild | `PASS` |
| Docker frontend와 backend health | `healthy` |
| 개발 Docker SFC 반영 | `PASS` - image rebuild 없이 Vite HMR update와 인증 분기·매수가 가격선·종목별 1회 제한 source 확인 |
| Docker `/exchange`와 배포 CSS 작업대 계약 | `PASS` - HTTP `200`, 2열과 `1120px` 1열 규칙 포함 |
| Vercel production 배포와 `coinburrow.vercel.app` alias | `PASS` - `dpl_68cwFNLAB5WHUdPJ7mkeC5JtjCFZ` |
| 운영 simulator API routing | `PASS` - `/api/simulator/state`가 `401 UNAUTHORIZED`로 Fastify 도달 확인 |
| 운영 `/mypage`와 배포 JS 상태 키·웰컴 문구 | `PASS` - HTTP `200`, 두 문자열 포함 |
| 운영 `/exchange`와 배포 JS/CSS 작업대 계약 | `PASS` - HTTP `200`, 총 자산·가용 금액·보유 수량 위치 조정 |
| `/mypage`, `/exchange`, `/simulator` HTTP | 모두 `200` |
| `/simulator` client route | `/mypage`로 이동 |
| 거래소 로그인 상태 렌더링 | BTC 선택 고정, 자산 select 없음, 주문·계좌 정보 표시 |
| 마이페이지 로그인 상태 렌더링 | 주문서 없음, 요약과 2개 보유 종목 표시 |
| 모바일 390px 렌더링 | 두 화면 모두 `scrollWidth=390` |
| Google Provider 비활성 Docker 렌더링 | 양쪽 버튼 disabled, 설정 안내 표시 |
| 비활성 로그인 버튼 강제 click | `/mypage` 유지, Supabase 오류 페이지 이동 없음 |
| 실제 Supabase Google Provider | `external.google=true` |
| 웰컴 모달 데스크톱·모바일 시각 점검 | `BLOCKED` - 실행 환경에 제어 가능한 브라우저 없음 |
| 호가·주문 작업대 데스크톱·모바일 시각 점검 | `BLOCKED` - 실행 환경에 제어 가능한 브라우저 없음 |

로그인 상태 렌더링은 브라우저에서 Pinia에 검증용 계좌 데이터만 주입했으며 제품 소스와 저장 데이터는 변경하지 않았다. 실제 Google OAuth E2E 차단 사항은 9절과 동일하다.

### 12.15 UI Guardrail

| 확인 항목 | 상태 | 근거 |
| --- | --- | --- |
| 범위가 명확한가 | `PASS` | 거래소는 주문, 마이페이지는 계좌 조회로 구분하고 매수 제한은 계좌 초기화 전 종목별 1회로 확정 |
| 판단 근거가 있는가 | `PASS` | 실제 사용자 흐름과 기존 거래소 선택 상태를 기준으로 설계 |
| 기존 동작과 모순되지 않는가 | `PASS` | 기존 API 경로와 매도·초기화 흐름 유지, 전체 테스트 256개 통과 |
| 문서가 쉽게 이해되는가 | `PASS` | 경로 책임, Task, 구현, Regression을 단일 절에 통합 |
| 회귀 영향과 검증 방법이 확인됐는가 | `BLOCKED` | 자동 테스트·build·Docker는 통과했으나 Supabase route allow list와 실제 OAuth route 복귀, 주요 UI의 실제 뷰포트 검증 미수행 |

## 13. 결론

`BLOCKED`

MVP 코드, Supabase DB schema와 종목별 1회 매수 RPC, 최초 가입 3단계 웰컴 가이드, 호가 오른쪽 주문 작업대, 주문 3필드·수량 stepper·비율 제어, 전 페이지 로그인·로그아웃 action, OAuth 현재 route 복귀, 비로그인 주문 카드, 차트 매수가 라벨, Vercel simulator API routing, 자동 테스트 256개, production build와 배포, Docker 개발 HMR 반영은 완료했다. Google Provider도 활성화되었고 알려진 자동 회귀는 없다.

완료 판정을 위해 실제 Google 신규 가입 1회를 수행해 OAuth callback·세션 복구·계좌 생성·3단계 웰컴 노출·완료 후 재노출 방지를 확인해야 한다. 실제 계정에서 첫 매수, 동일 종목 재매수 차단, 전량 매도 후 재매수 차단, 계좌 초기화 후 잠금 해제도 확인한다. 데스크톱과 모바일에서 웰컴 중앙 배치, 호가·주문 인접 배치, 1열 전환과 가로 오버플로도 함께 시각 검증한다.
