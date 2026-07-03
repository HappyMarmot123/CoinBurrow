# 랜딩·거래소·시장동향 반응형 디자인 개선 설계

- 작성일: 2026-07-03
- 상태: 문서화 및 Task 분리 완료, 구현 전
- 대상 페이지: `/` 랜딩, `/exchange` 거래소, `/insights` 시장동향
- 범위 확인: 구현은 이번 단계에서 진행하지 않는다. 구현진행 단계는 사용자 확인에 따라 의도적으로 중단한다.

## 1. 목적

CoinBurrow의 세 핵심 화면을 같은 제품처럼 느껴지게 유지하면서, 모바일과 태블릿에서 정보가 밀리거나 읽기 어려워지는 구간을 줄인다. 목표는 새 기능 추가가 아니라 현재 Vue 3 화면의 레이아웃, 정보 우선순위, 표와 패널의 접힘 규칙을 정리하는 것이다.

성공 기준:
- 375px, 640px, 960px, 1200px, 데스크톱 폭에서 주요 텍스트, 버튼, 표, 차트, 패널이 겹치지 않는다.
- 랜딩은 3D/Spline, 별, 노이즈 레이어의 시각 정체성을 유지하되 작은 화면에서 카피와 오브젝트가 서로 누르지 않는다.
- 거래소는 선택 마켓, 차트, 코인 리스트, 호가/체결이 화면 폭에 따라 자연스럽게 재배치된다.
- 시장동향은 글로벌 시총, 시장심리, 김치프리미엄을 한 페이지에서 세로로 읽는 구조를 유지하되 표와 차트의 모바일 가독성을 보강한다.
- 기존 색상 토큰, SCSS 믹스인, Vue Composition API 구조를 유지한다.

비목표:
- 백엔드 API, Pinia 데이터 계약, Web Worker 스트림 로직 변경
- `/insights`를 다시 탭/중첩 라우트 구조로 되돌리는 변경
- 랜딩의 새 제품 섹션 대량 추가
- 새 디자인 시스템, 새 색상 팔레트, 새 UI 라이브러리 도입
- 구현 진행

## 2. 가드레일

각 단계는 아래 네 항목을 통과해야 다음 단계로 진행한다.

| 항목 | PASS 기준 | BLOCKED 기준 |
|---|---|---|
| 범위 | 세 페이지 반응형 디자인 개선과 문서/Task 분리에 머문다. | 구현, API 변경, 라우트 재설계, 새 기능 추가가 필요하다. |
| 근거 | 코드 경로, 현재 CSS/컴포넌트 구조, 기존 테스트에 근거한다. | 코드 확인 없이 추정으로 결정한다. |
| 모순 | README의 라우트 설명, 현재 `/insights` 단일 페이지 구조, 기존 토큰과 충돌하지 않는다. | 기존 구조와 반대되는 방향이 섞인다. |
| 가독성 | 한국어 문서로 단계, 결정, Task가 분리되어 실행자가 바로 읽을 수 있다. | 요구사항과 작업이 한 문단에 섞여 추적하기 어렵다. |

## 3. 코드베이스 근거

라우트와 페이지 구조:
- `web/src/router/index.ts`: `/`, `/exchange`, `/insights`가 실제 라우트이고 `/global`, `/sentiment`, `/kimchi`는 `/insights`로 redirect된다.
- `web/src/App.vue`: 루트는 `<router-view />`만 렌더링한다. 페이지별 셸 책임은 각 feature 페이지에 있다.
- `web/src/components/AppNav.vue`: 공통 네비게이션은 640px 이하에서 세로 스택으로 접힌다.

랜딩:
- `web/src/features/landing/LandingPage.vue`: Spline 3D, 별 레이어, 노이즈, 커서 효과가 한 파일에 있고 900px/640px/저높이 미디어쿼리가 이미 존재한다.
- `web/src/features/landing/legacyHeroStars.scss`: 기존 별/슈팅스타 효과가 별도 SCSS로 유지된다.
- `web/test/landing.test.ts`: 랜딩의 카피, Spline, 노이즈, 별 레이어, 반응형 CSS 문자열을 직접 검증한다.

