import { mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { nextTick } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CandleChart from "../src/features/exchange/CandleChartV2.vue";

const mocks = vi.hoisted(() => {
  const CandlestickSeries = { type: "candlestick" };
  const HistogramSeries = { type: "histogram" };
  const buyPriceLine = {
    applyOptions: vi.fn(),
    options: vi.fn(),
  };
  const candleSeries = {
    setData: vi.fn(),
    update: vi.fn(),
    createPriceLine: vi.fn(() => buyPriceLine),
    removePriceLine: vi.fn(),
  };
  const volumePriceScale = { applyOptions: vi.fn() };
  const volumeSeries = {
    setData: vi.fn(),
    update: vi.fn(),
    priceScale: vi.fn(() => volumePriceScale),
  };
  const timeScale = {
    fitContent: vi.fn(),
  };
  const panes = [
    { setStretchFactor: vi.fn() },
    { setStretchFactor: vi.fn() },
  ];
  const chartApi = {
    addSeries: vi.fn((series: unknown) => (
      series === CandlestickSeries ? candleSeries : volumeSeries
    )),
    applyOptions: vi.fn(),
    panes: vi.fn(() => panes),
    remove: vi.fn(),
    resize: vi.fn(),
    timeScale: vi.fn(() => timeScale),
  };

  return {
    CandlestickSeries,
    HistogramSeries,
    LineStyle: { Dashed: 2 },
    buyPriceLine,
    candleSeries,
    chartApi,
    createChart: vi.fn(() => chartApi),
  };
});

vi.mock("lightweight-charts", () => ({
  CandlestickSeries: mocks.CandlestickSeries,
  HistogramSeries: mocks.HistogramSeries,
  LineStyle: mocks.LineStyle,
  createChart: mocks.createChart,
}));

describe("CandleChart buy price line", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates, updates, removes, and recreates the buy price label", async () => {
    const wrapper = mount(CandleChart, {
      props: {
        market: "KRW-BTC",
        buyPrice: 95_000_000,
      },
      global: {
        plugins: [createPinia()],
      },
    });
    await nextTick();

    expect(mocks.candleSeries.createPriceLine).toHaveBeenCalledWith(expect.objectContaining({
      price: 95_000_000,
      color: "#d9ff66",
      lineStyle: mocks.LineStyle.Dashed,
      lineVisible: true,
      axisLabelVisible: true,
      title: "매수가",
    }));

    await wrapper.setProps({ buyPrice: 97_500_000 });
    expect(mocks.buyPriceLine.applyOptions).toHaveBeenLastCalledWith(expect.objectContaining({
      price: 97_500_000,
      title: "매수가",
    }));

    await wrapper.setProps({ buyPrice: undefined });
    expect(mocks.candleSeries.removePriceLine).toHaveBeenCalledWith(mocks.buyPriceLine);

    await wrapper.setProps({ buyPrice: 99_000_000 });
    expect(mocks.candleSeries.createPriceLine).toHaveBeenCalledTimes(2);

    wrapper.unmount();
    expect(mocks.chartApi.remove).toHaveBeenCalledOnce();
  });
});
