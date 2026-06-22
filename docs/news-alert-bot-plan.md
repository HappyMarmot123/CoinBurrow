# 뉴스 핫이슈 알림 — 기능 제안 & 기획안 (브라우저 전용)

작성일: 2026-06-22
대상: `CoinBurrow` (기존 `/news` 파이프라인 확장)
상태: 아이디어 제안 + 1차 기획
방식: **OAuth/계정/서드파티 없음 — 브라우저 내에서만**
관련: `crypto-news-page-plan.md`, `crypto-news-504-incident.md`, `crypto-news-source-filter-plan.md`

> 비고: 초기 안(관심종목 키워드 구독 알림)은 폐기하고, **전체 트렌드형 "핫이슈 알림"** 으로 전환한다. 개인 구독 규칙·매칭 엔진·KV가 불필요해 더 단순하다.

---

## 1. 배경 / 문제

- 현재 `/news`는 **전체 뉴스 나열**이라, "지금 무엇이 가장 뜨거운가(TOP/핫이슈)"가 **한눈에 안 보인다.**
- 사용자는 개별 기사를 훑기보다 **"오늘의 핵심 이슈 몇 개"** 를 빠르게 알고 싶어 한다.

## 2. 목표

- 최신 뉴스에서 **핫이슈(가장 많이·최근에 다뤄지는 토픽) 상위 N개**를 산정해 보여준다.
- **새로 떠오른 핫이슈**가 생기면 **브라우저 알림(Notification)** 으로 push.
- 핫이슈는 **최근 10개 history**만 유지(가벼운 ring buffer).
- **계정·서버 상태·서드파티 없이** 브라우저 안에서만 동작.

## 3. 기능 정의 — "핫이슈"란?

기존 피드가 주는 정규화 필드(`assets[]`, `categories[]`, `title`, `publishedAt`, `sentiment`)로 **클라이언트에서 계산**한다(서버 변경 0).

- **토픽 후보:** 1차 = `assets`(정규화된 코인, 신뢰도 높음). 옵션 = 핵심 키워드 사전(ETF, 규제, 해킹, 상장, 펀딩 등).
- **heat score(topic)** ≈ `최근 윈도우 내 언급 기사 수` × `최신성 가중`(최근일수록↑). 동점 시 최신 기사 시각 우선.
- 정렬 후 **상위 ~10 = 현재 핫이슈**. 토픽별 **대표 헤드라인 1개**(가장 최근 기사).

## 4. 동작 시나리오

1. 사용자가 `/news`에서 **🔔 핫이슈 알림** 버튼을 켠다 → 브라우저 알림 권한 요청.
2. 열린 탭이 주기적으로(예: 60초) 기존 `/market/news/articles`를 폴링.
3. 응답 기사로 **핫이슈 TOP N 재계산** → 화면의 "핫이슈" 영역 갱신.
4. 직전 스냅샷/히스토리 대비 **새 토픽이 상위 진입**(또는 급증)하면 → `new Notification("🔥 SOL 관련 뉴스 급증", { body: 대표 헤드라인 })`.
5. 동일 토픽 재알림은 **쿨다운**(예: 같은 토픽 6시간 1회). 히스토리는 **최근 10개**만 유지.

## 5. 아키텍처 (브라우저 전용 — 서버 변경 최소)

```text
[열린 /news 탭]
  ├ 60초 폴링 → GET /market/news/articles?limit=50   (기존 엔드포인트 그대로)
  ├ computeHotIssues(articles)  → TOP N (클라이언트)
  ├ diff(현재 TOP, localStorage 히스토리) → 신규 핫이슈
  ├ Notification.permission === 'granted' 이면 new Notification(...)
  └ localStorage에 히스토리(최근 10) + 쿨다운 갱신
```

- **서버/KV/Cron/계정 0.** 모든 상태는 `localStorage`.
- 알림은 **Web Notifications API**(`Notification`) — 탭이 열려 있을 때 동작(서비스워커/푸시 불필요).
- (선택) 더 큰 윈도우·캐싱이 필요하면 후속으로 서버 `/market/news/trending` 추가(C-결정 항목).

## 6. 데이터 모델 (localStorage)

```ts
// 키: 'coinburrow.news.hotAlerts'
interface HotAlertState {
  enabled: boolean
  permission: 'default' | 'granted' | 'denied'
  history: HotIssue[]          // 최근 10개 (ring buffer, max 10)
  cooldown: Record<string, number>  // topic -> 마지막 알림 ts
  updatedAt: number
}

interface HotIssue {
  topic: string            // 'BTC' | 'etf' ...
  label: string            // 'Bitcoin' | 'ETF'
  headline: string         // 대표 기사 제목
  url: string
  count: number            // 윈도우 내 언급 수
  firstSeenAt: number      // 핫이슈로 처음 떴을 때
}
```

- `history`는 **push 시 앞에 추가, 길이 10 초과분 제거**.
- dedup: 신규 후보 topic이 `history`에 있고 `cooldown` 내면 알림 생략.

## 7. UI

