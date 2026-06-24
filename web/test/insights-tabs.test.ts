import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createRouter, createWebHistory } from "vue-router";
import InsightsTabs from "../src/features/insights/InsightsTabs.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/insights/global", component: { template: "<div/>" } },
    { path: "/insights/sentiment", component: { template: "<div/>" } },
    { path: "/insights/kimchi", component: { template: "<div/>" } },
  ],
});

const tabs = [
  { key: "global", label: "글로벌 시총", to: "/insights/global" },
  { key: "sentiment", label: "시장심리", to: "/insights/sentiment", degraded: true },
  { key: "kimchi", label: "김치프리미엄", to: "/insights/kimchi" },
];

describe("InsightsTabs", () => {
  it("renders a tablist with one tab per item and marks the active tab", async () => {
    const wrapper = mount(InsightsTabs, {
      props: { tabs, activeKey: "global" },
      global: { plugins: [router] },
    });
    await router.isReady();

    expect(wrapper.find('[role="tablist"]').exists()).toBe(true);
    const tabEls = wrapper.findAll('[role="tab"]');
    expect(tabEls).toHaveLength(3);
    expect(tabEls[0].attributes("aria-selected")).toBe("true");
    expect(tabEls[1].attributes("aria-selected")).toBe("false");
    expect(tabEls[0].attributes("tabindex")).toBe("0");
    expect(tabEls[1].attributes("tabindex")).toBe("-1");
    expect(tabEls[0].text()).toContain("글로벌 시총");
  });

  it("renders a degraded indicator dot for degraded tabs", () => {
    const wrapper = mount(InsightsTabs, {
      props: { tabs, activeKey: "global" },
      global: { plugins: [router] },
    });
    expect(wrapper.find(".insights-tabs__dot").exists()).toBe(true);
  });
});
