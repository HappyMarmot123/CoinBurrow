import type { KimchiRow } from "../../stores/kimchi.js";

export type KimchiSortMode = "top" | "premiumDesc" | "premiumAsc";

export const KIMCHI_TOP_N = 20;

export interface KimchiSortOption {
  value: KimchiSortMode;
  label: string;
}

export const KIMCHI_SORT_OPTIONS: readonly KimchiSortOption[] = [
  { value: "top", label: "종목 TOP 20" },
  { value: "premiumDesc", label: "김프 높은순" },
  { value: "premiumAsc", label: "김프 낮은순" },
];

// 작업 집합은 항상 "24h 거래대금 상위 20종목"으로 고정한다.
// accTradePrice24h는 universe 로드 시 1회 정해지는 값이라 자리가 흔들리지 않는다.
function topByVolume(rows: KimchiRow[]): KimchiRow[] {
  return [...rows]
    .sort((a, b) => b.accTradePrice24h - a.accTradePrice24h)
    .slice(0, KIMCHI_TOP_N);
}

// 정렬 모드를 상위 20종목에 적용한다.
// - top: 거래대금 내림차순(고정 순서)
// - premiumDesc/premiumAsc: 실시간 김프% 기준(매 틱 순서 변동). null 김프는 항상 맨 뒤.
export function selectKimchiRows(rows: KimchiRow[], mode: KimchiSortMode): KimchiRow[] {
  const top = topByVolume(rows);
  if (mode === "top") return top;

  return [...top].sort((a, b) => {
    const an = a.premiumPercent;
    const bn = b.premiumPercent;
    if (an === null && bn === null) return 0;
    if (an === null) return 1;
    if (bn === null) return -1;
    return mode === "premiumDesc" ? bn - an : an - bn;
  });
}
