import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import KimchiTable from "../src/features/kimchi/KimchiTable.vue";
import type { KimchiRow } from "../src/stores/kimchi";

const rows: KimchiRow[] = [
  { base: "BTC", koreanName: "비트코인", upbitMarket: "KRW-BTC", binanceSymbol: "BTCUSDT", accTradePrice24h: 100, upbitKrw: 138_500_000, binanceKrw: 138_000_000, premiumPercent: 0.36 },
  { base: "ETH", koreanName: "이더리움", upbitMarket: "KRW-ETH", binanceSymbol: "ETHUSDT", accTradePrice24h: 300, upbitKrw: 5_000_000, binanceKrw: 4_900_000, premiumPercent: 2.04 },
];

describe("KimchiTable", () => {
  it("renders one row per item in the given order (presentational)", () => {
    const wrapper = mount(KimchiTable, { props: { rows } });
    const bodyRows = wrapper.findAll("tbody tr");
    expect(bodyRows).toHaveLength(2);
    // 표는 정렬하지 않고 받은 순서를 그대로 렌더 (정렬은 KimchiView 필터가 담당).
    expect(bodyRows[0].text()).toContain("비트코인");
    expect(bodyRows[1].text()).toContain("이더리움");
  });

  it("renders dash when premium is null", () => {
    const wrapper = mount(KimchiTable, {
      props: { rows: [{ ...rows[0], premiumPercent: null, binanceKrw: null }] },
    });
    expect(wrapper.find("tbody tr").text()).toContain("—");
  });
});