거래소:
- `web/src/features/exchange/ExchangePage.vue`: `panel-stack`과 sticky `panel-sidebar`의 2컬럼 구조이며 960px 이하에서 단일 컬럼으로 접힌다.
- `web/src/features/exchange/ExchangeHero.vue`: 선택 마켓 티커와 보조 지표 chip이 flex/grid로 렌더링된다.
- `web/src/features/exchange/CoinList.vue`: 리스트 행은 640px 이하에서 2컬럼으로 바뀐다.
- `web/src/features/exchange/OrderbookPanel.vue`, `TradeList.vue`: 숫자 밀도가 높은 패널이다. 작은 폭에서 컬럼 압축과 overflow 정책이 중요하다.
- `web/test/exchange-page.test.ts`: 현재는 라우트 링크와 주요 스텁 렌더링만 확인한다.

시장동향:
- `web/src/features/insights/InsightsPage.vue`: `GlobalView`, `SentimentView`, `KimchiView`를 단순 세로 스택으로 합성한다.
- `web/src/features/global/GlobalView.vue`: `auto-fit minmax(160px, 1fr)` 카드 그리드를 쓴다.
- `web/src/features/sentiment/SentimentView.vue`: 760px 이하에서 현재 지수와 히스토리가 1컬럼으로 접힌다.
- `web/src/features/kimchi/KimchiView.vue`: 김치프리미엄 표를 `max-height` 스크롤 컨테이너 안에 둔다.
- `web/src/features/kimchi/KimchiTable.vue`: 모바일 전용 표 접힘 규칙이 없다.
- `web/test/insights-page.test.ts`, `web/test/global-page.test.ts`, `web/test/kimchi-table.test.ts`: 시장동향 구조와 표 렌더링의 회귀 테스트 기반이 있다.

공통 디자인 토큰:
- `web/src/styles/_variables.scss`: 어두운 배경, 패널, 브랜드 라임/앰버/그린, 상승/하락 색상, 반경/그림자 토큰이 정의되어 있다.
- `web/src/styles/_mixins.scss`: `exchange-panel`, `panel-head`, `panel-title`, `field-control`, `select-control`, `thin-scrollbar`가 있다.

## 4. 아이디어 제안

### A. 기존 토큰 기반 반응형 정돈

현재 어두운 대시보드 정체성과 토큰을 유지한다. 페이지별로 레이아웃 접힘 규칙, 정보 우선순위, 표/차트 최소 크기, 모바일 navigation 밀도를 조정한다.

장점:
- 기존 테스트와 컴포넌트 구조를 가장 적게 흔든다.
- 실제 구현 파일이 명확하다.
- 사용자에게 익숙한 CoinBurrow 인상을 유지한다.

단점:
- 시각적으로 완전히 새로워 보이는 리디자인은 아니다.

### B. 페이지별 강한 비주얼 리디자인

랜딩은 더 강한 히어로 연출, 거래소는 더 다른 레이아웃, 시장동향은 매거진형 섹션 구성으로 전환한다.

장점:
- 눈에 띄는 변화가 크다.

단점:
- 새 팔레트/타이포/레이아웃이 기존 데이터 화면과 충돌할 가능성이 높다.
- 테스트 수정 범위와 시각 검증 부담이 커진다.

### C. 모바일 앱형 정보 재배치

모바일을 우선으로 두고 거래소의 코인 리스트, 차트, 호가/체결을 별도 모드처럼 재배치한다.

장점:
- 모바일 사용성은 크게 개선될 수 있다.

단점:
- 현재 단일 페이지 정보 흐름과 다르게 동작한다.
- 기능성 상태 전환이 늘어 새 UI 상태 관리가 필요하다.

## 5. 스크리닝

권장안은 A다. 이번 요청은 "반응형 디자인 개선"과 "Task 분리 단계까지"가 핵심이므로, 기존 구조를 유지한 채 실패 지점을 좁히는 방식이 범위와 근거 가드레일을 가장 잘 통과한다.

| 후보 | 범위 | 근거 | 모순 | 가독성 | 판정 |
|---|---|---|---|---|---|
| A. 기존 토큰 기반 반응형 정돈 | PASS | PASS | PASS | PASS | 채택 |
| B. 페이지별 강한 비주얼 리디자인 | BLOCKED | PASS | BLOCKED | PASS | 제외 |
| C. 모바일 앱형 정보 재배치 | BLOCKED | PASS | BLOCKED | PASS | 제외 |

제외 사유:
- B는 현재 토큰/대시보드 정체성과 충돌하고 새 디자인 시스템 도입 압력이 생긴다.
- C는 단순 반응형 개선을 넘어 새 상태와 상호작용 설계가 필요하다.

