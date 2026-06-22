# 뉴스페이지 2차 고도화 — HOT Alert 자동화 & 헤더 알림 기획 (확정본)

작성일: 2026-06-22
대상: `CoinBurrow` `/news`
관련: `news-alert-bot-plan.md`(핫이슈 알림 1차), `crypto-news-source-filter-plan.md`
상태: 결정 확정 + 구현 완료(핵심 항목)

---

## 1. 요구사항 (이번 범위)

1. **페이지 접근 시 HOT Alert 자동 활성화.** 권한이 필요하면 접근 즉시 권한 요청.
2. aside에서 **Top hot issues / Recent alerts 제거.**
3. **AppNav 헤더에 알림 아이콘 버튼 추가** → 클릭 시 **팝오버**로 **Recent alerts** 표시.
4. **검색 필드 위치 정리** + aside 한글화 + 군더더기 제거.

---

## 2. 확정 결정 (권장안 채택)

| # | 항목 | 확정 |
|---|---|---|
| D1 | AppNav 결합 | **(A) `#actions` 슬롯.** 공용 nav는 news 스토어에 직접 결합하지 않고, 뉴스 페이지에서만 벨을 슬롯 주입 |
| D2 | 검색 위치 | **news-title 바로 아래** (제목 위 아님) |
| D3 | 자동 활성화 기본값 | **접근 시 기본 ON.** 단 사용자가 끈 적이 있으면(localStorage) 그 설정 존중 |
| D4 | 미확인 배지 | **표시함** — 벨에 unseen 알림 수 배지 |
| D5 | Top hot issues | **aside에서 제거(이전 안 함).** Recent alerts만 벨 팝오버로 이관. (Top issues의 feed 상단 칩 노출은 후속 과제) |

---

## 3. 진행 상태

### ✅ 완료 (이번 세션)
- 검색 필드를 **news-title 아래로** 이동 (D2)
- **매체(source) 버튼 스타일 복구** — `TooltipButton` → 일반 `<button>` + native `title`(매체 설명 유지). 깨짐 해결
- **새로고침 버튼 툴팁 제거**, **리셋 버튼 제거**
- aside **한글화** + `NewsPage.statusText` 한글화(`ko-KR`)

### ✅ 완료 (이번 세션 이후)
- 접근 시 자동 활성화 + 권한 즉시 요청 (D3)
- AppNav `#actions` 슬롯 (D1)
- `NewsAlertsPopover.vue` 신설 — 벨 + Recent alerts + on/off + 권한 + 배지 (D4)
- aside에서 **핫이슈 알림 섹션 제거**(토글/Top issues/Recent를 벨로 이관) (요구 2, D5)

### ⏳ 잔여
- P2 항목: `Top hot issues`를 feed 상단 칩 형태로 추가할지 여부는 후속 검토

---

## 4. 잔여 설계

### 4-1. 접근 시 자동 활성화 + 권한 즉시 요청 (D3)
`NewsPage.vue onMounted`:

```text
loadHotAlertState()
→ 사용자가 명시적으로 끈 기록 있음 : 그대로(off)
→ permission === 'granted'         : setHotAlertEnabled(true)
→ permission === 'default'         : requestNotificationPermission() → granted면 setHotAlertEnabled(true)
→ permission === 'denied'          : 보류(알림 없이 동작)
loadNews / refreshHotAlertSnapshot / 폴링(60s)은 유지
```

- ⚠️ **브라우저 정책:** 최신 Chrome/Firefox는 `requestPermission()`을 **사용자 제스처 없이** 호출하면 무시/거부 가능 → onMounted 자동요청은 best-effort, **막히면 벨 클릭(제스처)에서 재요청**.

### 4-2. AppNav `#actions` 슬롯 (D1)
```text
<nav class="app-nav">
  brand (좌)
  app-nav__right (우): [마켓][뉴스]  +  <slot name="actions" />
</nav>
```
- 슬롯 비었으면 기존과 동일(마켓 페이지엔 벨 없음).
- 모바일(≤640): right 그룹 풀폭, 링크 flex-grow, 벨은 끝.

