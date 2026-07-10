# MVP: 단일 사용자 기반 모의 투자 시뮬레이터 제안

## 1) 목표
- 실제 거래 위험 없이 **코인/토큰 투자 경험**을 제공
- 사용자에게 포트폴리오 성과를 시뮬레이션으로 학습시킴
- 초기엔 **단일 사용자 기반**으로 출시, 나중에 멀티유저로 확장 가능하게 설계

---

## 2) 필수 인프라 구성 (우선순위)
- Vercel(무료 배포) + Server (API) + Web(프론트)
- Supabase 사용
  - Auth (OAuth 포함)
  - Postgres DB
  - Row Level Security
  - Storage/Realtime(필요 시)

---

## 3) 프로젝트에 필요한 Supabase 키/환경변수(당장 필요)

### 웹 앱(`web`)에 필요한 값
| 변수명 | 용도 | 노출 범위 |
|---|---|---|
| `VITE_SUPABASE_URL` | 브라우저에서 Supabase API 호출 주소 | 공개(클라이언트 번들에 노출 가능) |
| `VITE_SUPABASE_ANON_KEY` | 브라우저에서 로그인/세션 조회용 익명 키 | 공개(클라이언트에서 사용 가능) |

### 서버(`server`)에 필요한 값
| 변수명 | 용도 | 노출 범위 |
|---|---|---|
| `SUPABASE_URL` | 서버에서 Supabase 관리 API 호출 주소 | 서버 전용 |
| `SUPABASE_SERVICE_ROLE_KEY` | 주문/잔고 보정/관리 작업용(최상위 권한) | **비공개, 서버 전용** |
| `SUPABASE_JWT_SECRET` | JWT 검증 필요 시(옵션) | 서버 전용 |
| `DATABASE_URL` | Supabase Postgres 직접 접근(ORM/SQL 사용 시) | 서버 전용 |
| `APP_BASE_URL` | 인증 콜백/리다이렉트 기준 URL | 서버 전용 |

### OAuth 설정 값
- Supabase Dashboard `Authentication → Providers`에 Provider별 등록
  - `Client ID`
  - `Client Secret`
- Supabase OAuth Redirect URL (기본)
  - `https://<project-ref>.supabase.co/auth/v1/callback`
- 허용 사이트 URL
  - 개발: `http://localhost:3000`
  - 배포: `https://<your-vercel-app>.vercel.app`

> 중요: `SUPABASE_SERVICE_ROLE_KEY`는 브라우저에는 절대 노출되지 않도록 분리해야 합니다.

### DB 계층 ORM 선택(Drizzle 권장)
- 단일 사용자 MVP/후속 확장성 모두 고려 시 **Drizzle ORM** 권장
  - 장점
    - TypeScript 기반의 타입 추론이 강함(쿼리 응답 타입 안정성)
    - 단순한 SQL 패턴에 잘 맞고 Postgres 특성을 자연스럽게 반영
    - Prisma 대비 경량/빠른 시작, 번들 부담이 작음
    - `query`/`sql`/`migrations` 경로를 직접 제어하기 쉬움
  - 주의점
    - Prisma처럼 커넥션/릴레이션 다이어그램 자동성이 강한 편은 아님
    - 스키마가 커지면 스키마 파일(`schema.ts`)를 엄격히 관리해야 함

- `server`에서 Drizzle 구성 예시
  - 패키지
    - `drizzle-orm`, `postgres`, `dotenv`
  - 핵심 파일 예시
    - `server/src/db/index.ts`: `drizzle(connect(process.env.DATABASE_URL, {...}), { schema })`
    - `server/src/db/schema.ts`: `profiles`, `sim_accounts`, `sim_positions`, `sim_orders` 정의
  - 연결 문자열
    - 무료 플랜에서는 `POSTGRES_PRISMA_URL` 또는 `POSTGRES_URL`의 풀링 URL 사용 권장
    - 실험/로컬 개발은 `DATABASE_URL`을 `pgbouncer` 모드와 맞춰 구성

- `web`(Vue/Vite)에서는 `@supabase/supabase-js`만 사용
  - 프런트는 인증/실시간 구독/조회 UI 렌더링 용도로만 사용
  - 거래 정산/잔고 계산/시나리오 생성 같은 민감 로직은 `server`에서 처리

