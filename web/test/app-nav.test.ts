import type { Session } from "@supabase/supabase-js";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AppNav from "../src/components/AppNav.vue";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("../src/lib/supabase.js", () => ({
  hasSupabaseConfiguration: () => true,
  getSupabaseAuthProviderStatus: async () => true,
  getSupabaseClient: () => ({
    auth: {
      getSession: mocks.getSession,
      signInWithOAuth: mocks.signInWithOAuth,
      signOut: mocks.signOut,
      updateUser: vi.fn(),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  }),
}));

const signedInSession = {
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: {
    id: "11111111-1111-4111-8111-111111111111",
    aud: "authenticated",
    role: "authenticated",
    email: "tester@example.com",
    created_at: "2026-07-15T00:00:00.000Z",
    app_metadata: { provider: "google" },
    user_metadata: {
      full_name: "테스터",
      coinburrow_welcome_guide: "completed",
    },
  },
} as Session;

function mountNav() {
  return mount(AppNav, {
    global: {
      plugins: [createPinia()],
      stubs: {
        "router-link": {
          props: ["to"],
          template: '<a :href="to"><slot /></a>',
        },
      },
    },
  });
}

describe("AppNav authentication action", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    mocks.getSession.mockReset().mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mocks.signInWithOAuth.mockReset().mockResolvedValue({ error: null });
    mocks.signOut.mockReset().mockResolvedValue({ error: null });
  });

  it("always exposes login when no session exists", async () => {
    window.history.replaceState({}, "", "/insights?section=kimchi");
    const wrapper = mountNav();
    await flushPromises();

    const authButton = wrapper.get(".app-nav__auth");
    expect(authButton.text()).toBe("로그인");
    expect(authButton.attributes("aria-label")).toBe("Google 계정으로 로그인");
    expect(authButton.attributes("disabled")).toBeUndefined();

    await authButton.trigger("click");
    await flushPromises();
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/insights?section=kimchi`,
      },
    });
  });

  it("switches the same action to logout for an authenticated session", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: signedInSession },
      error: null,
    });
    const wrapper = mountNav();
    await flushPromises();

    const authButton = wrapper.get(".app-nav__auth");
    expect(authButton.text()).toBe("로그아웃");
    expect(authButton.attributes("aria-label")).toBe("테스터 계정에서 로그아웃");
    expect(wrapper.get(".app-nav__auth-status").classes()).toContain("is-online");

    await authButton.trigger("click");
    await flushPromises();
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(wrapper.get(".app-nav__auth").text()).toBe("로그인");
  });
});
