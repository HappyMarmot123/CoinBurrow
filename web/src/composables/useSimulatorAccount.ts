import { storeToRefs } from "pinia";
import { onMounted, watch } from "vue";

import type { SimulatorOrderInput } from "../api/simulator.js";
import { useAuthStore } from "../stores/auth.js";
import { useSimulatorStore } from "../stores/simulator.js";

export function useSimulatorAccount() {
  const auth = useAuthStore();
  const simulator = useSimulatorStore();
  const {
    session,
    initialized,
    loading: authLoading,
    error: authError,
    googleProviderEnabled,
    welcomeGuideVisible,
    welcomeGuideSaving,
    welcomeGuideError,
    displayName,
  } = storeToRefs(auth);
  const {
    state,
    loading: simulatorLoading,
    submitting,
    error: simulatorError,
    notice,
  } = storeToRefs(simulator);

  onMounted(() => {
    void auth.initialize();
  });

  watch(
    () => session.value?.access_token,
    (accessToken) => {
      if (!accessToken) {
        simulator.clear();
        return;
      }
      void simulator.load(accessToken);
    },
    { immediate: true },
  );

  function reload(): void {
    const accessToken = session.value?.access_token;
    if (accessToken) void simulator.load(accessToken);
  }

  async function placeOrder(order: SimulatorOrderInput): Promise<boolean> {
    const accessToken = session.value?.access_token;
    return accessToken ? simulator.placeOrder(accessToken, order) : false;
  }

  async function resetAccount(): Promise<boolean> {
    const accessToken = session.value?.access_token;
    return accessToken ? simulator.reset(accessToken) : false;
  }

  return {
    session,
    initialized,
    authLoading,
    authError,
    googleProviderEnabled,
    welcomeGuideVisible,
    welcomeGuideSaving,
    welcomeGuideError,
    displayName,
    state,
    simulatorLoading,
    submitting,
    simulatorError,
    notice,
    isConfigured: auth.isConfigured,
    signInWithGoogle: auth.signInWithGoogle,
    signOut: auth.signOut,
    completeWelcomeGuide: auth.completeWelcomeGuide,
    reload,
    placeOrder,
    resetAccount,
  };
}
