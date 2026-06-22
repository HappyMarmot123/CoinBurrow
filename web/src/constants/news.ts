export const NEWS_ASSET_FILTERS = [
  { value: "ALL", label: "전체" },
  { value: "BTC", label: "Bitcoin" },
  { value: "ETH", label: "Ethereum" },
  { value: "SOL", label: "Solana" },
  { value: "XRP", label: "XRP" },
  { value: "DEFI", label: "DeFi" },
] as const;

// 매체(출처) 필터. value는 서버 레지스트리(server/src/news/sources.ts)의 id와 일치.
// Bitcoin Magazine 제외. blurb는 버튼 툴팁으로 사용.
export const NEWS_SOURCE_FILTERS = [
  { value: "ALL", label: "전체", blurb: "선택한 언어 피드의 모든 매체" },
  {
    value: "tokenpost",
    label: "TokenPost",
    blurb:
      "국내 사용자 중심의 암호화폐/블록체인 뉴스 큐레이션. 장점은 한글 접근성, 단점은 한국 프로젝트/마켓 영향권에 편중될 수 있음.",
  },
  {
    value: "blockmedia",
    label: "Block Media",
    blurb:
      "이름이 여러 서비스에서 쓰이므로 보통 The Block 계열 또는 특정 로컬 블록체인 미디어를 가리킬 가능성이 큼. 매체명이 확정되면 더 정확히 분류 가능.",
  },
  {
    value: "coindesk",
    label: "CoinDesk",
    blurb:
      "글로벌 표준형 암호 자산 언론지. 규제, 제도, 시장 인프라 보도 강점. 업계 뉴스 밸리드 역할이 강함.",
  },
  {
    value: "theblock",
    label: "The Block",
    blurb:
      "데이터/리서치 비중이 높은 편. 심층 분석과 시장 구조 기사에 강점, 기관/전문가용 참고도 높음.",
  },
  {
    value: "decrypt",
    label: "Decrypt",
    blurb: "기술 이해도를 높이는 설명형 + 대중형 뉴스 성격. 초반 브리핑/트렌드 파악에 유리.",
  },
  {
    value: "cointelegraph",
    label: "CoinTelegraph",
    blurb:
      "카테고리 폭이 넓고 속보성 높음. 양질 콘텐츠도 많지만, 이슈 편집 방향이 플랫폼 성향 따라 들쭉날쭉할 수 있음.",
  },
  {
    value: "blockworks",
    label: "Blockworks",
    blurb:
      "시장·상품화·거버넌스·기관 투자자 관점 기사 강함. 리포트/팟캐스트/분석형 콘텐츠가 두드러짐.",
  },
] as const;

export const NEWS_PAGE_SIZE = 20;
export const NEWS_REFRESH_INTERVAL_MS = 300_000;
