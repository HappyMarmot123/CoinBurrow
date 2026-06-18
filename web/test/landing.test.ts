import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import LandingPage from "../src/features/landing/LandingPage.vue";

describe("LandingPage", () => {
  it("presents CoinBurrow as a real-time crypto dashboard", () => {
    const wrapper = mount(LandingPage, {
      global: { stubs: { "router-link": { template: "<a><slot /></a>" }, SplineScene: true } },
    });
    const text = wrapper.text();
    const source = readFileSync(join(process.cwd(), "src/features/landing/LandingPage.vue"), "utf8");

    expect(wrapper.find("h1").text()).toBe("CoinBurrow");
    expect(text).toContain("Realtime Market Dashboard");
    expect(text).toContain("Upbit 공개 시세, 캔들, 호가, 체결 흐름을 한 화면에서 모니터링합니다.");
    expect(text).toContain("대시보드 열기");
    expect(text).toContain("Live Market Signals");
    expect(text).toContain("캔들 차트");
    expect(text).toContain("호가");
    expect(text).toContain("체결");
    expect(text).toContain("Web Worker");
    expect(text).toContain("No Account, No Keys");
    expect(wrapper.find(".market-strip").exists()).toBe(false);
    expect(wrapper.find(".hero-visual spline-scene-stub").exists()).toBe(true);
    expect(wrapper.find(".hero-visual spline-scene-stub.spline-layer").exists()).toBe(true);
    expect(wrapper.find(".hero-visual + .hero-copy").exists()).toBe(true);
    expect(source).toContain(".hero-section {\n  position: relative;");
    expect(source).toContain("min-height: 100svh;");
    expect(source).toContain(".hero-copy {\n  position: absolute;");
    expect(source).toContain("top: 50%;");
    expect(source).toContain("left: 50%;");
    expect(source).toContain("transform: translate(-50%, -50%);");
    expect(source).toContain("row-gap: clamp(28px, 4vh, 44px);");
    expect(source).toContain("h1 {\n  margin: 0;");
    expect(source).toContain("gap: clamp(16px, 2vh, 22px);");
    expect(source).toContain("margin-bottom: 0;");
    expect(source).toContain(".hero-visual {\n  position: absolute;");
    expect(source).toContain("top: 10rem;");
    expect(source).toContain('class="spline-layer"');
    expect(source).toContain(".spline-layer,\n.hero-visual :deep(.spline-canvas) {\n  position: absolute;");
    expect(source).toContain("height: 230%;");
    expect(source).not.toContain("top: -42%;");
    expect(source).not.toContain("height: 160%;");
    expect(source).not.toContain("inset: -12% 0 -6%;");
    expect(source).not.toContain("bottom: clamp(12px, 3vh, 32px);");
    expect(source).toContain("overflow: visible;");
    expect(source).not.toContain("mask-image: linear-gradient");
    expect(text).not.toContain("게임");
    expect(text).not.toContain("AI 코치");
    expect(text).not.toContain("가상 포인트");
    expect(text).not.toContain("랭킹");
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

  it("keeps the desktop hero as the source of truth while tuning responsive breakpoints", () => {
    const source = readFileSync(join(process.cwd(), "src/features/landing/LandingPage.vue"), "utf8");

    expect(source).toContain("@media (max-width: 900px)");
    expect(source).toContain("padding: clamp(48px, 8svh, 72px) 20px clamp(36px, 7svh, 56px);");
    expect(source).toContain("font-size: clamp(68px, 15vw, 124px);");
    expect(source).toContain("top: clamp(5.5rem, 13svh, 8rem);");
    expect(source).toContain("width: min(760px, 116vw);");
    expect(source).toContain("width: min(960px, calc(100% - 32px));");
    expect(source).toContain("@media (max-width: 760px)");
    expect(source).toContain("width: min(100%, 240px);");
    expect(source).toContain("@media (max-width: 640px)");
    expect(source).toContain("font-size: clamp(48px, 15.5vw, 76px);");
    expect(source).toContain("top: clamp(4rem, 10svh, 5.5rem);");
    expect(source).toContain("width: min(132vw, 560px);");
  });
});
