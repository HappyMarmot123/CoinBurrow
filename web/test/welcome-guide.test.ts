import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";

import WelcomeGuide from "../src/features/simulator/WelcomeGuide.vue";

const guideSource = readFileSync(
  join(process.cwd(), "src/features/simulator/WelcomeGuide.vue"),
  "utf8",
).replace(/\r\n/g, "\n");

function mountGuide(props: { saving?: boolean; error?: string } = {}) {
  return mount(WelcomeGuide, {
    props: {
      displayName: "김코인",
      ...props,
    },
    global: {
      stubs: { Teleport: true },
    },
  });
}

afterEach(() => {
  document.body.style.overflow = "";
});

describe("WelcomeGuide", () => {
  it("walks through all three product-specific guide pages", async () => {
    const wrapper = mountGuide();

    expect(wrapper.get('[role="dialog"]').attributes("aria-modal")).toBe("true");
    expect(guideSource).toContain("place-items: center;");
    expect(guideSource).toContain("width: min(920px, 100%);");
    expect(guideSource).toContain("@media (max-width: 760px)");
    expect(guideSource).toContain("min-height: 100svh;");
    expect(wrapper.text()).toContain("김코인님, 모의 계좌가 준비됐어요");
    expect(wrapper.text()).toContain("100,000,000");
    expect(wrapper.findAll(".welcome-progress li")[0]?.classes()).toContain("is-current");

    await wrapper.get(".welcome-actions__next").trigger("click");
    expect(wrapper.text()).toContain("종목을 고르고 수량만 입력하세요");
    expect(wrapper.text()).toContain("모의 매수");
    expect(wrapper.findAll(".welcome-progress li")[1]?.attributes("aria-current")).toBe("step");

    await wrapper.get(".welcome-actions__next").trigger("click");
    expect(wrapper.text()).toContain("자산과 손익을 한곳에서 확인하세요");
    expect(wrapper.text()).toContain("통합 손익");
    expect(wrapper.get(".welcome-actions__next").text()).toBe("가이드 마치기");

    await wrapper.get(".welcome-actions__next").trigger("click");
    expect(wrapper.emitted("finish")).toHaveLength(1);
    wrapper.unmount();
  });

  it("supports back, skip, Escape, and saving feedback", async () => {
    const wrapper = mountGuide({ error: "저장하지 못했습니다." });

    await wrapper.get(".welcome-actions__next").trigger("click");
    await wrapper.get(".welcome-actions__back").trigger("click");
    expect(wrapper.text()).toContain("김코인님, 모의 계좌가 준비됐어요");
    expect(wrapper.get('[role="alert"]').text()).toContain("저장하지 못했습니다");

    await wrapper.get(".welcome-skip").trigger("click");
    await wrapper.get('[role="dialog"]').trigger("keydown", { key: "Escape" });
    expect(wrapper.emitted("finish")).toHaveLength(2);

    await wrapper.setProps({ saving: true });
    expect(wrapper.get(".welcome-skip").attributes()).toHaveProperty("disabled");
    expect(wrapper.get(".welcome-actions__next").text()).toBe("저장 중");
    wrapper.unmount();
  });
});
