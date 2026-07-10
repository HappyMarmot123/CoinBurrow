# Crypto Simulator Remaining Work (v2)

작성일: 2026-07-10

## 목적

아이디어 제안부터 회귀 실행까지 한 번에 실행 가능한 가이드를 제공하고, Subagent-Driven 실행에서 각 단계가 PASS/BLOCKED 기준으로 정확히 멈출지/넘어갈지를 통제한다.

## 단계 공통 게이트

- 범위: 산출물과 대상이 한 문장 안에 정해져 있어야 한다.
- 근거: 설계/커밋/파일 경로 기반으로 증빙이 가능해야 한다.
- 모순: 요구사항 간 충돌이 없어야 한다.
- 가독성: 단계별 액션이 짧고 추적 가능한 형태여야 한다.
- PASS/BLOCKED: 실행 계속 가능 여부가 즉시 판정되어야 한다.

## 1단계 아이디어 제안

- 범위: 단일 사용자 모의 투자 게임을 기존 Vue 대시보드 기반에서 구현하고 메뉴를 `exchange`, `시장동향`, `마이페이지` 3개로 유지한다.
- 근거: [2026-07-09 design](/C:/Users/SR83/test/EDMM/feature/crypto-simulator/docs/superpowers/specs/2026-07-09-crypto-simulator-design.md)와 [2026-07-09 foundation plan](/C:/Users/SR83/test/EDMM/feature/crypto-simulator/docs/superpowers/plans/2026-07-09-crypto-simulator-foundation.md)에 이미 범위가 정합됨.
- 모순: 현재는 `시장동향`을 주문이 없는 분석 페이지로 두는 설계와, `exchange`에서 가격 요약값을 가져오는 동기화 요구가 충돌하지 않는지 확인이 필요함.
- 가독성: 메뉴명과 `/api/simulator/*` 경로만으로 팀/에이전트가 컨텍스트 전환 없이 이해 가능.
- PASS/BLOCKED: PASS. 범위 합의 완료.

## 2단계 스크리닝

- 범위: 구현 순서를 `인증`, `DB 반영`, `API 핵심`, `화면 연동`, `성능 안정화`로 고정한다.
- 근거: 남은 작업은 설계와 운영 관점에서 이 순서를 만족하면 장애 전파가 낮다.
- 모순: 현재 `market/*`는 공개 조회용, `simulator/*`는 사용자 데이터 변경 전용이라는 경계가 애매하게 섞였던 부분이 있어 Task 분해 시 명확히 분리해야 함.
- 가독성: 단계별 우선순위를 1~7로 고정해 회귀 지점과 연결.
- PASS/BLOCKED: PASS. 실행 순서 충돌 없음.

## 3단계 기획설계

- 범위: API 목록, 에러 코드, 인증 정책, 가격 동기성 기준을 코드화 가능한 형태로 고정한다.
- 근거: 설계 문서의 API 경계, Trading Rules, Price Synchronization 섹션을 그대로 이행 기준으로 사용.
- 모순: `실시간 동기화`와 `경고 허용치(1~5초)` 정의가 서로 맞아야 하므로 실제 구현에서 기준 충돌이 없도록 공통 상수로 정리 필요.
- 가독성: `매수/매도`, `positions`, `history`, `performance`가 동일 언어로 재사용 가능.
- PASS/BLOCKED: PASS. 다만 가격 경계값은 1초·5초 상수로 명문화 필요.

## 4단계 코드베이스 기반 문서구체화

- 범위: 구현 상태를 `완료`, `미완`, `부분완료`로 문서화하고 다음 Task가 바로 참조 가능해야 한다.
- 근거: 현재 foundation 커밋으로 auth, session, mypage shell, drizzle config가 존재하고, 미비 항목이 명확함.
- 모순: 환경변수 노출 범위가 `VITE_*`(브라우저)와 서버 시크릿(서버)로 나뉘지 않으면 보안 모순이 발생함.
- 가독성: 각 항목은 현재 상태, 근거, BLOCKED 이유를 한 줄로 기록.
- PASS/BLOCKED: BLOCKED. `npm run db:migrate`, RLS, Auth UI가 미완되어 simulator 운영 데이터 신뢰도 보장 불가.

### 현재 미비 항목

- DB 실제 반영: migration 생성은 완료되었고 `npm run db:migrate`는 미실행.
- RLS 정책: `profiles`, `sim_accounts`, `sim_audit_events` 정책 SQL 미작성.
- Auth UI: 로그인/회원가입/OAuth 버튼, callback 처리, 라우트 가드 UX 미완.
- Simulator API: `/api/simulator/session`만 동작, 주문/보유자산/이력/수익 API 미작성.
- 마이페이지: shell만 존재, 실제 데이터 바인딩 미완.
- Exchange 게임화: 주문 패널, 평균매수가, 정산, 체결 반영 미작성.
- Vite chunk warning: 전략 문서화만 있고 코드 적용 미완.
- 보안 연동 문서: `.env` 사용 정책이 문서와 실제 키 사용이 다를 수 있어 정리 필요.

