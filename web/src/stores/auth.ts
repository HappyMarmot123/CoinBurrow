import type {
  AuthChangeEvent,
  Session,
  Subscription,
  User,
} from "@supabase/supabase-js";
import { defineStore } from "pinia";
import { computed, shallowRef } from "vue";

import {
  getSupabaseAuthProviderStatus,
  getSupabaseClient,
  hasSupabaseConfiguration,
} from "../lib/supabase.js";

const GOOGLE_PROVIDER_DISABLED_MESSAGE =
  "Google 로그인이 아직 활성화되지 않았습니다. 관리자 설정 후 다시 시도해 주세요.";
const WELCOME_GUIDE_METADATA_KEY = "coinburrow_welcome_guide";
const WELCOME_GUIDE_COMPLETED_AT_KEY = "coinburrow_welcome_completed_at";

export type WelcomeGuideStatus = "pending" | "completed";
type WelcomeGuideUser = Pick<User, "user_metadata">;

export function readWelcomeGuideStatus(user: WelcomeGuideUser): WelcomeGuideStatus | null {
  const status = user.user_metadata?.[WELCOME_GUIDE_METADATA_KEY];
  return status === "pending" || status === "completed" ? status : null;
}

export function shouldOfferWelcomeGuide(user: WelcomeGuideUser): boolean {
  return readWelcomeGuideStatus(user) !== "completed";
}

function currentAuthRedirectUrl(): string {
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}`;
}

export const useAuthStore = defineStore("auth", () => {
  const session = shallowRef<Session | null>(null);
  const initialized = shallowRef(false);
  const loading = shallowRef(false);
  const error = shallowRef("");
  const googleProviderEnabled = shallowRef<boolean | null>(null);
  const welcomeGuideVisible = shallowRef(false);
  const welcomeGuideSaving = shallowRef(false);
  const welcomeGuideError = shallowRef("");
  let subscription: Subscription | null = null;
  let initialization: Promise<void> | null = null;
  let welcomePendingUserId: string | null = null;
  let welcomePendingSave: Promise<boolean> | null = null;

  const user = computed(() => session.value?.user ?? null);
  const displayName = computed(() => {
    const metadataName = user.value?.user_metadata?.full_name;
    return typeof metadataName === "string" && metadataName.trim()
      ? metadataName
      : user.value?.email ?? "CoinBurrow 사용자";
  });

  async function writeWelcomeGuideStatus(
    status: WelcomeGuideStatus,
    targetUserId: string,
  ): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) throw new Error("Supabase client unavailable");

    const metadata: Record<string, string> = { [WELCOME_GUIDE_METADATA_KEY]: status };
    if (status === "completed") {
      metadata[WELCOME_GUIDE_COMPLETED_AT_KEY] = new Date().toISOString();
    }

    const result = await client.auth.updateUser({ data: metadata });
    if (result.error) throw result.error;

    const currentSession = session.value;
    if (currentSession?.user.id === targetUserId && result.data.user) {
      syncSession({ ...currentSession, user: result.data.user });
    }
    return true;
  }

  function queueWelcomePending(userId: string): void {
    if (welcomePendingUserId === userId) return;

    welcomePendingUserId = userId;
    const pendingSave = writeWelcomeGuideStatus("pending", userId).catch(() => false);
    welcomePendingSave = pendingSave;
    void pendingSave.finally(() => {
      if (welcomePendingSave === pendingSave) welcomePendingSave = null;
    });
  }

  function syncSession(nextSession: Session | null): void {
    session.value = nextSession;
    const nextUser = nextSession?.user;
    if (!nextUser) {
      welcomeGuideVisible.value = false;
      welcomeGuideSaving.value = false;
      welcomeGuideError.value = "";
      welcomePendingUserId = null;
      welcomePendingSave = null;
      return;
    }

    const status = readWelcomeGuideStatus(nextUser);
    welcomeGuideVisible.value = shouldOfferWelcomeGuide(nextUser);
    if (status === null && welcomeGuideVisible.value) {
      queueWelcomePending(nextUser.id);
    }
  }

  function handleAuthChange(_event: AuthChangeEvent, nextSession: Session | null): void {
    syncSession(nextSession);
  }

  async function initialize(): Promise<void> {
    if (initialization) return initialization;

    initialization = (async () => {
      const client = getSupabaseClient();
      if (!client) {
        error.value = "Supabase 웹 환경변수가 설정되지 않았습니다.";
        initialized.value = true;
        return;
      }

      const [result, providerEnabled] = await Promise.all([
        client.auth.getSession(),
        getSupabaseAuthProviderStatus("google"),
      ]);
      googleProviderEnabled.value = providerEnabled;
      if (result.error) {
        error.value = "로그인 세션을 확인하지 못했습니다.";
      } else {
        syncSession(result.data.session);
        if (!session.value && providerEnabled === false) {
          error.value = GOOGLE_PROVIDER_DISABLED_MESSAGE;
        }
      }

      subscription ??= client.auth.onAuthStateChange(handleAuthChange).data.subscription;
      initialized.value = true;
    })();

    return initialization;
  }

  async function signInWithGoogle(): Promise<void> {
    const client = getSupabaseClient();
    if (!client) {
      error.value = "Supabase 웹 환경변수가 설정되지 않았습니다.";
      return;
    }

    loading.value = true;
    error.value = "";
    try {
      const providerEnabled = googleProviderEnabled.value
        ?? await getSupabaseAuthProviderStatus("google");
      googleProviderEnabled.value = providerEnabled;
      if (providerEnabled === false) {
        error.value = GOOGLE_PROVIDER_DISABLED_MESSAGE;
        return;
      }

      const result = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: currentAuthRedirectUrl() },
      });
      if (result.error) throw result.error;
    } catch {
      error.value = "Google 로그인을 시작하지 못했습니다.";
    } finally {
      loading.value = false;
    }
  }

  async function signOut(): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    loading.value = true;
    error.value = "";
    try {
      const result = await client.auth.signOut();
      if (result.error) throw result.error;
      syncSession(null);
    } catch {
      error.value = "로그아웃하지 못했습니다.";
    } finally {
      loading.value = false;
    }
  }

  async function completeWelcomeGuide(): Promise<boolean> {
    const targetUserId = user.value?.id;
    if (!targetUserId) {
      welcomeGuideError.value = "로그인 정보를 확인한 뒤 다시 시도해 주세요.";
      return false;
    }

    welcomeGuideSaving.value = true;
    welcomeGuideError.value = "";
    try {
      if (welcomePendingSave) await welcomePendingSave;
      if (user.value?.id !== targetUserId) return false;

      await writeWelcomeGuideStatus("completed", targetUserId);
      welcomeGuideVisible.value = false;
      return true;
    } catch {
      welcomeGuideError.value = "안내 완료 상태를 저장하지 못했습니다. 다시 시도해 주세요.";
      return false;
    } finally {
      welcomeGuideSaving.value = false;
    }
  }

  return {
    session,
    initialized,
    loading,
    error,
    googleProviderEnabled,
    welcomeGuideVisible,
    welcomeGuideSaving,
    welcomeGuideError,
    user,
    displayName,
    isConfigured: hasSupabaseConfiguration(),
    initialize,
    signInWithGoogle,
    signOut,
    completeWelcomeGuide,
  };
});