---

## 4) MVP 범위 (단일 사용자 전용)

### 4.0 기본 메뉴 구성
- 총 3개 메뉴만 제공
  - `exchange` (거래 화면)
  - `시장동향` (인사이트/감성·트렌드)
  - `마이페이지` (로그인/계좌/내 투자내역)

### 4.0.1 현재 상태 기준
- 현재는 `dashboard` 성격의 화면 중심 구조로 운영 중
- 시뮬레이션 게임 구현 시 `exchange`가 핵심 실행면으로 확장되며, 대시보드 섹션/패널이 점진적으로 추가·고도화됨

### 4.1 최소 기능
1. OAuth 로그인
2. 초기 계좌 생성 (예: 100,000,000 KRW 가상자금)
3. 시뮬레이션 모드 토글(실거래/모의분리)
4. 실시간/주기성 가격 조회(CoinGecko API 또는 캐시된 가격)
5. 매수/매도 주문 엔진
6. 수익률/손익표 대시보드
7. 이벤트 시나리오(급등/급락) 생성기

### 4.2 플레이 규칙 (초기 버전)
- 주문 단위: 기본 단일 토큰 수량 + 시장가 주문만 지원
- 수수료: 예: 거래 금액의 0.1%
- 슬리피지: 단순화하여 0% 또는 소폭 랜덤(예: ±0.2%)
- 체결 방식: 주문 즉시 체결(일부러 지연/부분체결 없음)
- 정산 주기: 매 주문 후 즉시 반영

### 4.3 상태 관리
- 단일 사용자 기준으로도 다음을 반드시 저장
  - 계좌 잔고
  - 보유 자산 수량/평단가
  - 주문 기록(타임스탬프, 가격, 수량, 수수료)
  - 일간/주간 성과 스냅샷

### 4.4 exchange 고도화 우선 패널(권장)
- 거래/포지션 패널
  - 현재가/현재매수가/손익 패널 동시 표시
  - 잔고 기반 주문 가능 수량 피드백
  - 매수/매도 실행 후 즉시 반영
- 주문 패널
  - 매수·매도 입력 + 수수료/예상체결금액 프리뷰
  - 실패 사유 메시지(잔고 부족, 미지원 심볼 등) 노출
- 성과/내역 패널
  - 내 투자내역 탭(거래 내역·실현손익)
  - 일별 변동/보유자산 분포
- 시장 패널
  - 호가/체결/차트 동기화 상태 인디케이터(중간가, 업데이트 시각)
  - 가격 소스 불일치 감지 시 경고 배지
- 시장동향 연동
  - 시장 트렌드 요약/감성 지표를 exchange 내 보조 패널로 연결

### 4.5 대시보드에서 투자게임 화면으로의 진화
- 현재 화면은 시장 데이터 대시보드에 가까움
- v1 시뮬레이터에서는 기존 대시보드를 유지하면서 `exchange`에 게임 실행 패널을 단계적으로 추가
- 기존 패널 유지
  - 차트
  - 호가
  - 체결
  - 코인 리스트
  - 시장 요약
- 신규 패널 추가
  - 내 계좌 요약(현금, 총 평가금액, 평가손익)
  - 주문 패널(매수/매도, 수량, 예상 체결금액, 예상 수수료)
  - 내 포지션 패널(보유 수량, 평균매수가, 현재가, 수익률)
  - 최근 투자내역 패널(최근 주문 5~10개)
  - 정합성 상태 패널(가격 기준, 마지막 동기화 시각, 지연 경고)
- 신규 페이지 추가
  - `마이페이지`: 로그인/프로필/계좌/내 투자내역 전체/초기화
- 기존 `시장동향` 페이지 역할
  - 독립 분석 페이지 유지
  - `exchange`에는 요약 카드만 연결

### 4.6 3개 메뉴별 책임
- `exchange`
  - 실제 게임 플레이 화면
  - 주문 실행, 보유 포지션 확인, 현재가/차트/호가/체결 동기화 확인
- `시장동향`
  - 시장 감성, 글로벌 지표, 김치프리미엄, 추세성 데이터 확인
  - 직접 주문 기능 없음