## 6. 기획

### 공통

- 기존 어두운 데이터 대시보드 톤을 유지한다.
- `--brand-lime`, `--brand-amber`, `--brand-green`, `--c-up`, `--c-down`을 그대로 쓴다.
- 카드 반경은 기존 `--radius`와 `--radius-sm`를 따른다.
- 페이지 최대 폭은 현재 패턴을 유지하되 폭별 내부 padding을 재정리한다.
- 숫자 정보는 `font-variant-numeric: tabular-nums`를 유지하거나 확대 적용한다.
- `prefers-reduced-motion`과 `pointer: coarse` 조건은 랜딩 커서 효과처럼 계속 존중한다.

### 랜딩

역할:
- CoinBurrow의 첫 인상과 거래소 진입 동선을 제공한다.

개선 방향:
- 3D 오브젝트, H1, 서브카피, CTA의 수직 충돌 가능성을 줄인다.
- 900px 이하, 640px 이하, 낮은 높이 화면에서 히어로 위치 규칙을 더 안정화한다.
- `features-band`가 첫 화면 아래에 너무 떨어지거나 튀지 않게 "다음 섹션 힌트"를 유지한다.
- 사용하지 않는 데이터 배열은 구현 시 제거 후보로 둔다. 단, 새 콘텐츠 섹션 추가는 이번 범위가 아니다.

### 거래소

역할:
- 선택 코인의 현재 상태, 캔들, 코인 탐색, 호가/체결, 파생/시장 움직임을 빠르게 비교한다.

개선 방향:
- 데스크톱은 메인 차트 중심의 2컬럼 레이아웃을 유지한다.
- 960px 이하에서는 코인 선택 기능이 너무 아래로 밀리지 않도록 sidebar의 모바일 위치와 높이를 재조정한다.
- 호가와 체결은 충분한 폭에서는 2컬럼으로 나란히 두고, 작은 폭에서는 1컬럼으로 접는다.
- 타임프레임 버튼과 캔들 개수 select는 좁은 화면에서 줄바꿈과 터치 타깃이 안정적이어야 한다.
- `CoinList`, `TradeList`, `OrderbookPanel`은 긴 숫자와 긴 이름이 셀을 밀어내지 않도록 최소 폭, ellipsis, overflow 정책을 명확히 한다.

### 시장동향

역할:
- 글로벌 시총, 시장심리, 김치프리미엄을 한 페이지에서 순서대로 읽게 한다.

개선 방향:
- 현재 단일 페이지 스택 구조를 유지한다.
- 페이지 헤더에는 세 섹션의 읽기 순서를 명확히 하되 새 탭 라우팅은 추가하지 않는다.
- `GlobalView`는 핵심 지표 카드가 너무 작게 쪼개지지 않도록 카드 최소 폭과 간격을 정리한다.
- `SentimentView`는 게이지와 히스토리 카드가 모바일에서 자연스럽게 이어지게 한다.
- `KimchiTable`은 모바일에서 단순 5컬럼 표가 압축되지 않도록 horizontal scroll 또는 카드형 행 중 하나로 명확히 결정한다. 이번 설계에서는 기존 표 구조 보존을 위해 horizontal scroll을 우선한다.

## 7. 설계

### 공통 레이아웃 규칙

권장 breakpoint:
- `1200px`: 데스크톱 밀도 조정
- `960px`: 거래소 2컬럼에서 단일 컬럼 전환
- `760px`: 시장심리 2카드에서 1컬럼 전환 유지
- `640px`: 네비게이션, 버튼, 리스트 행의 모바일 규칙
- `520px`: 호가/표처럼 밀도 높은 데이터 패널의 추가 축소 규칙

공통 컨테이너:
- 랜딩은 full-bleed hero를 유지한다.
- 거래소는 `1500px` 최대 폭을 유지한다.
- 시장동향은 `1100px` 최대 폭을 유지하되 모바일 padding을 더 명시한다.

텍스트:
- 뷰포트 폭으로만 font-size를 급격히 키우지 않는다.
- 긴 시장명, 코인명, 숫자 셀은 `min-width: 0`, `overflow: hidden`, `text-overflow: ellipsis`를 기준으로 둔다.
- 버튼 텍스트는 한 줄 유지가 어려우면 컨테이너 폭을 조정하고, 임의의 viewport 기반 font scaling은 피한다.

