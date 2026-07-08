import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import LandingPage from "../src/features/landing/LandingPage.vue";
import { router } from "../src/router/index";

describe("smoke", () => {
  it("renders landing heading", () => {
    const wrapper = mount(LandingPage, { global: { stubs: { "router-link": true } } });
    expect(wrapper.text()).toContain("CoinBurrow");
  });

  it("registers the insights route", () => {
    expect(router.hasRoute("insights")).toBe(true);
  });
});