- `마이페이지`
  - 로그인 상태, 사용자 프로필, 계좌 상태, 전체 투자내역, 초기화/로그아웃
  - 사용자의 개인 데이터가 모이는 영역

### 4.7 화면 라우팅 정합성
- 메뉴 라우팅은 문서 상위 3개 메뉴로 단일화
  - `exchange` → `/exchange`
  - `insights`(시장동향) → `/insights`
  - `mypage` → `/mypage`
- 실험용/보조 화면은 3개 메뉴 아래의 하위탭 또는 인라인 영역으로만 노출

---

## 5) MVP 권장 DB 스키마(초안)

### 5.1 `profiles`
- `id` (uuid, `auth.users.id`와 1:1)
- `display_name`
- `starting_cash`
- `created_at`, `updated_at`

### 5.2 `sim_accounts`
- `id`
- `user_id` (fk: profiles.id)
- `cash_balance` (numeric)
- `mode` (`paper`)
- `created_at`, `updated_at`

### 5.3 `sim_positions`
- `id`
- `account_id`
- `symbol`
- `quantity` (numeric)
- `avg_price`
- `updated_at`

### 5.4 `sim_orders`
- `id`
- `account_id`
- `symbol`
- `side` (`buy` / `sell`)
- `quantity`
- `price`
- `fee`
- `executed_at`
- `status` (`filled`)

### 5.5 `sim_market_snapshots`
- `symbol`
- `price`
- `captured_at`

> 단일 사용자용이라도 주문/계좌/포지션 분리를 두면 멀티유저 확장이 쉬워집니다.

---

## 6) 서버 API 제안
- `GET /api/simulator/state` : 계좌+포지션+보유자산 조회
- `GET /api/simulator/market/quote?symbols=BTC,ETH` : 가격 조회(캐시 우선)
- `POST /api/simulator/order`
  - body: `{ symbol, side, quantity }`
  - 서버에서 현재가 조회 후 체결
- `POST /api/simulator/reset` : 시뮬레이션 초기화
- `GET /api/simulator/history` : 거래 내역
- `GET /api/simulator/performance` : 총손익, MDD, 수익률 등
- `GET /api/simulator/session` : 로그인 세션 상태 확인(토큰 만료/권한 체크 포함)
- `POST /api/simulator/positions/close` : 선택 포지션 정리(추가 과제)

### v1 운영 전제(확정)
- API 네임스페이스: `/api/simulator/*`로 분리
- 인증: v1부터 필수
- 인증 상태 정책
  - 브라우저: Supabase 세션 토큰으로 `api` 호출
  - 토큰 미존재/만료: `401` 반환 후 로그인 유도
  - 단일 사용자 기반이더라도 `auth.users.id` 기준으로 소유권 필수 검증
  - 서버는 모든 `simulator` 요청에서 `Authorization` 및 사용자 id 매핑을 검증
- 보안 우선순위
  - `service_role`은 서버 내부에서만 사용
  - 사용자 요청은 `supabase-js` anon 세션 기반 토큰으로 인증 후 서버에서 RLS + 서버사이드 정책 이중 체크

### 로그/감사 정책(v1)
- 주문·정산·잔고 변경은 `audit_events` 또는 내부 이벤트 로그로 필수 기록
- 실패한 주문 시도도 에러 코드/원인(reason) 저장
- 시간 기준: UTC(`timestamptz`)로 통일

---

## 7) 보안·운영 정책 (무료 플랜 고려)
- RLS 기본 ON + 정책을 사용자 단위로 제한
- `service role`은 서버에서만 사용
- 가격 데이터 캐시는 Redis/메모리 TTL(예: 10~30초)로 과다 호출 억제
- 429/재시도/백오프 정책 필수
- 민감 연산(거래 정산)은 서버에서만 수행

---

## 8) 단계별 구현 로드맵

### Phase 0 (0~1일): 기초 연동
- Supabase 프로젝트 생성
- OAuth Provider 연결
- 프로젝트 환경변수 정리

### Phase 1 (2~4일): 핵심 시뮬레이터
- 계좌 생성/조회
- 주문/체결 API
- 잔고/포지션 계산
- 거래 내역 저장

