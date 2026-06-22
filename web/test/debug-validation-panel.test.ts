import { describe, expect, it, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import DebugValidationPanel from "../src/components/DebugValidationPanel.vue";
import { useValidationHealthStore } from "../src/stores/validation-health";

beforeEach(() => setActivePinia(createPinia()));

describe("DebugValidationPanel", () => {
  it("renders current validation health metrics", () => {
    const store = useValidationHealthStore();

    store.recordConnectionStatus(true);
    store.recordError({
      source: "websocket",
      code: "SCHEMA_MISMATCH",
      message: "bad payload",
      retryable: true,
      path: "trade_price",
    });

    const wrapper = mount(DebugValidationPanel);

    expect(wrapper.text()).toContain("Validation");
    expect(wrapper.text()).toContain("Stale");
    expect(wrapper.text()).toContain("SCHEMA_MISMATCH");
    expect(wrapper.text()).toContain("trade_price");
  });
});
