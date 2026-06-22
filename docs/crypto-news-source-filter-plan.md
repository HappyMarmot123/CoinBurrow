# 뉴스 매체(Source) 필터 + 매체 설명 툴팁 — 기획/구현 계획

작성일: 2026-06-22
대상: `CoinBurrow` `/news` 페이지
관련 문서: `crypto-news-page-plan.md`, `crypto-news-codex-handoff.md`, `crypto-news-504-incident.md`

---

# PART A. 기획안

## A-1. 배경

- 현재 `/news`는 자산(asset)·언어·검색 필터만 있고 **매체(출처)로 좁힐 수단이 없다.**
- 504 수정 이후 기사 피드는 `language === 'en'`이 아니면 **한국어 international 피드 고정**(`cryptocurrencyCv.ts:144` `fetchRawFeed`)이라, 기본 화면엔 사실상 **TokenPost / Block Media** 두 곳만 노출된다.
- 반면 `/market/news/sources`는 정적 8곳을 광고해 **표시(2곳) ↔ 광고(8곳) 불일치**가 있다(이전 분석에서 확인).

## A-2. 목표

1. **aside(사이드바)에 매체 선택 카테고리 신설** — `전체` 포함, **Bitcoin Magazine 제거**.
2. 각 매체 버튼에 **특징 설명 툴팁** 제공(아래 A-4 문구).

## A-3. 범위 / 비범위

- 범위: 매체 필터 UI(aside), 매체별 피드 라우팅, 매체 설명 툴팁, sources 정합.
- 비범위: 신규 매체 추가, 영어/한국어 피드 동시 병합(아래 C-3 결정 항목), AI 분류.

## A-4. 매체 목록과 설명 (Bitcoin Magazine 제거 → 7곳 + 전체)

| 매체 | 기본 피드 | 설명(툴팁) |
|---|---|---|
| **전체** | ko(기본) | 선택한 언어 피드의 모든 매체 |
| **TokenPost** | ko | 국내 사용자 중심의 암호화폐/블록체인 뉴스 큐레이션. 장점은 한글 접근성, 단점은 한국 프로젝트/마켓 영향권에 편중될 수 있음. |
| **Block Media** | ko(확인 필요) | 이름이 여러 서비스에서 쓰이므로 보통 The Block 계열 또는 특정 로컬 블록체인 미디어를 가리킬 가능성이 큼. 매체명이 확정되면 더 정확히 분류 가능. |
| **CoinDesk** | en | 글로벌 표준형 암호 자산 언론지. 규제, 제도, 시장 인프라 보도 강점. 업계 뉴스 밸리드 역할이 강함. |
| **The Block** | en | 데이터/리서치 비중이 높은 편. 심층 분석과 시장 구조 기사에 강점, 기관/전문가용 참고도 높음. |
| **Decrypt** | en | 기술 이해도를 높이는 설명형 + 대중형 뉴스 성격. 초반 브리핑/트렌드 파악에 유리. |
| **CoinTelegraph** | en | 카테고리 폭이 넓고 속보성 높음. 양질 콘텐츠도 많지만, 이슈 편집 방향이 플랫폼 성향 따라 들쭉날쭉할 수 있음. |
| **Blockworks** | en | 시장·상품화·거버넌스·기관 투자자 관점 기사 강함. 리포트/팟캐스트/분석형 콘텐츠가 두드러짐. |

## A-5. 핵심 설계 결정

- **출처 선택 = 피드 언어 결정.** ko 매체 → ko 피드, en 매체 → en 피드. 서버가 매핑을 소유한다.
- **`전체` = 출처 필터 없음(현재 기본 피드 = ko).** ko+en 동시 병합은 upstream 2회 호출(특히 느린/빈 en) → 504 이력상 1차 제외(C-3 결정 항목).
- sources 정적 목록을 **레지스트리 단일 출처**로 통합해 표시·필터·피드 매핑을 일치시킨다.

## A-6. UX 스케치

```text
aside
┌─ 자산 ────────────────┐   (기존)
│ [전체][BTC][ETH]...   │
├─ 매체 ────────────────┤   (신규)
│ [전체][TokenPost]     │   ← hover/focus 시 툴팁
│ [Block Media][CoinDesk]
│ [The Block][Decrypt]
│ [CoinTelegraph][Blockworks]
└───────────────────────┘
```

## A-7. 리스크

