import type { Session, User } from "@supabase/supabase-js";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  shouldOfferWelcomeGuide,
  useAuthStore,
} from "../src/stores/auth.js";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn<() => Promise<{
    data: { session: Session | null };
    error: Error | null;
  }>>(async () => ({ data: { session: null }, error: null })),
  signInWithOAuth: vi.fn(),
  updateUser: vi.fn(),
  providerStatus: vi.fn(async () => false),
}));

vi.mock("../src/lib/supabase.js", () => ({
  hasSupabaseConfiguration: () => true,
  getSupabaseAuthProviderStatus: mocks.providerStatus,
  getSupabaseClient: () => ({
    auth: {
      getSession: mocks.getSession,
      signInWithOAuth: mocks.signInWithOAuth,
      updateUser: mocks.updateUser,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  }),
}));

function makeUser(overrides: Partial<User> = {}): User {
  const createdAt = "2026-07-15T04:00:00.000Z";
  return {
    id: "11111111-1111-4111-8111-111111111111",
    aud: "authenticated",
    role: "authenticated",
    email: "new-user@example.com",
    created_at: createdAt,
    last_sign_in_at: "2026-07-15T04:00:01.000Z",
    app_metadata: { provider: "google" },
    user_metadata: { full_name: "새 사용자" },
    ...overrides,
  };
}

function makeSession(user: User): Session {
  return {
    access_token: "test-access-token",
    refresh_token: "test-refresh-token",
    expires_in: 3600,
    expires_at: 1_800_000_000,
    token_type: "bearer",
    user,
  };
}

describe("auth store", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    setActivePinia(createPinia());
    mocks.getSession.mockReset().mockResolvedValue({ data: { session: null }, error: null });
    mocks.signInWithOAuth.mockReset().mockResolvedValue({ error: null });
    mocks.updateUser.mockReset();
    mocks.providerStatus.mockReset().mockResolvedValue(false);
  });

  it("blocks Google OAuth before redirect when the provider is disabled", async () => {
    const auth = useAuthStore();

    await auth.initialize();
    await auth.signInWithGoogle();

    expect(auth.googleProviderEnabled).toBe(false);
    expect(auth.error).toContain("Google 로그인이 아직 활성화되지 않았습니다.");
    expect(mocks.signInWithOAuth).not.toHaveBeenCalled();
  });

  it("returns Google OAuth to the route where login started", async () => {
    window.history.replaceState({}, "", "/exchange?market=KRW-ETH");
    mocks.providerStatus.mockResolvedValue(true);
    const auth = useAuthStore();

    await auth.initialize();
    await auth.signInWithGoogle();

    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/exchange?market=KRW-ETH`,
      },
    });
    expect(auth.error).toBe("");
  });

  it("offers the guide on the first sign-in and persists completion", async () => {
    const user = makeUser();
    mocks.getSession.mockResolvedValue({ data: { session: makeSession(user) }, error: null });
    mocks.providerStatus.mockResolvedValue(true);
    mocks.updateUser.mockImplementation(async ({ data }: { data: Record<string, string> }) => ({
      data: { user: makeUser({ user_metadata: { ...user.user_metadata, ...data } }) },
      error: null,
    }));

    const auth = useAuthStore();
    await auth.initialize();

    expect(auth.welcomeGuideVisible).toBe(true);
    await vi.waitFor(() => {
      expect(mocks.updateUser).toHaveBeenCalledWith({
        data: { coinburrow_welcome_guide: "pending" },
      });
    });

    await expect(auth.completeWelcomeGuide()).resolves.toBe(true);
    expect(mocks.updateUser).toHaveBeenLastCalledWith({
      data: {
        coinburrow_welcome_guide: "completed",
        coinburrow_welcome_completed_at: expect.any(String),
      },
    });
    expect(auth.welcomeGuideVisible).toBe(false);
    expect(auth.welcomeGuideError).toBe("");
  });

  it("offers the guide once to an existing user without onboarding metadata", async () => {
    const user = makeUser({
      created_at: "2026-07-01T04:00:00.000Z",
      last_sign_in_at: "2026-07-15T04:00:00.000Z",
    });
    mocks.getSession.mockResolvedValue({ data: { session: makeSession(user) }, error: null });
    mocks.providerStatus.mockResolvedValue(true);
    mocks.updateUser.mockImplementation(async ({ data }: { data: Record<string, string> }) => ({
      data: { user: makeUser({ user_metadata: { ...user.user_metadata, ...data } }) },
      error: null,
    }));

    const auth = useAuthStore();
    await auth.initialize();

    expect(auth.welcomeGuideVisible).toBe(true);
    await vi.waitFor(() => {
      expect(mocks.updateUser).toHaveBeenCalledWith({
        data: { coinburrow_welcome_guide: "pending" },
      });
    });
  });

  it("keeps the guide open when completion cannot be saved", async () => {
    const user = makeUser({ user_metadata: { coinburrow_welcome_guide: "pending" } });
    mocks.getSession.mockResolvedValue({ data: { session: makeSession(user) }, error: null });
    mocks.providerStatus.mockResolvedValue(true);
    mocks.updateUser.mockResolvedValue({
      data: { user: null },
      error: new Error("update failed"),
    });

    const auth = useAuthStore();
    await auth.initialize();

    await expect(auth.completeWelcomeGuide()).resolves.toBe(false);
    expect(auth.welcomeGuideVisible).toBe(true);
    expect(auth.welcomeGuideError).toContain("완료 상태를 저장하지 못했습니다");
  });

  it("uses explicit onboarding metadata instead of authentication timestamps", () => {
    expect(shouldOfferWelcomeGuide(makeUser({
      user_metadata: {},
      created_at: "2025-01-01T00:00:00.000Z",
      last_sign_in_at: "2026-07-15T04:00:00.000Z",
    }))).toBe(true);
    expect(shouldOfferWelcomeGuide(makeUser({
      user_metadata: { coinburrow_welcome_guide: "pending" },
      last_sign_in_at: "2026-08-15T04:00:00.000Z",
    }))).toBe(true);
    expect(shouldOfferWelcomeGuide(makeUser({
      user_metadata: { coinburrow_welcome_guide: "completed" },
    }))).toBe(false);
  });
});