## 5단계 문서검토

- 범위: design, foundation plan, remaining-work의 용어·라우트·오류코드·인증 정책이 정합되는지 점검.
- 근거: `/api/simulator/*`, `SIM_*` 코드, 3개 메뉴, v1 인증 필수 정책은 설계와 일치.
- 모순: 설계와 현재 테스트 스펙에 시간 가속 버튼 관련 규칙이 혼재된 흔적이 있어 명칭 정리 필요.
- 가독성: 문서 단락마다 “PASS 조건 / BLOCKED 조건”을 항상 붙임.
- PASS/BLOCKED: PASS. 다만 핵심용어 정합성 검토만 추가 조치하면 통과.

## 6단계 작업 Task 분리

- 범위: 각 Task는 독립 실행(Subagent) 가능한 최소 단위로 분해한다.
- 근거: 현재 남은 작업은 서로 강하게 결합되어 있으나 독립 실행이 가능한 경계가 존재.
- 모순: exchange 패널과 마이페이지에서 동일 세션/계좌 조회 모델을 공유하므로 공용 API 인터페이스를 먼저 고정해야 함.
- 가독성: task당 완료조건/차단조건 1개씩 표준화.
- PASS/BLOCKED: PASS. 분해 완료.

#### Task 1: DB migrate + RLS
- PASS 조건: `npm run db:migrate` 통과 후 policies.sql 적용.
- BLOCKED 조건: Supabase 콘솔 권한/URL·키 불일치.

#### Task 2: Auth UI + 보호 라우트
- PASS 조건: 소셜/이메일 로그인, 콜백, 미인증 가드 동작.
- BLOCKED 조건: OAuth callback URL 승인 미확정.

#### Task 3: Simulator API 핵심
- PASS 조건: `/order`, `/state`, `/history`, `/performance`가 인증 + 트랜잭션 정합성 보장.
- BLOCKED 조건: quote 소스 지연으로 주문 계산 실패 빈도 상승.

#### Task 4: Exchange 게임 패널
- PASS 조건: 현재가/평균매수가/손익/체결 동기성 일치.
- BLOCKED 조건: 실시간 가격 타임스탬프 불일치.

#### Task 5: 마이페이지 데이터 연동
- PASS 조건: 계좌/포지션/주문 내역이 API 결과와 일치.
- BLOCKED 조건: 데이터 노출 정책(마스킹/이력 유지 범위) 미정.

#### Task 6: Chunk warning 저감
- PASS 조건: build 경고가 경감되거나 이유가 로그로 추적되어 해결 계획 완료.
- BLOCKED 조건: 성능 회귀 측정 체계 미비.

## 7단계 구현진행

- 범위: Task 1부터 순차 실행 후 각 Task 종료 시 문서 상태를 PASS로 갱신.
- 근거: foundation 단계 커밋과 연동 가능.
- 모순: 화면 개선과 API 개선을 병행하면 재현 테스트가 어긋날 수 있으므로 1개 Task 끝내고 다음 이동.
- 가독성: 각 Task마다 “완료 알림 + 회귀 실행” 패턴 고정.
- PASS/BLOCKED: BLOCKED. 현재는 Task 1/2가 선행되어야 다음 Task 안전 실행.

## 8단계 회귀 실행

- 범위: task별 smoke, 통합, 빌드 회귀를 정의된 순서로 실행한다.
- 근거: 서버/웹 단위 regression + build가 이전 foundation 완성 기준으로 이미 확보됨.
- 모순: 부분구현 상태에서 전체 회귀를 강제로 묶으면 잡음이 커짐. 작업 단위 회귀 우선.
- 가독성: 실패 항목은 다음 Task의 BLOCKED로 기록.
- PASS/BLOCKED: BLOCKED. DB 반영/보안 정책 미적용 전에는 최종 통합 PASS 보류.

## Vite chunk size warning 실행 전략

- 1단계 번들 분석으로 실제 무거운 청크를 식별한다.
- 2단계 exchange/insights/mypage route를 lazy load 한다.
- 3단계 무거운 차트/물리/3D 라이브러리를 필요 시 로드로 바꾼다.
- 4단계 manualChunks를 보조로 적용해 캐시 적중률을 보완한다.
- 5단계 경고 임계치 상향은 마지막 수단으로 둔다.

## 바로 실행 가능한 우선순위

1. DB migrate 실행 및 결과 캡처
2. RLS 정책 SQL 작성 및 적용
3. Auth UI + callback + route guard 완료
4. API 확장: 주문, 보유자산, history, performance
5. Exchange 게임 패널 연동
6. 마이페이지 투자내역/성능 연동
7. chunk warning 개선

## 실행 멈춤 규칙

- 어떤 단계라도 BLOCKED 발생 시 즉시 사용자 질문 후 재개.
- 근거가 약하거나 용어 충돌이 생기면 문서에 근거 보강 후 다음 단계로 이동.
- .md 문서는 커밋 제외.
