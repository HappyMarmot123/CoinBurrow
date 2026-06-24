<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import AppNav from "../../components/AppNav.vue";
import NewsAlertsPopover from "../news/NewsAlertsPopover.vue";
import InsightsTabs, { type InsightTab } from "./InsightsTabs.vue";
import { useGlobalStore } from "../../stores/global.js";
import { useKimchiStore } from "../../stores/kimchi.js";
import { useHotAlerts } from "../../composables/useHotAlerts.js";

const route = useRoute();
const globalStore = useGlobalStore();
const kimchiStore = useKimchiStore();
const { newsStore, setHotAlertEnabled, requestHotAlertPermission, markHotAlertsSeen } = useHotAlerts();

const tabs = computed<InsightTab[]>(() => [
  { key: "global", label: "글로벌 시총", to: "/insights/global", degraded: globalStore.current?.degraded === true },
  { key: "sentiment", label: "시장심리", to: "/insights/sentiment" },
  { key: "kimchi", label: "김치프리미엄", to: "/insights/kimchi", degraded: kimchiStore.degraded === true },
]);

const activeKey = computed(() => {
  const name = route.name;
  if (name === "insights-sentiment") return "sentiment";
  if (name === "insights-kimchi") return "kimchi";
  return "global";
});

</script>

<template>
  <main class="insights-page">
    <AppNav class="insights-nav">
      <template #actions>
        <NewsAlertsPopover
          :hot-alert-enabled="newsStore.hotAlertEnabled"
          :hot-alert-permission="newsStore.hotAlertPermission"
          :hot-alert-history="newsStore.hotAlertHistory"
          :hot-alert-unseen-count="newsStore.hotAlertUnseenCount"
          @toggle-hot-alert="setHotAlertEnabled"
          @request-hot-alert-permission="requestHotAlertPermission"
          @mark-seen="markHotAlertsSeen"
        />
      </template>
    </AppNav>

    <section class="insights-shell">
      <header class="insights-head">
        <h1>시장 동향</h1>
        <p class="insights-head__sub">암호화폐 시장 전체를 한눈에 — 시총·심리·김치프리미엄</p>
      </header>

      <InsightsTabs :tabs="tabs" :active-key="activeKey" />

      <div class="insights-body">
        <router-view />
      </div>
    </section>
  </main>
</template>

<style scoped lang="scss">
:global(body) { margin: 0; }
.insights-page {
  min-height: 100svh;
  padding: clamp(8px, 1.4vh, 14px) 0;
  color: var(--text);
  font-family: $font-sans;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(1100px 500px at 50% -120px, var(--bg-glow), transparent 65%),
    linear-gradient(to bottom right, var(--bg-page), var(--bg-page-mid) 38%, var(--bg-page-soft) 72%);
}
.insights-nav {
  flex: 0 0 auto;
  width: min(1100px, calc(100% - 40px));
  margin: 0 auto clamp(8px, 1.2vh, 12px);
}
.insights-shell {
  flex: 1;
  min-height: 0;
  width: min(1100px, calc(100% - 40px));
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 1.6vh, 16px);
  padding: 14px;
}
.insights-head { display: flex; flex-direction: column; gap: 2px; }
.insights-head h1 {
  @include panel-title(22px);
  font-size: clamp(20px, 3vw, 26px);
}
.insights-head__sub {
  margin: 0;
  color: var(--text-muted);
  font-size: clamp(12px, 1.3vw, 14px);
}
.insights-body { flex: 1; min-height: 0; padding-top: 4px; }
</style>
