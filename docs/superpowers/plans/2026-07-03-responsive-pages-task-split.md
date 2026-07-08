# Responsive Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 랜딩, 거래소, 시장동향 3개 페이지의 반응형 레이아웃을 기존 CoinBurrow 디자인 토큰 안에서 개선한다.

**Architecture:** Vue 3 feature 단위 SFC를 유지하고, 페이지 orchestration은 기존 `LandingPage.vue`, `ExchangePage.vue`, `InsightsPage.vue`에서 처리한다. 공통 색상/패널 토큰은 `styles/_variables.scss`와 `styles/_mixins.scss`를 재사용하며, API/store/composable 데이터 계약은 변경하지 않는다.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, Vue Router, Pinia, SCSS, Vite, Vitest, @vue/test-utils.

---

## Scope And Guardrails

- 구현은 이 문서 작성 단계에서 시작하지 않는다.
- 새 UI 라이브러리, 새 라우트 구조, 백엔드 변경, 데이터 계약 변경은 범위 밖이다.
- 기존 색상 토큰을 유지한다. 새 팔레트는 추가하지 않는다.
- viewport 기준은 375px, 640px, 760px, 960px, 1200px, desktop이다.
- 모든 Task는 범위, 근거, 모순, 가독성 가드레일을 통과해야 진행한다.

Guardrail 판정:

| 항목 | 상태 | 근거 |
|---|---|---|
| 범위 | PASS | 세 페이지 responsive CSS/markup/test에 한정 |
| 근거 | PASS | 설계 문서의 코드베이스 근거 기반 |
| 모순 | PASS | `/insights` 단일 페이지 구조 유지 |
| 가독성 | PASS | Task별 파일, 검증 기준, 중단 조건 분리 |
| 구현진행 | BLOCKED | 사용자 확인에 따라 이번 단계에서 구현하지 않음 |

## File Map

공통:
- Modify: `web/src/components/AppNav.vue`
- Modify if needed: `web/src/styles/_mixins.scss`
- Do not modify unless necessary: `web/src/styles/_variables.scss`

랜딩:
- Modify: `web/src/features/landing/LandingPage.vue`
- Preserve: `web/src/features/landing/SplineScene.vue`
- Preserve: `web/src/features/landing/legacyHeroStars.scss`
- Modify tests: `web/test/landing.test.ts`

거래소:
- Modify: `web/src/features/exchange/ExchangePage.vue`
- Modify: `web/src/features/exchange/ExchangeHero.vue`
- Modify: `web/src/features/exchange/DailyStatsPanel.vue`
- Modify: `web/src/features/exchange/CoinList.vue`
- Modify: `web/src/features/exchange/OrderbookPanel.vue`
- Modify: `web/src/features/exchange/TradeList.vue`
- Modify if layout requires: `web/src/features/exchange/DerivativesPanel.vue`
- Modify if layout requires: `web/src/features/exchange/MarketMovementPanel.vue`
- Preserve data logic: `web/src/composables/useExchangeData.ts`, `web/src/composables/useMarketMeta.ts`
- Modify tests: `web/test/exchange-page.test.ts`, `web/test/coin-list.test.ts`

시장동향:
- Modify: `web/src/features/insights/InsightsPage.vue`
- Modify: `web/src/features/global/GlobalView.vue`
- Modify: `web/src/features/sentiment/SentimentView.vue`
- Modify: `web/src/features/kimchi/KimchiView.vue`
- Modify: `web/src/features/kimchi/KimchiTable.vue`
- Preserve routes: `web/src/router/index.ts`
- Modify tests: `web/test/insights-page.test.ts`, `web/test/global-page.test.ts`, `web/test/kimchi-table.test.ts`

## Task 1: Responsive Baseline Tests

**Purpose:** 구현 전 현재 구조를 보호하는 테스트를 먼저 보강한다.

**Files:**
- Modify: `web/test/landing.test.ts`
- Modify: `web/test/exchange-page.test.ts`
- Modify: `web/test/coin-list.test.ts`
- Modify: `web/test/insights-page.test.ts`
- Modify: `web/test/kimchi-table.test.ts`