### 랜딩 설계

구조 유지:
- `LandingPage.vue` 단일 페이지 유지
- `SplineScene.vue` 유지
- `legacyHeroStars.scss` 유지

변경 후보:
- 히어로 내부에 `--hero-copy-top`, `--hero-visual-top`, `--hero-visual-height` 같은 로컬 CSS 변수로 breakpoint별 값을 관리한다.
- 640px 이하에서는 `hero-copy`의 `top`과 `row-gap`을 낮은 높이 화면 기준으로 보정한다.
- 900px 이하 낮은 높이 조건은 유지하되 H1, Spline, CTA가 한 화면에서 겹치지 않는 값을 재검토한다.
- `features-band`는 첫 viewport 아래에서 접근 가능하도록 padding을 유지하되 wave와 CTA가 모바일에서 과도한 여백을 만들지 않게 한다.

검증 포인트:
- `CoinBurrow`, `Realtime Market Dashboard`, CTA가 375px 폭에서 줄바꿈되어도 겹치지 않는다.
- Spline 로딩 실패/스텁 환경에서도 레이아웃이 무너지지 않는다.
- `pointer: coarse`, `prefers-reduced-motion`에서는 커서 효과가 표시되지 않는다.

### 거래소 설계

구조 유지:
- `ExchangePage.vue`가 페이지 orchestration을 담당한다.
- 데이터 로딩 composable과 store 계약은 변경하지 않는다.
- `ExchangeHero`, `DailyStatsPanel`, `CoinList`, `CandleChartV2`, `OrderbookPanel`, `TradeList`, `MarketMovementPanel`, `DerivativesPanel`, `CoinMetaDrawer`를 유지한다.

변경 후보:
- `.exchange-layout`의 desktop sidebar 폭을 `clamp()`로 정리해 1200px 근처에서 메인 차트 폭이 과도하게 줄지 않게 한다.
- 960px 이하에서는 `.panel-sidebar`를 단일 컬럼 안에서 상단 또는 차트 직후로 재배치할지 구현 전에 확정한다. 기본안은 상단 배치다. 이유는 모바일에서 코인을 바꾸려면 리스트 접근성이 먼저 필요하기 때문이다.
- `.split-grid`는 desktop에서 호가/체결 2컬럼, 960px 이하에서 1컬럼으로 접는다.
- `.chart-panel-head__main`과 `.chart-controls`는 좁은 화면에서 `white-space: nowrap` 때문에 넘치지 않도록 label과 controls의 줄바꿈 기준을 분리한다.
- `CoinList.vue`는 모바일에서 행이 가격/등락률 중심으로 보이되 코인명과 현재가가 서로 덮지 않도록 grid row를 정리한다.
- `OrderbookPanel.vue`와 `TradeList.vue`는 520px 이하에서 컬럼 최소 폭과 숫자 ellipsis 정책을 더 명확히 한다.

검증 포인트:
- 375px 폭에서 코인 리스트 행의 이름, 가격, 등락률이 겹치지 않는다.
- 캔들 차트 controls가 차트 위에서 overflow 없이 작동한다.
- 호가와 체결은 desktop에서 비교 가능하고, mobile에서 세로로 읽힌다.
- sticky sidebar는 desktop에서만 sticky로 동작한다.

### 시장동향 설계

구조 유지:
- `InsightsPage.vue`는 `GlobalView`, `SentimentView`, `KimchiView`를 세로 스택으로 합성한다.
- redirect 구조는 현재처럼 `/global`, `/sentiment`, `/kimchi` 모두 `/insights`로 보낸다.

변경 후보:
- `InsightsPage.vue`의 헤더에 섹션 순서와 현재 페이지 목적이 더 읽히도록 간격과 폭을 조정한다.
- `GlobalView.vue`는 stat card 최소 폭을 `minmax(180px, 1fr)` 수준으로 조정할지 검토한다. 모바일에서는 1컬럼 또는 2컬럼 중 숫자 가독성이 나은 쪽을 선택한다.
- `SentimentView.vue`는 760px 이하 1컬럼 접힘은 유지하되 gauge 최대 폭과 chart height가 부모 높이에 과하게 묶이지 않도록 보강한다.
- `KimchiView.vue`와 `KimchiTable.vue`는 모바일 horizontal scroll을 명시하고, 표 자체에는 최소 폭을 부여한다. 카드형 변환은 기존 표 테스트와 정보 비교성을 많이 바꾸므로 이번 1차에서는 제외한다.