### Phase 2 (2~3일): UX 완성
- 마켓 가격 패널 + 주문 폼
- 포트폴리오 카드(총자산/보유수익/일별변화)
- 체결 로그 표
- exchange 패널 구조 확장
  - 현재가/현재매수가/손익, 주문, 체결, 호가, 성과, 투자내역을 한 화면에서 점진 통합

### Phase 3 (1~2일): 게임 요소 추가
- 난이도/시나리오 모드
- 미션(목표 수익, 리스크 제한)
- 리더보드 또는 성과 칭호(선택)

## 9) v1 구현 완성도 보강(실행 문서)

### 9.1 범위 통제(Out of Scope)
- In scope
  - 로그인 기반 단일 사용자 모의계좌 생성/조회
  - 주문 체결 및 잔고/포지션 정산
  - 주문 이력/성과 조회
  - 가격 조회 캐시/동기화 정책
  - 감사 로그
- Out of scope(이번 v1)
  - 실제 거래 연동(실전 주문 전송)
  - 멀티유저 간 실시간 주문 대기열 경쟁
  - 레버리지/옵션/선물
  - 자동매매/복잡 주문(지정가, IOC, GTC)

### 9.2 API 계약(필수)

모든 API는 `Authorization: Bearer <access_token>`를 요구하고, 미확인 토큰은 `401`을 반환한다.

#### `GET /api/simulator/session`
- 목적: 로그인/세션 상태 확인
- 성공: `{ authenticated: true, userId, sessionExpiresAt }`
- 실패: `{ authenticated: false }` + `401`

#### `GET /api/simulator/state`
- Query: 없음
- 성공: `{ account, positions, markPriceBasis }`
  - `account`: `{ cash_balance, total_value, updated_at }`
  - `positions`: `[ { symbol, quantity, avg_price, unrealized_pnl, realized_pnl, updated_at } ]`
- 실패: `401`, `403`, `500`

#### `GET /api/simulator/market/quote?symbols=BTC,ETH`
- Query: `symbols` 필수(쉼표 구분)
- 성공: `{ symbol, price, asOf, source }[]`
- 캐시: 동일 market 요청은 5~10초 내 중복 upstream 호출 축소
- 실패: `400`(symbols 빈값), `502`(가격 소스 오류)

#### `POST /api/simulator/order`
- Body: `{ symbol: string, side: "buy"|"sell", quantity: number }`
- 성공: `{ orderId, executedPrice, quantity, fee, executedAt, nextState }`
- 실패: `400`(검증), `409`(잔고/포지션 불일치), `429`(과도 호출), `500`

#### `GET /api/simulator/history`
- Query:
  - `limit`(기본 50, 최대 200)
  - `cursor`(선택)
- 성공: `{ items: OrderItem[], nextCursor?: string }`

#### `GET /api/simulator/performance`
- Query:
  - `from`, `to`(ISO date, 선택)
- 성공: `{ realizedPnl, unrealizedPnl, totalReturnRate, mdd, dailyEquityCurve }`

#### `POST /api/simulator/reset`
- Body: `{ keepHistory?: boolean }`
- 성공: `{ resetAt }`
- 실패: `500`(원장 롤백 실패), `401`

#### `POST /api/simulator/positions/close`
- Body: `{ symbol: string }`
- 성공: `{ closedQuantity, realizedPnl, executedAt }`
- 실패: `404`(미보유), `400`(잘못된 symbol), `401`

### 9.3 동기화·정합성 가드(회귀 기준)
- `orderbook`/`trade` 기반 현재가 갱신과 `quote` 기반 가격 스냅샷 타임스탬프를 동일한 `mark` 소스로 노출
- 체결 성공 후 `cash`, `positions`, `orders`는 트랜잭션 단위로 일관 갱신
- 표기 지표(`currentPrice`, `orderbook-mid`)는 `symbol+timestamp+source`로 추적 가능해야 함
- 정합성 실패(중간가 미일치, 잔고 음수, 미체결 표기) 발생 시 회귀 Step 즉시 `BLOCKED`

### 9.4 에러 코드 표준
- `SIM_AUTH_REQUIRED` → `401`
- `SIM_AUTH_FORBIDDEN` → `403`
- `SIM_VALIDATION_ERROR` → `400`
- `SIM_INSUFFICIENT_BALANCE` → `409`
- `SIM_OUT_OF_SYNC` → `409` 또는 `409` 대체(`message` 필수)
- `SIM_UPSTREAM_RATE_LIMIT` → `429`
- `SIM_UPSTREAM_FAILURE` → `502`