### 4-3. `NewsAlertsPopover.vue` (신규, D4)
- **벨 버튼**: 활성/비활성·권한 상태 반영, **unseen 배지**(history 기준).
- 클릭 → **팝오버**(드롭다운):
  - **Recent alerts**(`hotAlertHistory`): 라벨·count·시각, 클릭 시 원문 새 탭.
  - **on/off 토글** + **권한 상태/요청 버튼**(default면 여기서 요청 → 제스처 확보).
  - empty state.
- news 스토어 구독: `hotAlertEnabled/Permission/History`, `setHotAlertEnabled/requestNotificationPermission`.
- 접근성: `aria-expanded`/`aria-controls`, ESC·외부클릭 닫기, 포커스 처리.

### 4-4. aside에서 핫이슈 알림 섹션 제거 (요구 2)
- `NewsFilters.vue`의 `filter-section--alerts`(토글/지금 뜨는 이슈/최근 알림) **제거** + 관련 props/emits 정리.
- 제거 후 aside 순서: **제목 → 검색 → 자산 → 매체.**

---

## 5. 컴포넌트 / 파일별 (잔여)

| 파일 | 변경 |
|---|---|
| `web/src/features/news/NewsPage.vue` | onMounted 자동 활성화+권한, `#actions` 슬롯에 `NewsAlertsPopover` 주입, alerts 관련 props 전달 제거 |
| `web/src/components/AppNav.vue` | 우측 `app-nav__right` + `#actions` 슬롯 |
| `web/src/features/news/NewsAlertsPopover.vue` *(신규)* | 벨 + 팝오버(Recent alerts/토글/권한/배지) |
| `web/src/features/news/NewsFilters.vue` | `filter-section--alerts` 제거, alerts props/emits 정리 |
| `web/src/stores/news.ts` | (선택) `ensureHotAlertEnabled()`, unseen 카운트 |

→ 스토어 핵심 로직(computeHotIssues/폴링/쿨다운/영속)은 **재사용**, 신규 데이터 모델 없음.

## 6. 제약 / 주의

- **탭 열림 시에만 알림**(서비스워커/푸시 미사용) — 1차 제약 유지.
- **권한 자동요청은 제스처 정책에 막힐 수 있음** → 벨 클릭 fallback 필수.
- Top hot issues UI 제거로 "지금 뜨는 토픽" 가시성 사라짐 — 알림(푸시)+벨 history로 대체(후속: feed 상단 칩 검토).

## 7. 작업 티켓

- CBR-NEWS2-1001: NewsPage 자동 활성화 + 권한 즉시 요청(+벨 fallback) — P0
- CBR-NEWS2-1002: ✅ NewsFilters 검색 위치/매체 버튼/툴팁·리셋 제거/한글화 — **완료**
- CBR-NEWS2-1003: AppNav `#actions` 슬롯 — P0
- CBR-NEWS2-1004: `NewsAlertsPopover.vue`(벨+Recent alerts+토글+권한+배지) — P0
- CBR-NEWS2-1005: NewsFilters에서 핫이슈 알림 섹션 제거 + props 정리 — P0
- CBR-NEWS2-1006: 접근성(aria/ESC/외부클릭/포커스) + 권한 거부 안내 — P1
- CBR-NEWS2-1007: (선택) unseen 배지 / Top issues feed 칩 — P2

## 8. 한 줄 요약

핫이슈 알림을 **접근 즉시 자동 활성화**(권한 즉시 요청, 막히면 벨 클릭 재요청)하고, **모든 알림 UI(토글·Recent alerts)를 AppNav 헤더의 벨 팝오버로 이관**한다. AppNav 결합은 **`#actions` 슬롯(권장)** 으로 공용성을 지키고, 스토어 로직은 그대로 재사용한다. aside는 **제목 → 검색 → 자산 → 매체** 로 단순화(이미 한글화·검색 이동·매체 버튼 복구 완료).