검증 포인트:
- 375px 폭에서 김치프리미엄 표가 찌그러지지 않고 스크롤 가능하다.
- Sentiment gauge와 trend chart가 부모 높이 0 문제 없이 보인다.
- 글로벌 시총 숫자는 너무 큰 font-size로 줄바꿈 폭주하지 않는다.

## 8. 문서구체화

파일 단위 영향 범위:

| 파일 | 책임 | 문서화된 변경 성격 |
|---|---|---|
| `web/src/components/AppNav.vue` | 공통 네비 | 모바일 링크 폭, 줄바꿈, 터치 타깃 안정화 |
| `web/src/styles/_variables.scss` | 디자인 토큰 | 신규 색상 추가 없음, 기존 토큰 유지 |
| `web/src/styles/_mixins.scss` | 공통 패널/컨트롤 스타일 | 필요한 경우 responsive helper만 소규모 추가 |
| `web/src/features/landing/LandingPage.vue` | 랜딩 hero | 히어로 배치, 낮은 높이 화면, 사용하지 않는 배열 정리 후보 |
| `web/src/features/exchange/ExchangePage.vue` | 거래소 전체 레이아웃 | grid/sidebar/split-grid/chart controls 반응형 |
| `web/src/features/exchange/ExchangeHero.vue` | 선택 마켓 티커 | 긴 코인명/가격/chip 접힘 |
| `web/src/features/exchange/CoinList.vue` | 코인 검색/리스트 | 모바일 행 grid 정리 |
| `web/src/features/exchange/OrderbookPanel.vue` | 호가 | 520px 이하 데이터 컬럼 압축 보강 |
| `web/src/features/exchange/TradeList.vue` | 체결 | 520px 이하 데이터 컬럼 압축 보강 |
| `web/src/features/insights/InsightsPage.vue` | 시장동향 셸 | 헤더/스택 폭과 간격 |
| `web/src/features/global/GlobalView.vue` | 글로벌 시총 카드 | 카드 최소 폭, 숫자 크기 |
| `web/src/features/sentiment/SentimentView.vue` | 감성 게이지/차트 | 모바일 gauge/chart height 안정화 |
| `web/src/features/kimchi/KimchiView.vue` | 김프 섹션 | 스크롤 컨테이너/설명/필터 밀도 |
| `web/src/features/kimchi/KimchiTable.vue` | 김프 표 | 모바일 horizontal scroll 전제의 최소 폭 |
| `web/test/*.test.ts` | 회귀 테스트 | CSS 구조/렌더링 회귀 보강 |

테스트/검증 기준:
- `npm run test --workspace web`
- `npm run build --workspace web`
- 수동 viewport 확인: 375x812, 640x900, 960x900, 1200x900, 1440x1000
- 가능한 경우 브라우저 스크린샷으로 랜딩 hero, 거래소 chart/sidebar, 시장동향 Kimchi table을 확인한다.

## 9. 문서검토

자체 검토 결과:

| 단계 | 범위 | 근거 | 모순 | 가독성 | 판정 |
|---|---|---|---|---|---|
| 아이디어 제안 | PASS | PASS | PASS | PASS | PASS |
| 스크리닝 | PASS | PASS | PASS | PASS | PASS |
| 기획 | PASS | PASS | PASS | PASS | PASS |
| 설계 | PASS | PASS | PASS | PASS | PASS |
| 코드베이스 기반 문서구체화 | PASS | PASS | PASS | PASS | PASS |
| 문서검토 | PASS | PASS | PASS | PASS | PASS |
| 작업 Task 분리 | PASS | PASS | PASS | PASS | 별도 plan 문서로 진행 |
| 구현진행 | BLOCKED | PASS | PASS | PASS | 사용자 확인 범위 밖이라 중단 |

모순 확인:
- README의 `/insights` 단일 시장동향 페이지 설명과 일치한다.
- 기존 redirect를 유지한다.
- 기존 SCSS 토큰과 믹스인을 우선한다.
- 구현 전 문서/Task 분리만 진행한다는 사용자 확인과 일치한다.

불명확한 항목:
- 없음. 구현 전 시각 검증은 plan의 실행 단계에서 수행한다.

