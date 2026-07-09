import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readSource(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8").replace(/\r\n/g, "\n");
}

function cssBlocks(source: string, selector: string): string[] {
  return [...source.matchAll(/(?<selectors>[^{}]+)\{(?<body>[^}]*)\}/g)]
    .filter((match) => (match.groups?.selectors ?? "")
      .split(",")
      .map((item) => item.trim())
      .includes(selector))
    .map((match) => match.groups?.body ?? "");
}

function hasDeclaration(source: string, selector: string, declaration: string): boolean {
  return cssBlocks(source, selector).some((block) => block.includes(declaration));
}

describe("responsive layout source contracts", () => {
  it("keeps exchange responsive changes scoped away from reverted risky patterns", () => {
    const source = readSource("src/features/exchange/ExchangePage.vue");
    expect(hasDeclaration(source, ".exchange-layout", "grid-template-columns: minmax(0, 1fr) minmax(260px, 320px);")).toBe(true);
    expect(hasDeclaration(source, ".chart-sub", "white-space: normal;")).toBe(true);
    expect(hasDeclaration(source, ".chart-panel-head__main", "flex-wrap: wrap;")).toBe(true);
    expect(hasDeclaration(source, ".timeframe-tabs button", "min-height: 38px;")).toBe(true);
    expect(source).not.toContain("grid-template-columns: repeat(2, minmax(0, 1fr));");
    expect(source).not.toContain("order: -1;");
    expect(source).not.toContain("max-height: min(52dvh, 460px);");
    expect(source).not.toContain("width: min(370px, calc(100% - 20px));");
  });

  it("keeps coin list mobile row placement explicit without clipping financial values", () => {
    const source = readSource("src/features/exchange/CoinList.vue");
    const coinPriceVolumeBlocks = cssBlocks(source, ".coin-price__volume");

    expect(hasDeclaration(source, ".coin-row", "grid-template-areas: \"main price change\";")).toBe(true);
    expect(source).toContain("\"main change\"");
    expect(source).toContain("\"price change\"");
    expect(hasDeclaration(source, ".coin-main", "grid-area: main;")).toBe(true);
    expect(hasDeclaration(source, ".coin-price", "grid-area: price;")).toBe(true);
    expect(hasDeclaration(source, ".coin-change", "grid-area: change;")).toBe(true);
    expect(source).toContain("coin-price__volume");
    expect(source).not.toContain(".coin-price small");
    expect(coinPriceVolumeBlocks.some((block) => block.includes("overflow: hidden;"))).toBe(false);
    expect(coinPriceVolumeBlocks.some((block) => block.includes("text-overflow: ellipsis;"))).toBe(false);
    expect(coinPriceVolumeBlocks.some((block) => block.includes("white-space: nowrap;"))).toBe(false);
  });
});
