import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import LandingPage from "../src/features/landing/LandingPage.vue";

describe("LandingPage", () => {
  it("renders the restored Next landing sections and Spline scene", () => {
    const wrapper = mount(LandingPage, {
      global: { stubs: { "router-link": { template: "<a><slot /></a>" }, SplineScene: true } },
    });

    expect(wrapper.text()).toContain("Invest Like It’s Real");
    expect(wrapper.text()).toContain("But Risk-Free!");
    expect(wrapper.text()).toContain("CoinBurrow, 투자를 게임처럼 즐기는 새로운 방법");
    expect(wrapper.text()).toContain("당신만을 위한 AI 투자 코치, CoinBurrow");
    expect(wrapper.text()).toContain("Vue 3, Vite, Fastify");
    expect(wrapper.text()).toContain("아직도 망설이고 계신가요?");
    expect(wrapper.text()).toContain("Key Features");
    expect(wrapper.text()).toContain("Get Started");
    expect(wrapper.find("spline-scene-stub").exists()).toBe(true);
    expect(wrapper.find("spline-scene-stub").attributes("scene")).toBe(
      "https://prod.spline.design/54XoC-XFGmLSkJ1e/scene.splinecode",
    );
  });

  it("restores the legacy hero star and noise visual layers", () => {
    const wrapper = mount(LandingPage, {
      global: { stubs: { "router-link": { template: "<a><slot /></a>" }, SplineScene: true } },
    });
    const source = readFileSync(join(process.cwd(), "src/features/landing/LandingPage.vue"), "utf8");
    const legacyStyles = readFileSync(join(process.cwd(), "src/features/landing/legacyHeroStars.css"), "utf8");
    const noiseImage = join(process.cwd(), "public/noise.webp");

    expect(wrapper.find("#noise").exists()).toBe(true);
    expect(wrapper.find(".stars").exists()).toBe(true);
    expect(wrapper.find(".stars1").exists()).toBe(true);
    expect(wrapper.find(".stars2").exists()).toBe(true);
    expect(wrapper.find(".shooting_stars").exists()).toBe(true);
    expect(source).toContain('url("/noise.webp")');
    expect(legacyStyles).toContain("@keyframes animShootingStar");
    expect(legacyStyles).toContain("box-shadow: 718px 1689px #fff");
    expect(existsSync(noiseImage)).toBe(true);
  });
});