- [ ] Step 1: `landing.test.ts`에 낮은 높이, 640px 이하, Spline/hero-copy 겹침 방지에 필요한 CSS selector 존재 검증을 추가한다.
- [ ] Step 2: `exchange-page.test.ts`에 `.exchange-layout`, `.panel-sidebar`, `.split-grid`, `.chart-controls`의 responsive selector 존재 검증을 추가한다.
- [ ] Step 3: `coin-list.test.ts`에 모바일 행 grid에서 코인명, 가격, 등락률이 별도 영역으로 유지되는 구조 검증을 추가한다.
- [ ] Step 4: `insights-page.test.ts`에 `GlobalView`, `SentimentView`, `KimchiView` 세 섹션 스택이 유지되는 검증을 유지하고, 헤더/스택 클래스 검증을 추가한다.
- [ ] Step 5: `kimchi-table.test.ts`에 모바일 표 최소 폭 또는 scroll wrapper 전제 class 검증을 추가한다.
- [ ] Step 6: 테스트 실패를 확인한다.

Run:

```powershell
npm run test --workspace web -- landing.test.ts exchange-page.test.ts coin-list.test.ts insights-page.test.ts kimchi-table.test.ts
```

Expected:
- 새 selector나 class가 아직 없어서 실패한다.

Guardrail:
- 범위 PASS: 테스트 보강만 수행
- 근거 PASS: 기존 test 파일을 확장
- 모순 PASS: 라우트/데이터 변경 없음
- 가독성 PASS: 실패 이유가 selector 단위로 드러남

## Task 2: Common Navigation And Panel Rules

**Purpose:** 세 페이지 공통으로 보이는 네비게이션과 패널 반응형 기초를 정리한다.

**Files:**
- Modify: `web/src/components/AppNav.vue`
- Modify if needed: `web/src/styles/_mixins.scss`

- [ ] Step 1: `AppNav.vue`의 640px 이하 레이아웃에서 brand와 link group이 좁은 폭에서도 과도하게 세로 공간을 먹지 않도록 gap, width, flex-wrap을 조정한다.
- [ ] Step 2: focus-visible 상태와 active state는 기존 `var(--brand-lime)`, `var(--panel-border-hover)`, `var(--panel-bg-strong)`를 유지한다.
- [ ] Step 3: 공통 responsive helper가 실제 중복을 줄일 때만 `_mixins.scss`에 추가한다. 단일 파일에서만 쓰는 helper는 만들지 않는다.
- [ ] Step 4: `exchange-page.test.ts`와 `insights-page.test.ts`를 실행해 nav link 회귀를 확인한다.

Run:

```powershell
npm run test --workspace web -- exchange-page.test.ts insights-page.test.ts
```

Expected:
- PASS

Guardrail:
- 범위 PASS: 공통 nav/panel 규칙만 조정
- 근거 PASS: `AppNav.vue`가 세 페이지에서 쓰임
- 모순 PASS: 메뉴명과 라우트 유지
- 가독성 PASS: 공통 변경이 한 파일에 집중

## Task 3: Landing Responsive Hero

**Purpose:** 랜딩 hero의 3D 오브젝트, 제목, CTA가 모바일과 낮은 높이 화면에서 겹치지 않게 한다.

**Files:**
- Modify: `web/src/features/landing/LandingPage.vue`
- Modify: `web/test/landing.test.ts`

- [ ] Step 1: `LandingPage.vue`의 hero 위치 값을 로컬 CSS 변수로 정리한다.
- [ ] Step 2: 900px 이하, 640px 이하, `max-height: 700px` 조건에서 `hero-copy`와 `hero-visual`의 top/height/gap을 조정한다.
- [ ] Step 3: `features-band` padding과 wave 높이를 모바일에서 과도하게 늘리지 않도록 정리한다.
- [ ] Step 4: 실제 template에서 쓰지 않는 `marketSignals`, `streamFeatures` 배열은 제거한다. 제거 전후 화면 기능 변화가 없어야 한다.
- [ ] Step 5: `landing.test.ts`의 CSS 문자열 검증을 새 responsive selector 기준으로 업데이트한다.
- [ ] Step 6: 랜딩 테스트를 실행한다.

Run:

```powershell
npm run test --workspace web -- landing.test.ts
```

Expected:
- PASS

