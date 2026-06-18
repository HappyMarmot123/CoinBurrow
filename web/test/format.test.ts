import { describe, expect, it } from "vitest";
import {
  formatCompact,
  formatNumber,
  formatPrice,
  formatRate,
  formatRatio,
  formatTime,
} from "../src/utils/format";

describe("format utilities", () => {
  it("formats KRW-like prices with rounded group separators", () => {
    expect(formatPrice(1234.56)).toBe("1,235");
    expect(formatPrice()).toBe("-");
  });

  it("formats compact market values using existing suffixes", () => {
    expect(formatCompact(1_500)).toBe("1.5K");
    expect(formatCompact(2_000_000)).toBe("2.0M");
    expect(formatCompact(3_000_000_000)).toBe("3.0B");
    expect(formatCompact(4_000_000_000_000)).toBe("4.0T");
  });

  it("formats rates and ratios with current signs and precision", () => {
    expect(formatRate(0.0123)).toBe("1.23%");
    expect(formatRatio(0.4567)).toBe("+0.457%");
    expect(formatRatio(-0.4567)).toBe("-0.457%");
    expect(formatRatio()).toBe("-");
  });

  it("formats plain numbers and timestamps", () => {
    expect(formatNumber(1234.56789)).toBe("1,234.5679");
    expect(formatTime(new Date("2026-06-18T09:10:11+09:00").getTime())).toMatch(
      /09.*10.*11|오전.*9.*10.*11/,
    );
  });
});
