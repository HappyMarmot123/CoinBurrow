import { describe, it, expect } from "vitest";
import { selectKimchiRows, KIMCHI_TOP_N } from "../src/features/kimchi/kimchiSort";
import type { KimchiRow } from "../src/stores/kimchi";

function row(base: string, vol: number, premium: number | null): KimchiRow {
  return {
    base,
    koreanName: base,
    upbitMarket: `KRW-${base}`,
    binanceSymbol: `${base}USDT`,
    accTradePrice24h: vol,
    upbitKrw: 100,
    binanceKrw: 100,
    premiumPercent: premium,
  };
}

describe("selectKimchiRows", () => {
  it("top mode orders by 24h volume desc (stable positions)", () => {
    const rows = [row("A", 10, 5), row("B", 30, 1), row("C", 20, 9)];
    const out = selectKimchiRows(rows, "top");
    expect(out.map((r) => r.base)).toEqual(["B", "C", "A"]);
  });

  it("premiumDesc orders the top set by premium descending", () => {
    const rows = [row("A", 10, 5), row("B", 30, 1), row("C", 20, 9)];
    const out = selectKimchiRows(rows, "premiumDesc");
    expect(out.map((r) => r.base)).toEqual(["C", "A", "B"]);
  });

  it("premiumAsc orders the top set by premium ascending", () => {
    const rows = [row("A", 10, 5), row("B", 30, 1), row("C", 20, 9)];
    const out = selectKimchiRows(rows, "premiumAsc");
    expect(out.map((r) => r.base)).toEqual(["B", "A", "C"]);
  });

  it("keeps null premium rows last in both premium directions", () => {
    const rows = [row("A", 10, 5), row("B", 30, null), row("C", 20, -2)];
    expect(selectKimchiRows(rows, "premiumDesc").map((r) => r.base)).toEqual(["A", "C", "B"]);
    expect(selectKimchiRows(rows, "premiumAsc").map((r) => r.base)).toEqual(["C", "A", "B"]);
  });

  it("caps the working set to the top 20 by volume before sorting", () => {
    // 25 rows with descending volume 25..1; premium ascending so the lowest-volume
    // rows would sort first under premiumAsc IF they were not trimmed.
    const rows = Array.from({ length: 25 }, (_, i) => row(`C${i}`, 25 - i, i));
    const out = selectKimchiRows(rows, "premiumAsc");
    expect(out).toHaveLength(KIMCHI_TOP_N);
    // The 5 lowest-volume rows (C20..C24) are trimmed out entirely.
    expect(out.some((r) => r.base === "C24")).toBe(false);
    // Lowest premium among the kept top-20 is C0 (premium 0), highest is C19.
    expect(out[0].base).toBe("C0");
    expect(out[out.length - 1].base).toBe("C19");
  });
});
