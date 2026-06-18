import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import LandingPage from "../src/features/landing/LandingPage.vue";

describe("smoke", () => {
  it("renders landing heading", () => {
    const wrapper = mount(LandingPage, { global: { stubs: { "router-link": true } } });
    expect(wrapper.text()).toContain("CoinBurrow");
  });
});
