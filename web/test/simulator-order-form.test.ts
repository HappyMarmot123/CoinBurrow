import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import SimulatorOrderForm from "../src/features/simulator/SimulatorOrderForm.vue";

const quotes = [
  { symbol: "BTC" as const, price: 100_000_000, changeRate: 0.01 },
  { symbol: "ETH" as const, price: 5_000_000, changeRate: -0.02 },
];

describe("SimulatorOrderForm", () => {
  it("emits a normalized market buy order", async () => {
    const wrapper = mount(SimulatorOrderForm, {
      props: {
        quotes,
        positions: [],
        cashBalance: 100_000_000,
        submitting: false,
      },
    });

    await wrapper.get('input[name="order-quantity"]').setValue("0.01");
    await wrapper.get(".submit-order").trigger("click");

    expect(wrapper.emitted("submit")?.[0]).toEqual([{
      symbol: "BTC",
      side: "buy",
      quantity: 0.01,
    }]);
  });

  it("shows price, quantity, and total as three linked order fields", async () => {
    const wrapper = mount(SimulatorOrderForm, {
      props: {
        quotes,
        positions: [],
        cashBalance: 100_000_000,
        submitting: false,
      },
    });

    expect(wrapper.findAll(".order-fields .field__label").map((field) => field.text())).toEqual([
      "매수가격",
      "주문수량",
      "주문총액",
    ]);
    expect((wrapper.get('input[name="order-price"]').element as HTMLInputElement).value).toBe("100,000,000");
    expect(wrapper.get('input[name="order-price"]').attributes("readonly")).toBeDefined();
    expect(wrapper.get('input[name="order-total"]').attributes("readonly")).toBeUndefined();

    const accountSummary = wrapper.get(".account-summary");
    expect(accountSummary.attributes("aria-label")).toBe("계좌 및 시장 정보");
    expect(wrapper.get(".account-total").element.parentElement).toBe(accountSummary.element);
    expect(wrapper.get(".account-summary__selector").element.parentElement).toBe(accountSummary.element);
    expect(wrapper.get(".quote-row").element.parentElement).toBe(accountSummary.element);
    expect(wrapper.get(".order-availability").element.parentElement).toBe(accountSummary.element);

    await wrapper.get('input[name="order-quantity"]').setValue("0.1");
    expect((wrapper.get('input[name="order-total"]').element as HTMLInputElement).value).toBe("10000000");

    await wrapper.get('input[name="order-total"]').setValue("25000000");
    expect((wrapper.get('input[name="order-quantity"]').element as HTMLInputElement).value).toBe("0.25");

    await wrapper.get(".submit-order").trigger("click");
    expect(wrapper.emitted("submit")?.[0]).toEqual([{
      symbol: "BTC",
      side: "buy",
      quantity: 0.25,
    }]);

    await wrapper.setProps({
      quotes: [
        { symbol: "BTC", price: 50_000_000, changeRate: 0.01 },
        quotes[1],
      ],
    });
    expect((wrapper.get('input[name="order-total"]').element as HTMLInputElement).value).toBe("25000000");
    expect((wrapper.get('input[name="order-quantity"]').element as HTMLInputElement).value).toBe("0.5");
  });

  it("uses custom row steppers and limits numeric input to non-negative 0.01 units", async () => {
    const wrapper = mount(SimulatorOrderForm, {
      props: {
        quotes,
        positions: [],
        cashBalance: 100_000_000,
        submitting: false,
      },
    });

    const quantityStepper = wrapper.get('[aria-label="주문수량 조절"]');
    const totalStepper = wrapper.get('[aria-label="주문총액 조절"]');
    expect(quantityStepper.findAll("button").map((button) => button.text())).toEqual(["-", "+"]);
    expect(totalStepper.findAll("button").map((button) => button.text())).toEqual(["-", "+"]);
    expect(wrapper.get('input[name="order-quantity"]').attributes("type")).toBe("text");
    expect(wrapper.get('input[name="order-total"]').attributes("type")).toBe("text");

    await quantityStepper.findAll("button")[1].trigger("click");
    expect((wrapper.get('input[name="order-quantity"]').element as HTMLInputElement).value).toBe("0.01");
    expect((wrapper.get('input[name="order-total"]').element as HTMLInputElement).value).toBe("1000000");

    await quantityStepper.findAll("button")[1].trigger("click");
    await quantityStepper.findAll("button")[0].trigger("click");
    expect((wrapper.get('input[name="order-quantity"]').element as HTMLInputElement).value).toBe("0.01");

    await wrapper.get('input[name="order-quantity"]').setValue("-1");
    expect((wrapper.get('input[name="order-quantity"]').element as HTMLInputElement).value).toBe("0");
    expect((wrapper.get('input[name="order-total"]').element as HTMLInputElement).value).toBe("");

    await wrapper.get('input[name="order-quantity"]').setValue("0.019");
    expect((wrapper.get('input[name="order-quantity"]').element as HTMLInputElement).value).toBe("0.01");

    await wrapper.get('input[name="order-total"]').setValue("123.456");
    expect((wrapper.get('input[name="order-total"]').element as HTMLInputElement).value).toBe("123.45");
    await wrapper.get('input[name="order-total"]').setValue("-1");
    expect((wrapper.get('input[name="order-total"]').element as HTMLInputElement).value).toBe("0");
  });

  it("uses preset ratios and replaces them with a direct ratio slider", async () => {
    const wrapper = mount(SimulatorOrderForm, {
      props: {
        quotes,
        positions: [],
        cashBalance: 100_000_000,
        submitting: false,
      },
    });

    expect(wrapper.findAll(".ratio-buttons button").map((button) => button.text())).toEqual([
      "10%",
      "25%",
      "50%",
      "100%",
      "직접입력",
    ]);

    await wrapper.findAll(".ratio-buttons button")[0].trigger("click");
    expect((wrapper.get('input[name="order-quantity"]').element as HTMLInputElement).value).toBe("0.1");

    await wrapper.get(".ratio-buttons__direct").trigger("click");
    expect(wrapper.find(".ratio-buttons").exists()).toBe(false);
    expect((wrapper.get('input[type="range"]').element as HTMLInputElement).value).toBe("10");

    await wrapper.get('input[type="range"]').setValue("50");
    expect((wrapper.get('input[name="order-quantity"]').element as HTMLInputElement).value).toBe("0.5");
    expect((wrapper.get('input[name="order-total"]').element as HTMLInputElement).value).toBe("50000000");
    expect(wrapper.get(".direct-ratio__head").text()).toContain("50%");

    await wrapper.get(".direct-ratio__head button").trigger("click");
    expect(wrapper.find(".ratio-buttons").exists()).toBe(true);
    expect(wrapper.find('input[type="range"]').exists()).toBe(false);
  });

  it("prevents a buy above the available cash", async () => {
    const wrapper = mount(SimulatorOrderForm, {
      props: {
        quotes,
        positions: [],
        cashBalance: 500_000,
        submitting: false,
      },
    });

    await wrapper.get('input[name="order-quantity"]').setValue("0.01");

    expect(wrapper.get(".submit-order").attributes("disabled")).toBeDefined();
    expect(wrapper.emitted("submit")).toBeUndefined();
  });

  it("allows one buy per symbol until the account is reset", async () => {
    const wrapper = mount(SimulatorOrderForm, {
      props: {
        quotes,
        positions: [{
          symbol: "BTC",
          quantity: 0.1,
          avgPrice: 90_000_000,
          currentPrice: 100_000_000,
          marketValue: 10_000_000,
          profit: 1_000_000,
          returnRate: 11.11,
        }],
        purchasedSymbols: ["BTC"],
        cashBalance: 90_000_000,
        submitting: false,
      },
    });

    expect(wrapper.get(".order-limit").text()).toContain("계좌 초기화 전까지");
    expect(wrapper.get('input[name="order-quantity"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get(".submit-order").text()).toBe("BTC 매수 완료");

    await wrapper.findAll(".side-tabs button")[1].trigger("click");
    await wrapper.get('input[name="order-quantity"]').setValue("0.1");
    expect(wrapper.get(".submit-order").attributes("disabled")).toBeUndefined();

    await wrapper.findAll(".side-tabs button")[0].trigger("click");
    await wrapper.setProps({ purchasedSymbols: [] });
    await wrapper.get('input[name="order-quantity"]').setValue("0.01");
    expect(wrapper.find(".order-limit").exists()).toBe(false);
    expect(wrapper.get(".submit-order").attributes("disabled")).toBeUndefined();
  });

  it("limits a sell order to the held quantity", async () => {
    const wrapper = mount(SimulatorOrderForm, {
      props: {
        quotes,
        positions: [{
          symbol: "BTC",
          quantity: 0.1,
          avgPrice: 90_000_000,
          currentPrice: 100_000_000,
          marketValue: 10_000_000,
          profit: 1_000_000,
          returnRate: 11.11,
        }],
        cashBalance: 90_000_000,
        submitting: false,
      },
    });

    await wrapper.findAll(".side-tabs button")[1].trigger("click");
    expect(wrapper.findAll(".order-fields .field__label")[0].text()).toBe("매도가격");
    await wrapper.get('input[name="order-quantity"]').setValue("0.2");
    expect(wrapper.get(".submit-order").attributes("disabled")).toBeDefined();

    await wrapper.get('input[name="order-quantity"]').setValue("0.1");
    await wrapper.get(".submit-order").trigger("click");
    expect(wrapper.emitted("submit")?.[0]).toEqual([{
      symbol: "BTC",
      side: "sell",
      quantity: 0.1,
    }]);
  });

  it("uses the symbol selected by the exchange without showing another selector", async () => {
    const wrapper = mount(SimulatorOrderForm, {
      props: {
        quotes,
        positions: [],
        cashBalance: 100_000_000,
        submitting: false,
        selectedSymbol: "ETH",
        fixedSymbol: true,
      },
    });

    expect(wrapper.find("select").exists()).toBe(false);
    expect(wrapper.get(".selected-asset").text()).toContain("ETH · 이더리움");

    await wrapper.get('input[name="order-quantity"]').setValue("1");
    await wrapper.get(".submit-order").trigger("click");

    expect(wrapper.emitted("submit")?.[0]).toEqual([{
      symbol: "ETH",
      side: "buy",
      quantity: 1,
    }]);
  });
});