| 리스크 | 영향 | 대응 |
|---|---|---|
| en 피드가 비어있음/느림(현재 count=0) | 영어 매체 선택 시 빈 결과 | empty state 유지 + Phase 0에서 매체별 실데이터 확인 |
| 피드의 `source` 문자열이 라벨과 다름(예: "토큰포스트") | 필터가 0건 | **alias 매핑** + Phase 0 실측 |
| 단일 애그리게이터 의존 | 전체 동시 장애 | 기존 degraded/stale 정책 재사용 |
| Block Media 매체 정체 불명 | 분류 부정확 | 실데이터 source 확인 후 라벨/피드 확정 |

---

# PART B. 상세 구현 계획

## B-1. 데이터 모델 (단일 레지스트리)

서버에 매체 레지스트리를 둔다. 표시 라벨·피드 언어·alias(실데이터 source 문자열 후보)를 한 곳에서 관리.

```ts
// server/src/news/sources.ts (신규)
export interface NewsSourceDef {
  id: string            // 'tokenpost'
  label: string         // 'TokenPost'
  feed: 'ko' | 'en'
  aliases: string[]     // 피드 source 문자열 매칭용 (소문자 비교)
}

export const NEWS_SOURCES: NewsSourceDef[] = [
  { id: 'tokenpost',    label: 'TokenPost',     feed: 'ko', aliases: ['tokenpost', '토큰포스트'] },
  { id: 'blockmedia',   label: 'Block Media',   feed: 'ko', aliases: ['block media', 'blockmedia', '블록미디어'] },
  { id: 'coindesk',     label: 'CoinDesk',      feed: 'en', aliases: ['coindesk'] },
  { id: 'theblock',     label: 'The Block',     feed: 'en', aliases: ['the block', 'theblock'] },
  { id: 'decrypt',      label: 'Decrypt',       feed: 'en', aliases: ['decrypt'] },
  { id: 'cointelegraph',label: 'CoinTelegraph', feed: 'en', aliases: ['cointelegraph', 'coin telegraph'] },
  { id: 'blockworks',   label: 'Blockworks',    feed: 'en', aliases: ['blockworks'] },
]
// Bitcoin Magazine 제거됨
```

블러브(설명 문구)는 **UI 카피**이므로 프론트 상수에 둔다(A-4 표 그대로). source id로 키 매칭.

## B-2. 서버 변경

| 파일 | 변경 |
|---|---|
| `server/src/news/sources.ts` | 신규. `NEWS_SOURCES` 레지스트리 + `resolveSourceFeed(id)`, `matchSource(articleSource, id)` 헬퍼 |
| `server/src/routes/news.ts` | `newsQuerySchema`에 `source: z.string().trim().optional()` 추가(레지스트리 id 검증). `stableQueryKey`에 source 포함 |
| `server/src/news/providers/cryptocurrencyCv.ts` | `fetchRawFeed`: **source가 지정되면 그 매체의 `feed`로 언어 결정**(en 매체 → en 피드). `DEFAULT_NEWS_SOURCES` → 레지스트리에서 파생(Bitcoin Magazine 제거). `fetchCryptoCurrencyCvSources`가 레지스트리(label 목록) 반환 |
| `server/src/news/normalize.ts` | `matchesQuery`에 **source 필터 추가**(`matchSource` alias 비교, 대소문자 무시) |
| `server/src/news/types.ts` | `CryptoNewsQuery`에 `source?: string` 추가 |

피드 언어 결정 로직(요지):
```ts
function feedLanguageFor(query: CryptoNewsQuery): 'ko' | 'en' {
  if (query.source) return resolveSourceFeed(query.source) ?? (query.language === 'en' ? 'en' : 'ko')
  return query.language === 'en' ? 'en' : 'ko'
}
```

## B-3. 프론트 변경

| 파일 | 변경 |
|---|---|
| `web/src/constants/news.ts` | `NEWS_SOURCE_FILTERS = [{ value:'ALL', label:'전체', blurb }, ...7곳]` 추가(블러브 포함, Bitcoin Magazine 없음) |
| `web/src/features/news/NewsFilters.vue` | 매체 필터 그룹 추가(자산 그룹과 동형). 각 버튼에 **툴팁**. `update:source` emit |
| `web/src/features/news/NewsPage.vue` | source ↔ `store.setQuery({ source })` 와이어링 |
| `web/src/stores/news.ts` | `NewsStoreQuery`에 `source: string`(기본 `'ALL'`), `toRequestOptions`/`resetFilters` 반영 |
| `web/src/api/rest.ts` | `NewsQueryOptions`에 `source?: string` 추가, query에 포함 |

`source==='ALL'`이면 query에서 생략(전체 = 필터 없음).

