import { defineStore } from "pinia";
import { shallowRef } from "vue";

import {
  executeSimulatorOrder,
  getSimulatorState,
  resetSimulator,
  SimulatorApiError,
  type SimulatorOrderInput,
  type SimulatorState,
} from "../api/simulator.js";

function errorMessage(error: unknown): string {
  return error instanceof SimulatorApiError
    ? error.message
    : "시뮬레이터 요청을 처리하지 못했습니다.";
}

export const useSimulatorStore = defineStore("simulator", () => {
  const state = shallowRef<SimulatorState | null>(null);
  const loading = shallowRef(false);
  const submitting = shallowRef(false);
  const error = shallowRef("");
  const notice = shallowRef("");

  function clear(): void {
    state.value = null;
    error.value = "";
    notice.value = "";
  }

  async function load(accessToken: string): Promise<void> {
    loading.value = true;
    error.value = "";
    try {
      state.value = await getSimulatorState(accessToken);
    } catch (cause) {
      error.value = errorMessage(cause);
    } finally {
      loading.value = false;
    }
  }

  async function placeOrder(
    accessToken: string,
    input: SimulatorOrderInput,
  ): Promise<boolean> {
    submitting.value = true;
    error.value = "";
    notice.value = "";
    try {
      state.value = await executeSimulatorOrder(accessToken, input);
      notice.value = `${input.symbol} ${input.side === "buy" ? "매수" : "매도"} 주문이 체결되었습니다.`;
      return true;
    } catch (cause) {
      error.value = errorMessage(cause);
      return false;
    } finally {
      submitting.value = false;
    }
  }

  async function reset(accessToken: string): Promise<boolean> {
    submitting.value = true;
    error.value = "";
    notice.value = "";
    try {
      state.value = await resetSimulator(accessToken);
      notice.value = "모의 계좌를 1억원으로 초기화했습니다.";
      return true;
    } catch (cause) {
      error.value = errorMessage(cause);
      return false;
    } finally {
      submitting.value = false;
    }
  }

  return { state, loading, submitting, error, notice, clear, load, placeOrder, reset };
});

