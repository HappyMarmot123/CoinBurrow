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

---

## 4) MVP 범위 (단일 사용자 전용)

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
- `GET /api/market/quote?symbols=BTC,ETH` : 가격 조회(캐시 우선)
- `POST /api/simulator/order`
  - body: `{ symbol, side, quantity }`
  - 서버에서 현재가 조회 후 체결
- `POST /api/simulator/reset` : 시뮬레이션 초기화
- `GET /api/simulator/history` : 거래 내역
- `GET /api/simulator/performance` : 총손익, MDD, 수익률 등

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

### Phase 3 (1~2일): 게임 요소 추가
- 난이도/시나리오 모드
- 미션(목표 수익, 리스크 제한)
- 리더보드 또는 성과 칭호(선택)

---

## 9) MVP 완료 기준
- OAuth 로그인 후 바로 모의투자 시작 가능
- 가상 자금 기준으로 실제 주문 흐름이 동작
- 최소 1개 이상의 자산(BTC/ETH) 거래 가능
- 잔고와 수익률이 정확히 업데이트
- 매수/매도 기록이 DB에 누적 저장

---

## 10) 다음 단계 (확장 아이디어)
- 시간 가속 버튼(최근 7일/30일 데이터로 과거 회귀 테스트)
- 실전 룰 추가(레버리지, 청산선, 공매도 제한)
- 멀티유저/공동 챌린지(내부 경쟁 모드)
- 알림 정책(목표 가격/손절 임계치)

---

원하면 제가 다음 단계로, 이 문서에 맞춰 바로
- `server` 쪽 주문/정산 API 라우트 뼈대
- `web` 주문 UI + 상태 페이지
- Supabase SQL DDL(테이블 생성문)
- `.env.example` 템플릿
까지 한 번에 생성해드리겠습니다.