### 9.5 품질 게이트(문서-코드 정합성)
- PASS 조건은 아래 전부 충족해야 함
  - 인증 정책: 모든 `/api/simulator/*`에서 사용자 소유권 검증
  - API 계약: 요청/응답 필드명이 문서와 동일
  - DB 스키마: 저장 스키마와 문서 엔티티 대응
  - 회귀 항목: 로그인 필수, 주문 체결, 중간가 동기화, 성과 계산 통과
- BLOCKED 조건
  - 핵심 필드 누락(`quantity`, `price`, `executedAt`, `userId`) 
  - 가격 동기화 오차가 회귀문서에서 허용치(예: 1초 이내 마지막 업데이트) 초과
  - 세션 없이 핵심 API 접근 가능

## 10) 작업 Task 분리 (v1 우선)

### Task 1. 인증/세션 정합성 기반 구축 (v1 필수)
- 범위: `/api/simulator/*`에서 세션 미인증 요청 거부, 사용자 소유권 1차 검증
- 근거: V1 요구사항에서 로그인 필수 및 보안 정책 선결 조건
- 산출물
  - `server`: 인증 미들웨어/유틸 추가
  - `server`: 세션 검증 실패 응답 포맷(`401/403`) 통일
  - `web`: 인터셉터/플러그인으로 401 처리 및 로그인 유도
- 모순 검증
  - 단일 사용자라 하더라도 `auth.users.id` 기반 검증을 의무화(추가 확장 대비)
- 가독성/가드레일
  - `server/src/routes/simulator` 하위로 분리
- PASS 조건
  - 로그인 토큰 없을 때 `401` 응답
  - 타 사용자 데이터 접근 시도 시 `403` 또는 `404` 응답

### Task 2. simulator API 스키마 설계/구현
- 범위: 상태·주문·히스토리·성과 엔드포인트 구현
- 근거: API 제안이 현재 코드와 분리되어 있어 실제 동작 계층이 없기 때문
- 산출물
  - `GET /api/simulator/state`
  - `POST /api/simulator/order`
  - `POST /api/simulator/reset`
  - `GET /api/simulator/history`
  - `GET /api/simulator/performance`
  - `GET /api/simulator/market/quote`
- 모순 검증
  - 기존 `/market/*` 라우트와 경로 충돌 없음 (`/api/simulator/*` 단독)
- 가독성/가드레일
- PASS 조건
  - 요청/응답 스키마가 문서와 매칭

### Task 3. Drizzle 스키마/저장 구조 반영
- 범위: `profiles`, `sim_accounts`, `sim_positions`, `sim_orders`, `sim_market_snapshots` 및 감사 로그 최소 구현
- 근거: 실시간 체결/정산·이력/성과의 영속성 요구 충족
- 산출물
  - `server/src/db/schema.ts` 작성
  - DB 마이그레이션 또는 초기 DDL
  - 거래 정산 트랜잭션 경계(잔고/포지션 업데이트) 정의
- 모순 검증
  - 기존 외부 시장 데이터 파이프라인과 충돌 없이 독립 테이블 운영
- 가독성/가드레일
  - `numeric`/`timestamptz` 사용 규칙 표준화
- PASS 조건
  - 주문 후 잔고, 포지션, 주문 이력이 원자적으로 반영되는 테스트 시나리오

### Task 4. 웹 연동 화면/상태 바인딩
- 범위: `web`에 모의투자 전용 화면(또는 기존 거래 화면 분기) 연결
- 근거: API가 준비돼도 세션 기반 UX가 없으면 기능 미완
- 산출물
  - 로그인 상태 기반 주문/포트폴리오 노출 제어
  - 주문 실패/성공 피드백, 성과 표기
- 모순 검증
  - 기존 실거래/참조 화면 혼선을 피하기 위한 라우트/메뉴 분기
- 가독성/가드레일
  - “시뮬레이션” 라벨 명확화
- PASS 조건
  - 세션 로그인 후 바로 주문 체결 및 상태 업데이트 확인