Manual viewport checks:
- 375x812: H1, subcopy, CTA가 Spline과 겹치지 않음
- 640x900: hero가 한 화면에서 안정적으로 보임
- 900x600: 낮은 높이 화면에서 CTA가 화면 밖으로 밀리지 않음

Guardrail:
- 범위 PASS: 랜딩 CSS/미사용 배열 정리만 수행
- 근거 PASS: 현재 `LandingPage.vue`에 breakpoint가 이미 있음
- 모순 PASS: Spline, noise, star layer 유지
- 가독성 PASS: 로컬 CSS 변수로 breakpoint 의도 명확화

## Task 4: Exchange Page Shell And Sidebar

**Purpose:** 거래소 전체 레이아웃에서 chart 중심성과 coin selector 접근성을 동시에 확보한다.

**Files:**
- Modify: `web/src/features/exchange/ExchangePage.vue`
- Modify: `web/test/exchange-page.test.ts`

- [ ] Step 1: desktop `.exchange-layout`의 sidebar 폭을 `clamp()` 기반으로 조정한다.
- [ ] Step 2: 960px 이하에서 `.panel-sidebar`가 sticky를 해제하고 상단에 배치되도록 grid item order를 명시한다.
- [ ] Step 3: `.panel-sidebar` 모바일 높이를 제한해 코인 리스트가 첫 화면 전체를 차지하지 않도록 한다.
- [ ] Step 4: `.split-grid`를 충분한 desktop 폭에서는 2컬럼, 960px 이하에서는 1컬럼으로 접히게 한다.
- [ ] Step 5: `.chart-controls`와 `.timeframe-tabs`의 줄바꿈/터치 타깃을 정리한다.
- [ ] Step 6: `exchange-page.test.ts`를 업데이트하고 실행한다.

Run:

```powershell
npm run test --workspace web -- exchange-page.test.ts
```

Expected:
- PASS

Manual viewport checks:
- 375x812: 코인 선택이 너무 아래에 묻히지 않음
- 960x900: sidebar sticky 해제, 단일 컬럼 전환
- 1440x1000: chart와 sidebar가 안정적인 2컬럼

Guardrail:
- 범위 PASS: 레이아웃 CSS만 변경
- 근거 PASS: `ExchangePage.vue`가 현재 grid와 sidebar를 소유
- 모순 PASS: 데이터/composable 변경 없음
- 가독성 PASS: page shell 책임에 집중

## Task 5: Exchange Dense Panels

**Purpose:** 숫자와 행이 많은 거래소 패널의 작은 화면 가독성을 보강한다.

**Files:**
- Modify: `web/src/features/exchange/ExchangeHero.vue`
- Modify: `web/src/features/exchange/DailyStatsPanel.vue`
- Modify: `web/src/features/exchange/CoinList.vue`
- Modify: `web/src/features/exchange/OrderbookPanel.vue`
- Modify: `web/src/features/exchange/TradeList.vue`
- Modify if necessary: `web/src/features/exchange/DerivativesPanel.vue`
- Modify if necessary: `web/src/features/exchange/MarketMovementPanel.vue`
- Modify: `web/test/coin-list.test.ts`

- [ ] Step 1: `ExchangeHero.vue`에서 긴 코인명, 가격, chip이 640px 이하에서 겹치지 않도록 grid row를 재정리한다.
- [ ] Step 2: `DailyStatsPanel.vue`에서 주요 통계 카드가 640px 이하에서 한 줄에 너무 압축되지 않도록 접힘 규칙을 확인하고 보강한다.
- [ ] Step 3: `CoinList.vue` 모바일 행에서 코인명과 현재가가 같은 grid cell에 충돌하지 않도록 row placement를 정리한다.
- [ ] Step 4: `OrderbookPanel.vue` 520px 이하에서 bid/ask 숫자와 depth bar가 텍스트를 덮지 않게 minmax와 overflow를 점검한다.
- [ ] Step 5: `TradeList.vue` 640px 이하 컬럼 폭을 검토하고 긴 숫자에 ellipsis 또는 균형 잡힌 minmax를 적용한다.
- [ ] Step 6: `DerivativesPanel.vue`, `MarketMovementPanel.vue`는 실제 overflow가 확인될 때만 수정한다.
- [ ] Step 7: 관련 테스트를 실행한다.

