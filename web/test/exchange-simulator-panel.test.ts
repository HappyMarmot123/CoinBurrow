import { mount } from "@vue/test-utils";
import { shallowRef } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ExchangeSimulatorPanel from "../src/features/simulator/ExchangeSimulatorPanel.vue";

const mocks = vi.hoisted(() => ({
  placeOrder: vi.fn(async () => true),
  signInWithGoogle: vi.fn(),
  session: undefined as unknown as { value: unknown },
}));

vi.mock("../src/composables/useSimulatorAccount.js", () => ({
  useSimulatorAccount: () => ({
    session: mocks.session,
    initialized: shallowRef(true),
    authLoading: shallowRef(false),
    authError: shallowRef(""),
    googleProviderEnabled: shallowRef(true),
    state: shallowRef({
      account: {
        startingCash: 100_000_000,
        cashBalance: 80_000_000,
        investedValue: 20_000_000,
        totalAsset: 100_000_000,
        totalProfit: 0,
        returnRate: 0,
      },
      positions: [{
        symbol: "ETH",
        quantity: 1.25,
        avgPrice: 4_800_000,
        currentPrice: 5_000_000,
        marketValue: 6_250_000,
        profit: 250_000,
        returnRate: 4.17,
      }],
      purchasedSymbols: ["ETH"],
      quotes: [
        { symbol: "BTC", price: 100_000_000, changeRate: 0.01 },
        { symbol: "ETH", price: 5_000_000, changeRate: -0.01 },
      ],
      asOf: 1_700_000_000_000,
    }),
    simulatorLoading: shallowRef(false),
    submitting: shallowRef(false),
    simulatorError: shallowRef(""),
    notice: shallowRef(""),
    isConfigured: true,
    signInWithGoogle: mocks.signInWithGoogle,
    reload: vi.fn(),
    placeOrder: mocks.placeOrder,
  }),
}));

function mountPanel(market: string) {
  return mount(ExchangeSimulatorPanel, {
    props: {
      market,
      marketPrice: market === "KRW-ETH" ? 5_100_000 : 100_000_000,
      marketChangeRate: 0.02,
    },
    global: {
      stubs: {
        "router-link": {
          props: ["to"],
          template: '<a :href="to"><slot /></a>',
        },
      },
    },
  });
}

describe("ExchangeSimulatorPanel", () => {
  beforeEach(() => {
    mocks.placeOrder.mockClear();
    mocks.signInWithGoogle.mockClear();
    mocks.session = shallowRef({ access_token: "test-token" });
  });

  it("submits the market selected in the exchange", async () => {
    const wrapper = mountPanel("KRW-BTC");

    expect(wrapper.get(".selected-asset").text()).toContain("BTC · 비트코인");
    expect(wrapper.find(".exchange-simulator__account").exists()).toBe(false);
    expect(wrapper.find(".exchange-simulator__asset").exists()).toBe(false);
    expect(wrapper.find('a[href="/mypage"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain("실제 자산이 아닌 모의 계좌로 체결됩니다.");
    expect(wrapper.get(".account-total").text()).toContain("100,000,000원");
    expect(wrapper.get(".order-availability").text()).toContain("80,000,000원");
    await wrapper.get('input[name="order-quantity"]').setValue("0.1");
    await wrapper.get(".submit-order").trigger("click");

    expect(mocks.placeOrder).toHaveBeenCalledWith({
      symbol: "BTC",
      side: "buy",
      quantity: 0.1,
    });
  });

  it("blocks another buy for a purchased symbol while keeping sell available", async () => {
    const wrapper = mountPanel("KRW-ETH");

    expect(wrapper.get(".order-limit").text()).toContain("종목별로 한 번만 매수");
    expect(wrapper.get(".submit-order").text()).toBe("ETH 매수 완료");
    expect(wrapper.get(".submit-order").attributes("disabled")).toBeDefined();

    await wrapper.findAll(".side-tabs button")[1].trigger("click");
    expect(wrapper.find(".order-limit").exists()).toBe(false);
    expect(wrapper.get(".order-availability").text()).toContain("1.25 ETH");
    await wrapper.get('input[name="order-quantity"]').setValue("1");
    await wrapper.get(".submit-order").trigger("click");

    expect(mocks.placeOrder).toHaveBeenCalledWith({
      symbol: "ETH",
      side: "sell",
      quantity: 1,
    });
  });

  it("explains the BTC and ETH limit for an unsupported market", () => {
    const wrapper = mountPanel("KRW-XRP");

    expect(wrapper.text()).toContain("이 종목은 아직 모의 주문을 지원하지 않습니다.");
    expect(wrapper.text()).toContain("KRW-BTC와 KRW-ETH");
    expect(wrapper.find(".order-panel").exists()).toBe(false);
  });

  it("keeps a concise symbol title and login action when signed out", async () => {
    mocks.session = shallowRef(null);
    const wrapper = mountPanel("KRW-BTC");

    expect(wrapper.get(".exchange-simulator__login-copy strong").text()).toBe("BTC 주문을 시작하세요.");
    expect(wrapper.get(".exchange-simulator__login-copy").text()).toContain("1억원의 포인트");
    expect(wrapper.find(".exchange-simulator__login-market").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("선택 종목");
    expect(wrapper.text()).not.toContain("현재 시장가");
    expect(wrapper.find(".order-panel").exists()).toBe(false);

    const loginButton = wrapper.get(".exchange-simulator__login-button");
    expect(loginButton.text()).toBe("Google 로그인");
    await loginButton.trigger("click");
    expect(mocks.signInWithGoogle).toHaveBeenCalledOnce();
  });
});
