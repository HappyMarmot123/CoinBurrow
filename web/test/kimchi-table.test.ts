import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import KimchiTable from "../src/features/kimchi/KimchiTable.vue";
import type { KimchiRow } from "../src/stores/kimchi";

const rows: KimchiRow[] = [
  { base: "BTC", koreanName: "비트코인", upbitMarket: "KRW-BTC", binanceSymbol: "BTCUSDT", accTradePrice24h: 100, upbitKrw: 138_500_000, binanceKrw: 138_000_000, premiumPercent: 0.36 },
  { base: "ETH", koreanName: "이더리움", upbitMarket: "KRW-ETH", binanceSymbol: "ETHUSDT", accTradePrice24h: 300, upbitKrw: 5_000_000, binanceKrw: 4_900_000, premiumPercent: 2.04 },
];

describe("KimchiTable", () => {
  it("renders one row per item, sorted by premium desc by default", () => {
    const wrapper = mount(KimchiTable, { props: { rows } });
    const bodyRows = wrapper.findAll("tbody tr");
    expect(bodyRows).toHaveLength(2);
    // 기본 정렬: premium 내림차순 → ETH(2.04) 먼저
    expect(bodyRows[0].text()).toContain("이더리움");
  });

  it("renders dash when premium is null", () => {
    const wrapper = mount(KimchiTable, {
      props: { rows: [{ ...rows[0], premiumPercent: null, binanceKrw: null }] },
    });
    expect(wrapper.find("tbody tr").text()).toContain("—");
  });

  it("toggleSort: clicking 24h 거래대금 header sorts desc then asc", async () => {
    const wrapper = mount(KimchiTable, { props: { rows } });
    const th = wrapper.findAll("th").find((h) => h.text().includes("24h 거래대금"))!;
    // First click: sort accTradePrice24h descending → ETH (300) first
    await th.trigger("click");
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll("tbody tr")[0].text()).toContain("이더리움");
    // Second click: toggle to ascending → BTC (100) first
    await th.trigger("click");
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll("tbody tr")[0].text()).toContain("비트코인");
  });
});