- **🔔 핫이슈 알림 토글 버튼** — `/news` 상단(또는 aside). 끄기/켜기, 권한 요청, 거부 시 안내.
- **핫이슈 영역**(신규) — TOP N 카드/칩: `라벨 · 언급수 · 대표 헤드라인 · 원문 링크`. 새로 뜬 항목 강조(🔥).
- **최근 핫이슈(history 10)** — 작은 리스트로 "방금 지나간 이슈" 확인.
- 접근성: 알림 토글에 상태 텍스트(켜짐/꺼짐/차단됨), 색 비의존.

## 8. 핫이슈 산정 로직 (상세, 클라이언트)

```text
입력: 최신 기사 N(=50)개
1) 각 기사 → assets[](+옵션 키워드 매칭)로 토픽 추출
2) 토픽별 집계: count, 최신 publishedAt, 대표 headline(최신)
3) score = count + recencyBonus(최근 1~2시간 기사 가중)
4) score 내림차순 정렬 → TOP N(<=10)
5) 신규 판정: TOP에 새로 들어왔거나 count가 직전 대비 임계(예:+3) 급증
6) 신규 & 쿨다운 통과 → 알림 + history push
```

- 윈도우/임계/쿨다운/halflife는 상수로 분리해 튜닝.
- 키워드 사전은 작게 시작(ETF·규제·해킹·상장·펀딩·ETF승인 등) 후 확장.

## 9. 제약 / 한계 (정직하게)

- **탭이 열려 있을 때만 알림.** 닫으면 안 옴(닫아도 알림 = 서비스워커+푸시+서버 필요 → 범위 외).
- **피드 의존성:** `cryptocurrency.cv`가 현재 간헐적으로 비어있음(504 incident). 기사가 적으면 핫이슈 신뢰도↓ → 빈/저volume 시 "데이터 부족" 표기.
- **상태는 브라우저 로컬:** 기기 간 동기화 없음, 사이트 데이터 삭제 시 초기화.
- **"핫"의 주관성:** 산정식은 휴리스틱. 과알림 방지 위해 보수적 임계 + 쿨다운.

## 10. MVP 범위 / 단계

- **Phase 1 (MVP):** 핫이슈 TOP N(asset 기반) + 🔔 토글 + Notification + localStorage 히스토리10 + 쿨다운. 서버 변경 0.
- **Phase 2:** 키워드 토픽 사전 추가, 핫이슈 영역 UX 고도화, "데이터 부족" 처리.
- **Phase 3(선택):** 서버 `/market/news/trending`(더 큰 윈도우+캐시), 닫아도 알림(서비스워커/푸시) — 별도 검토.

## 11. 리스크

| 리스크 | 영향 | 대응 |
|---|---|---|
| 과알림(noise) | 사용자 이탈/권한 차단 | 보수적 임계 + topic 쿨다운 + 시간당 상한 |
| 피드 빈약/불안정 | 핫이슈 부정확 | 최소 기사수 미달 시 알림 보류, "데이터 부족" 표기 |
| 권한 거부 | 알림 불가 | 거부 시 화면 내 핫이슈 영역은 그대로 제공(알림만 off) |
| 산정식 편향 | 특정 코인 쏠림 | recency 가중·정규화로 완화, 임계 튜닝 |
| 탭 닫힘 오해 | "알림 안 온다" CS | UI에 "탭이 열려 있을 때 동작" 명시 |

## 12. 작업 티켓 (초안)

- CBR-HOT-1001: 핫이슈 산정 유틸(`computeHotIssues`, asset 기반) + 단위 테스트 — P0
- CBR-HOT-1002: localStorage 상태(history10/쿨다운) 모듈 — P0
- CBR-HOT-1003: 🔔 알림 토글 + 권한 흐름 + Notification 발송 — P0
- CBR-HOT-1004: 핫이슈 UI 영역(TOP N + 최근10) — P0
- CBR-HOT-1005: 폴링 연동(기존 store/feed 재사용, 가시성 일시정지) — P1
- CBR-HOT-1006: 키워드 토픽 사전(Phase 2) — P2
- CBR-HOT-1007: 서버 `/market/news/trending`(선택, Phase 3) — P2

## 13. 결정 필요 항목

1. **토픽 정의** — (A 권장) asset만 / (B) asset + 키워드 사전(ETF·규제·해킹 등).
2. **산정 위치** — (A 권장 MVP) 클라이언트 계산 / (B) 서버 `/trending` 엔드포인트(더 일관·캐시).
3. **폴링 주기** — 30s / **60s(권장)** / 120s. 백그라운드 탭은 느리게.
4. **알림 트리거 기준** — "TOP 진입"만 vs "급증(count Δ)"도 포함.
5. **TOP N / 쿨다운 값** — N=5~10, 쿨다운 6h 등 초기값.

## 14. 한 줄 요약

전체 나열뿐인 뉴스에 **"지금 뜨는 핫이슈 TOP N"** 을 더하고, 새 이슈가 뜨면 **브라우저 알림**으로 알린다. **계정·서버 상태·서드파티 없이** 열린 탭에서 기존 피드를 폴링→클라이언트 계산→`Notification`, 히스토리는 localStorage 10개만 유지한다. 한계는 "탭 열림 시에만 동작"과 "피드 안정성 의존"이다.
