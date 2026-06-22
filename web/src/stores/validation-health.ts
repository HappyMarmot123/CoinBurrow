import { defineStore } from "pinia";

import type { NormalizedError } from "../shared/validation/error/normalized-error.js";

const WINDOW_MS = 60_000;

interface ValidationEvent {
  ts: number;
  source: NormalizedError["source"];
  code: NormalizedError["code"];
  message: string;
  path?: string;
  retryable: boolean;
  provider?: string;
}

interface FallbackEvent {
  ts: number;
  channel: string;
  reason: string;
}

export const useValidationHealthStore = defineStore("validationHealth", {
  state: () => ({
    events: [] as ValidationEvent[],
    fallbackEvents: [] as FallbackEvent[],
    reconnectCount: 0,
    connected: false,
    lastStatusAt: undefined as number | undefined,
    stale: false,
  }),
  getters: {
    recentEvents: (state) => state.events.filter((event) => Date.now() - event.ts <= WINDOW_MS),
    recentFallbacks: (state) => state.fallbackEvents.filter((event) => Date.now() - event.ts <= WINDOW_MS),
    mismatchCount(): number {
      return this.recentEvents.filter((event) => event.code === "SCHEMA_MISMATCH").length;
    },
    mismatchRate(): number {
      const recent = this.recentEvents;
      return recent.length === 0 ? 0 : this.mismatchCount / recent.length;
    },
    retryCount(): number {
      return this.recentEvents.filter((event) => event.retryable).length + this.reconnectCount;
    },
    fallbackCount(): number {
      return this.recentFallbacks.length;
    },
    latestEvent(): ValidationEvent | undefined {
      return this.events.at(-1);
    },
  },
  actions: {
    recordError(error: NormalizedError) {
      const now = Date.now();
      const event: ValidationEvent = {
        ts: now,
        source: error.source,
        code: error.code,
        message: error.message,
        ...(error.path === undefined ? {} : { path: error.path }),
        retryable: error.retryable,
        ...(error.provider === undefined ? {} : { provider: error.provider }),
      };

      this.events = [...this.events.filter((item) => now - item.ts <= WINDOW_MS), event];
      if (error.code === "SCHEMA_MISMATCH") {
        this.stale = true;
      }
    },
    recordConnectionStatus(connected: boolean) {
      const wasConnected = this.connected;

      this.connected = connected;
      this.lastStatusAt = Date.now();
      if (wasConnected && !connected) {
        this.reconnectCount += 1;
        this.stale = true;
      }
    },
    recordFallback(channel: string, reason: string) {
      const now = Date.now();

      this.fallbackEvents = [
        ...this.fallbackEvents.filter((event) => now - event.ts <= WINDOW_MS),
        { ts: now, channel, reason },
      ];
      this.stale = true;
    },
    clearStale() {
      this.stale = false;
    },
    clearEvents() {
      this.events = [];
      this.fallbackEvents = [];
      this.reconnectCount = 0;
      this.stale = false;
    },
  },
});