### Task 5. 회귀 실행(기능 최소 검증)
- 범위: 문서 제약 기반 Smoke 테스트
- 근거: 구현 품질과 가시적 동작 보증
- 산출물
  - 로그인 필수 동작, 주문 체결 플로우, 잔고 갱신, 성과 조회 검증 케이스
- 모순 검증
  - 실시간 가격 소스 지연과 정합성(중간가/현재가 일치) 체크포인트 명문화
- 가독성/가드레일
  - 실패 항목은 즉시 블록하고 해당 Step에서 수정 후 재실행
- PASS 조건
  - 항목 1~4 통과, 회귀 항목 미해결 시 Blocked 상태

## 11) v1 실행 단위 분해(에이전트 실행 안정성 중심)

- 목표: 각 구현 단위를 2~3일 이내에 닫을 수 있는 크기로 압축한다.
- 공통 원칙
  - 한 작업은 반드시 1) 스키마/루트 2) 서비스 로직 3) UI/테스트 3개 중 최소 1개 이상 반영
  - 동시 작업 시 공유 상태(테이블·인증 미들웨어)는 선점 충돌이 없도록 선행 조건을 명확히 둔다.
  - 미완료 항목은 PASS/BLOCKED 게이트에서 즉시 차단한다.

### 백로그 (세분화)

#### EPIC A: 사용자/인증
- A-01. Supabase Auth 클라이언트 초기화 및 OAuth 로그인 페이지/버튼
- A-02. 세션 영속성(새로고침, 탭 전환) 처리
- A-03. `/api/simulator/session` 엔드포인트 인증 바인딩
- A-04. 미인증 라우팅 가드(라우트/버튼 비활성)

#### EPIC B: 계좌/프로필/마이페이지
- B-01. 초기 계좌(seed=100,000,000 KRW) 자동 생성
- B-02. 마이페이지 레이아웃 설계(닉네임/잔고/세션 상태)
- B-03. 계좌 초기화/다시시작 액션(Reset 시나리오)
- B-04. 기본 보안 설정 노출(로그아웃, 토큰 상태)

#### EPIC C: 가격/마켓 동기화
- C-01. `/api/simulator/market/quote`의 내부 응답 표준화
- C-02. 주문화면 가격 표시용 현재가 스냅샷 캐시 구조
- C-03. orderbook/trade/quote 타임스탬프 조인 로직
- C-04. 중간가 기준 표시 기준값 정책(표시/갱신 우선순위)

#### EPIC D: 주문/포지션/원장
- D-01. 주문 요청 바인딩 zod 스키마
- D-02. 주문 체결 계산기(`applyOrder`) 분리
- D-03. 수수료/슬리피지 적용 정책
- D-04. 현재매수가(평단) 계산기 및 정합성 테스트
- D-05. 부분매도/잔여 수량 정책(현재 MVP에선 전량매도 가능 범위 제한)
- D-06. 포지션 close API 구현(`positions/close`)

#### EPIC E: 상태/성과 API
- E-01. `/api/simulator/state` 잔고·보유자산 조합 쿼리
- E-02. `/api/simulator/performance` 수익률/MDD 초기 계산
- E-03. `/api/simulator/history` 페이징 및 필터
- E-04. 성능 지표 계산 실패 시 fallback 및 예외코드 정리

#### EPIC F: 주문/투자 내역 UX
- F-01. 주문 화면(매수/매도/수량 입력) 기본 유효성 메시지
- F-02. 주문 성공/실패 토스트/알림
- F-03. 투자내역(History) 테이블 정렬/페이지네이션
- F-04. 주문 상세 모달 또는 행 확장(수수료/실행가/시간 노출)

#### EPIC I: exchange 게임 패널 확장
- I-01. `exchange` 상단 계좌 요약 패널
  - 현금, 총 평가금액, 평가손익, 수익률
  - 세션 미인증 시 로그인 CTA
- I-02. 주문 입력 패널
  - 매수/매도 탭
  - 수량 입력, 예상 체결금액, 예상 수수료, 주문 가능 금액
  - 주문 전 검증 메시지
- I-03. 내 포지션 패널
  - 심볼, 보유수량, 평균매수가, 현재가, 평가손익, 수익률
  - 매도/정리 액션 연결