Run:

```powershell
npm run test --workspace web -- coin-list.test.ts exchange-page.test.ts
```

Expected:
- PASS

Manual viewport checks:
- 375x812: CoinList row, Orderbook row, Trade row가 겹치지 않음
- 640x900: dense panels가 스크롤 없이 읽히거나 의도된 내부 스크롤만 사용

Guardrail:
- 범위 PASS: 거래소 presentational SFC만 변경
- 근거 PASS: overflow 위험 파일이 명확함
- 모순 PASS: market selection/stream behavior 변경 없음
- 가독성 PASS: 패널별 책임 분리

## Task 6: Insights Stack And Section Responsiveness

**Purpose:** 시장동향의 세 섹션을 한 페이지 구조로 유지하면서 모바일 표와 차트 가독성을 보강한다.

**Files:**
- Modify: `web/src/features/insights/InsightsPage.vue`
- Modify: `web/src/features/global/GlobalView.vue`
- Modify: `web/src/features/sentiment/SentimentView.vue`
- Modify: `web/src/features/kimchi/KimchiView.vue`
- Modify: `web/src/features/kimchi/KimchiTable.vue`
- Modify: `web/test/insights-page.test.ts`
- Modify: `web/test/global-page.test.ts`
- Modify: `web/test/kimchi-table.test.ts`

- [ ] Step 1: `InsightsPage.vue` shell width, padding, header spacing, stack gap을 viewport별로 정리한다.
- [ ] Step 2: `GlobalView.vue` stat grid의 최소 카드 폭과 hero readout font clamp를 조정한다.
- [ ] Step 3: `SentimentView.vue` gauge max-width와 trend chart body min-height를 보강한다.
- [ ] Step 4: `KimchiView.vue`의 scroll container에 모바일 horizontal scroll 정책을 명시한다.
- [ ] Step 5: `KimchiTable.vue`에 표 최소 폭을 부여하고 header sticky가 유지되도록 한다.
- [ ] Step 6: 시장동향 관련 테스트를 업데이트하고 실행한다.

Run:

```powershell
npm run test --workspace web -- insights-page.test.ts global-page.test.ts kimchi-table.test.ts
```

Expected:
- PASS

Manual viewport checks:
- 375x812: Kimchi table이 찌그러지지 않고 가로 스크롤 가능
- 640x900: Sentiment gauge와 trend chart가 자연스럽게 쌓임
- 1100px 이상: 세 섹션이 현재처럼 세로 읽기 구조 유지

Guardrail:
- 범위 PASS: `/insights` 단일 페이지 개선
- 근거 PASS: 현재 구조가 단순 stack
- 모순 PASS: `/global`, `/sentiment`, `/kimchi` redirect 유지
- 가독성 PASS: 섹션별 작업 분리

## Task 7: Build, Full Test, Visual QA

**Purpose:** 구현 결과가 문서의 responsive 목표를 충족하는지 확인한다.

**Files:**
- No planned source modifications
- Update docs only if implementation deviates from this plan with explicit reason

- [ ] Step 1: web test 전체를 실행한다.
- [ ] Step 2: web build를 실행한다.
- [ ] Step 3: 로컬 dev 서버에서 주요 viewport를 확인한다.
- [ ] Step 4: 확인 결과를 구현 PR 또는 작업 로그에 남긴다.

Run:

```powershell
npm run test --workspace web
npm run build --workspace web
```

Expected:
- 테스트 PASS
- 빌드 PASS

Manual viewport matrix:
- `/`: 375x812, 640x900, 900x600, 1440x1000
- `/exchange`: 375x812, 640x900, 960x900, 1440x1000
- `/insights`: 375x812, 640x900, 1100x900, 1440x1000

Guardrail:
- 범위 PASS: 검증만 수행
- 근거 PASS: test/build/manual viewport로 확인
- 모순 PASS: 계획 외 변경은 문서화 필요
- 가독성 PASS: 검증 결과가 명령과 viewport로 분리됨

## Execution Boundary

여기까지가 작업 Task 분리 단계다. 구현은 시작하지 않는다.

구현을 시작하려면 별도 승인 후 `superpowers:subagent-driven-development` 또는 `superpowers:executing-plans`로 Task 1부터 순서대로 진행한다.

