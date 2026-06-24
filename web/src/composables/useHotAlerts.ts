import { onBeforeUnmount, onMounted } from "vue";
import { useNewsStore } from "../stores/news.js";
import { NEWS_HOT_ALERT_POLL_INTERVAL_MS } from "../constants/news.js";

export function useHotAlerts() {
  const newsStore = useNewsStore();
  let pollTimer: number | undefined;

  function setHotAlertEnabled(enabled: boolean) {
    void newsStore.setHotAlertEnabled(enabled);
  }
  function requestHotAlertPermission() {
    void newsStore.requestNotificationPermission();
  }
  function markHotAlertsSeen() {
    newsStore.markHotAlertsSeen();
  }

  async function initializeHotAlertState() {
    await newsStore.loadHotAlertState();
    if (newsStore.hotAlertHasUserPreference) {
      if (!newsStore.hotAlertEnabled) return;
      if (newsStore.hotAlertPermission !== "granted") {
        newsStore.hotAlertEnabled = false;
        newsStore.persistHotAlertState();
      }
      return;
    }
    if (newsStore.hotAlertPermission === "default") {
      requestHotAlertPermission();
      return;
    }
    if (newsStore.hotAlertPermission === "granted") {
      setHotAlertEnabled(true);
    }
  }

  onMounted(async () => {
    await initializeHotAlertState();
    await newsStore.refreshHotAlertSnapshot();
    pollTimer = window.setInterval(() => {
      if (newsStore.loading) return;
      void newsStore.refreshHotAlertSnapshot();
    }, NEWS_HOT_ALERT_POLL_INTERVAL_MS);
  });

  onBeforeUnmount(() => {
    if (pollTimer) window.clearInterval(pollTimer);
  });

  return { newsStore, setHotAlertEnabled, requestHotAlertPermission, markHotAlertsSeen };
}