- I-04. 최근 투자내역 미니 패널
  - 최근 주문 5~10개
  - 체결가, 수량, 수수료, 시간
- I-05. 가격 정합성 패널
  - 차트 현재가, 호가 중간가, 체결가, quote 가격 비교
  - 기준 가격과 마지막 업데이트 시각 표시
  - 동기화 지연 시 경고 배지
- I-06. 시장동향 요약 패널
  - 시장 심리, 글로벌 마켓, 김치프리미엄 주요 값만 요약
  - 상세는 `시장동향` 메뉴로 이동

#### EPIC J: 마이페이지
- J-01. 로그인 상태 카드
  - 프로필, 이메일/프로바이더, 세션 상태, 로그아웃
- J-02. 계좌 카드
  - 시작 자금, 현재 현금, 총 평가금액, 누적 손익
- J-03. 전체 투자내역
  - 전체 주문/체결 이력
  - 필터: 심볼, 매수/매도, 기간
- J-04. 계좌 초기화
  - 확인 모달
  - `keepHistory` 정책 선택
  - 초기화 후 상태 재조회

#### EPIC K: 시장동향 연결
- K-01. 기존 시장동향 페이지 유지 및 메뉴명 고정
- K-02. `exchange` 요약 패널에 필요한 최소 지표 export
- K-03. 시장동향 데이터 실패 시 `exchange` 주문 기능에 영향 없도록 fallback 처리
- K-04. 트렌드/감성 지표가 투자 게임 의사결정 보조 정보임을 UI에서 구분

#### EPIC G: QA/회귀
- G-01. 인증 필수 시나리오 E2E(로그인/만료/재로그인)
- G-02. 잔고 음수/수량 0/부정값/심볼 미지원 에러 검증
- G-03. 정합성 회귀(주문 직후 잔고/포지션/이력 동시 업데이트)
- G-04. 성능 회귀(주요 화면 렌더링/차트/호가 동기화 체크)

#### EPIC H: 품질/운영
- H-01. 감사 로그 표준(성공/실패 주문, 세션 실패)
- H-02. API 에러코드(SIM_*) 일관 적용 및 문서 동기화
- H-03. 배포 전 ENV/비밀키 점검 체크리스트

### 우선순위 실행 순서(권장)
1) A-01 ~ A-04 → B-01 ~ B-04  
2) C-01 ~ C-03 → C-04  
3) D-01 ~ D-06 + E-01 ~ E-03  
4) I-01 ~ I-05  
5) F-01 ~ F-04 + J-01 ~ J-04  
6) K-01 ~ K-04  
7) G-01 ~ G-04  
8) H-01 ~ H-03

### v1 완성도 기준(수치형)
- 핵심 화면: `exchange`, `시장동향`, `마이페이지` 3개 탭의 실제 동작
- 핵심 연산: 주문후 잔고 갱신 시간 ≤ 500ms(초당 1회 기준 UI 반영)
- 핵심 정합성: 평단, 체결가, 수익률 오류율 0%
- 핵심 안정성: 블로킹 상태 없이 회귀 100% 통과

---

## 12) MVP 완료 기준
- OAuth 로그인 후 바로 모의투자 시작 가능
- 가상 자금 기준으로 실제 주문 흐름이 동작
- 최소 1개 이상의 자산(BTC/ETH) 거래 가능
- 잔고와 수익률이 정확히 업데이트
- 매수/매도 기록이 DB에 누적 저장

---

## 13) 다음 단계 (확장 아이디어)
- 시간 가속 버튼
  - v1/v2 구현 제외
  - 과거 시세 리플레이 엔진, 캔들 재생기, 주문 시점 고정 원장이 준비되기 전까지 구현 불가로 간주
- 실전 룰 추가
  - 레버리지, 청산선, 공매도 제한, 수수료 티어
- 등급 제도
  - 수익률, 리스크 관리, 거래 빈도, 손실 회피 지표 기반 등급
- 알림 정책
  - 목표 가격, 손절 임계치, 계좌 위험도, 미실현손익 급변
- 게임 룰 고도화
  - 미션, 난이도, 시즌, 챌린지
- 레벨링 시스템
  - 경험치, 업적, 칭호, 단계별 기능 해금
