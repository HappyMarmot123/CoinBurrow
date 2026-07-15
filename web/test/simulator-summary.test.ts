import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import SimulatorSummary from "../src/features/simulator/SimulatorSummary.vue";

describe("SimulatorSummary", () => {
  it("renders one integrated profit instead of separate realized values", () => {
    const wrapper = mount(SimulatorSummary, {
      props: {
        account: {
          startingCash: 100_000_000,
          cashBalance: 70_000_000,
          investedValue: 28_000_000,
          totalAsset: 98_000_000,
          totalProfit: -2_000_000,
          returnRate: -2,
        },
      },
    });

    expect(wrapper.text()).toContain("통합 손익");
    expect(wrapper.text()).toContain("-2,000,000원");
    expect(wrapper.text()).toContain("-2.00%");
    expect(wrapper.text()).not.toContain("실현 손익");
    expect(wrapper.text()).not.toContain("미실현 손익");
  });
});

