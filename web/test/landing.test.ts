import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import LandingPage from "../src/features/landing/LandingPage.vue";

describe("LandingPage", () => {
  it("renders headline, exchange CTA, and Spline scene", () => {
    const wrapper = mount(LandingPage, {
      global: { stubs: { "router-link": { template: "<a><slot /></a>" }, SplineScene: true } },
    });

    expect(wrapper.text()).toContain("CoinBurrow");
    expect(wrapper.text()).toContain("거래소");
    expect(wrapper.find("spline-scene-stub").exists()).toBe(true);
  });
});