## B-4. 툴팁 (접근성 — plan 4-3 준수)

- 1차(최소): 버튼에 `title` 속성으로 블러브 노출.
- 권장: 커스텀 툴팁 — 버튼 `aria-describedby`로 숨김 설명 연결, hover **및 focus**에서 표시, ESC로 닫힘, 색에만 의존하지 않음(텍스트 포함).
- 모바일: hover 불가 → 버튼 옆 `ⓘ` 보조 버튼 탭으로 토글 또는 선택 시 하단에 설명 1줄.

## B-5. Phase 0 검증 (코딩 전 필수 — 실데이터 확인)

- [ ] ko/en 피드가 회복된 시점에 실제 article `source` 문자열을 수집해 **alias 매핑 검증**(예: "토큰포스트" vs "TokenPost").
- [ ] 각 영어 매체(CoinDesk/The Block/Decrypt/CoinTelegraph/Blockworks)가 en 피드에 **실제로 등장하는지** 확인. 안 나오면 해당 매체 버튼을 **숨김 또는 비활성**.
- [ ] Block Media 실체 확정(한국 로컬 vs The Block 계열) → `feed`/`label` 확정.

## B-6. 테스트

서버(`news-routes.test.ts`):
- `source=tokenpost` → ko 피드 호출 + TokenPost만 통과
- `source=coindesk` → en 피드 호출 경로 확인
- 잘못된 source → 400 또는 무시(정책 택1)
- alias 매칭(대문자/한글) 통과

프론트(`news-store.test.ts`, `news-page.test.ts`):
- 매체 버튼 클릭 → `query.source` 변경 + 재조회 + cursor 초기화
- `전체` 선택 시 source 미전송
- 툴팁 focus/hover 노출, `aria-describedby` 연결
- 빈 결과(영어 매체 0건) → empty state

---

# PART C. 문서 보완

## C-1. 기존 문서 동기화

- `crypto-news-page-plan.md`
  - 4-1 화면 구성에 **매체 필터 + 툴팁** 반영.
  - 5 데이터 모델 `CryptoNewsQuery`에 `source` 추가.
  - 6-2 내부 API에 `source` 파라미터 명시.
- `crypto-news-504-incident.md`
  - "sources 정적 목록 ↔ 실제 피드 불일치"를 **본 레지스트리 통합으로 해소**했다고 후속 기록.
- `crypto-news-codex-handoff.md`
  - 8절 메모에 "출처 선택 = 피드 언어 결정, Bitcoin Magazine 제거" 추가.

## C-2. sources ↔ 실제 정합 (이전 모순 해소)

- `/market/news/sources`가 **레지스트리(7곳) 기반**으로 반환 → 광고와 노출 가능 매체가 일치.
- 단 "노출 가능"과 "현재 실제 데이터 있음"은 다름 → health/degraded 플래그와 함께 UI에서 "데이터 없음" 처리.

## C-3. 결정 필요 항목

1. **`전체`의 정의** — (A 권장) ko 단일 피드 / (B) ko+en 병합(upstream 2회, 504 리스크). 기본 A, B는 2차.
2. **영어 매체 빈 결과 처리** — 숨김 vs 비활성 vs 그대로 노출+empty.
3. **Block Media 매체 확정** — Phase 0 결과로 label/feed 최종화.
4. **잘못된 source 입력** — 400 vs 무시(전체로 폴백).

## C-4. 작업 티켓

- CBR-NEWS-1201: 매체 레지스트리(`sources.ts`) + 서버 source 필터/피드 매핑 (P0)
- CBR-NEWS-1202: `/market/news/sources` 레지스트리 반환 + Bitcoin Magazine 제거 (P0)
- CBR-NEWS-1203: 프론트 매체 필터 UI + 툴팁(접근성) (P0)
- CBR-NEWS-1204: store/rest source 와이어링 + 테스트 (P0)
- CBR-NEWS-1205: Phase 0 실데이터 검증(alias·en 매체 가용성·Block Media) (P0, 코딩 전)
- CBR-NEWS-1206: 기존 문서 3종 동기화 (P1)

## C-5. 한 줄 요약

aside에 **전체 포함 7개 매체(Bitcoin Magazine 제외) 필터 + 특징 툴팁**을 추가하되, **출처 선택이 피드 언어(ko/en)를 결정**하도록 서버 레지스트리로 통합한다. 영어 매체는 en 피드 실데이터 확인(Phase 0)이 선행돼야 하며, `전체`는 1차에서 ko 단일 피드로 둔다.
