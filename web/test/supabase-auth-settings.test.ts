import { describe, expect, it } from "vitest";

import { readAuthProviderEnabled } from "../src/lib/supabase.js";

describe("Supabase Auth settings", () => {
  it("reads an enabled or disabled external provider", () => {
    expect(readAuthProviderEnabled({ external: { google: true } }, "google")).toBe(true);
    expect(readAuthProviderEnabled({ external: { google: false } }, "google")).toBe(false);
  });

  it.each([
    null,
    {},
    { external: null },
    { external: { google: "false" } },
  ])("returns unknown for a malformed settings response", (settings) => {
    expect(readAuthProviderEnabled(settings, "google")).toBeNull();
  });
});
