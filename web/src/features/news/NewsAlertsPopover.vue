<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { NewsHotAlertHistoryItem } from "../../stores/news.js";

const props = defineProps<{
  hotAlertEnabled: boolean;
  hotAlertPermission: "default" | "granted" | "denied";
  hotAlertHistory: NewsHotAlertHistoryItem[];
  hotAlertUnseenCount: number;
}>();

const emit = defineEmits<{
  "toggle-hot-alert": [value: boolean];
  "request-hot-alert-permission": [];
  "mark-seen": [];
}>();

const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLButtonElement | null>(null);

const isGranted = computed(() => props.hotAlertPermission === "granted");
const isBlocked = computed(() => props.hotAlertPermission === "denied");
const popoverId = "news-alert-popover-panel";

function close() {
  isOpen.value = false;
}

function open() {
  if (isOpen.value) return;
  isOpen.value = true;
  emit("mark-seen");
}

function toggle() {
  if (isOpen.value) {
    close();
    return;
  }
  open();
}

function onToggleRequested() {
  if (!isGranted.value) {
    emit("request-hot-alert-permission");
    open();
    return;
  }

  emit("toggle-hot-alert", !props.hotAlertEnabled);
}

function onDocumentPointerDown(event: MouseEvent) {
  if (!containerRef.value || !event.target || !(event.target instanceof Node)) {
    return;
  }

  if (!containerRef.value.contains(event.target)) {
    close();
  }
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    close();
    if (triggerRef.value) {
      triggerRef.value.focus();
    }
  }
}

function formatHistoryDate(timestamp: number): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

watch(isOpen, (nextValue) => {
  if (nextValue) {
    emit("mark-seen");
    nextTick(() => {
      triggerRef.value?.focus({ preventScroll: true });
    });
  }
});

onMounted(() => {
  document.addEventListener("pointerdown", onDocumentPointerDown, { capture: true });
  document.addEventListener("keydown", onDocumentKeydown, { capture: true });
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onDocumentPointerDown, { capture: true } as AddEventListenerOptions);
  document.removeEventListener("keydown", onDocumentKeydown, { capture: true } as AddEventListenerOptions);
});
</script>

<template>
  <div ref="containerRef" class="news-alert-popover">
    <button
      ref="triggerRef"
      class="news-alert-popover__trigger"
      type="button"
      aria-label="최근 알림 열기"
      :aria-expanded="isOpen"
      :aria-controls="popoverId"
      @click="toggle"
    >
      <span aria-hidden="true">🔔</span>
      <span v-if="hotAlertUnseenCount > 0" class="news-alert-popover__badge">{{ hotAlertUnseenCount }}</span>
      <span class="sr-only">최근 알림</span>
    </button>

    <section
      v-if="isOpen"
      :id="popoverId"
      class="news-alert-popover__panel"
      role="dialog"
      aria-label="최근 알림"
    >
      <header class="news-alert-popover__header">
        <p>최근 알림</p>
        <button
          class="news-alert-popover__close"
          type="button"
          aria-label="알림 패널 닫기"
          @click="close"
        >
          ×
        </button>
      </header>

      <p class="news-alert-popover__meta">
        권한: {{ isBlocked ? "차단됨" : isGranted ? "허용됨" : "요청 필요" }}
      </p>

      <div class="news-alert-popover__controls">
        <button
          type="button"
          class="news-alert-popover__btn"
          :disabled="isBlocked"
          @click="onToggleRequested"
        >
          {{ !isGranted ? "알림 허용" : hotAlertEnabled ? "알림 끄기" : "알림 켜기" }}
        </button>
      </div>

      <div v-if="hotAlertHistory.length > 0" class="news-alert-popover__list-wrap">
        <ul class="news-alert-popover__list">
          <li v-for="issue in hotAlertHistory" :key="`${issue.topic}-${issue.seenAt}`" class="news-alert-popover__item">
            <a
              v-if="issue.url"
              :href="issue.url"
              target="_blank"
              rel="noopener noreferrer"
              class="news-alert-popover__item-title"
            >
              {{ issue.label }} ({{ issue.count }}회)
            </a>
            <span v-else class="news-alert-popover__item-title">{{ issue.label }} ({{ issue.count }}회)</span>
            <span class="news-alert-popover__item-meta">{{ formatHistoryDate(issue.seenAt) }}</span>
            <span class="news-alert-popover__item-headline">{{ issue.headline }}</span>
          </li>
        </ul>
      </div>
      <p v-else class="news-alert-popover__empty">최근 알림이 없습니다.</p>
    </section>
  </div>
</template>

<style scoped lang="scss">
.news-alert-popover {
  position: relative;
}

.news-alert-popover__trigger {
  position: relative;
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 10px;
  min-width: 34px;
  min-height: 34px;
  background: rgba(10, 18, 29, 0.9);
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  line-height: 1;
  font-weight: 850;
  transition: border-color var(--ease), color var(--ease), background var(--ease);
}

.news-alert-popover__trigger:hover,
.news-alert-popover__trigger:focus-visible {
  border-color: var(--panel-border-hover);
  color: var(--text-strong);
  background: var(--panel-bg-strong);
  outline: none;
}

.news-alert-popover__badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  min-height: 16px;
  border-radius: 999px;
  padding: 0 5px;
  display: inline-grid;
  place-items: center;
  background: #ff4d4f;
  color: #fff;
  font-size: 10px;
  line-height: 1;
  font-weight: 800;
}

.news-alert-popover__panel {
  position: absolute;
  z-index: 1200;
  top: calc(100% + 8px);
  right: 0;
  width: min(340px, 88vw);
  border: 1px solid var(--panel-border-hover);
  border-radius: 10px;
  background: var(--panel-bg-strong);
  padding: 10px;
  box-shadow: var(--shadow);
  display: grid;
  gap: 8px;
}

.news-alert-popover__header,
.news-alert-popover__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.news-alert-popover__header p {
  margin: 0;
  font-weight: 800;
  color: var(--text-strong);
}

.news-alert-popover__close {
  border: 1px solid var(--panel-border-soft);
  border-radius: 999px;
  width: 22px;
  height: 22px;
  display: inline-grid;
  place-items: center;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}

.news-alert-popover__meta,
.news-alert-popover__empty {
  margin: 0;
  color: var(--text-muted);
  font-size: 11px;
}

.news-alert-popover__btn {
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  padding: 6px 9px;
  color: var(--text-strong);
  background: transparent;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: border-color var(--ease), color var(--ease), background var(--ease);
}

.news-alert-popover__btn:hover,
.news-alert-popover__btn:focus-visible {
  border-color: var(--panel-border-hover);
  color: var(--brand-lime);
  outline: none;
}

.news-alert-popover__btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.news-alert-popover__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
  max-height: 280px;
  overflow: auto;
}

.news-alert-popover__item {
  border: 1px solid var(--panel-border-soft);
  border-radius: 8px;
  padding: 8px;
  display: grid;
  gap: 4px;
  font-size: 12px;
}

.news-alert-popover__item-title {
  color: var(--text-strong);
  font-size: 12px;
  text-decoration: none;
  overflow-wrap: anywhere;
}

.news-alert-popover__item-title:hover {
  color: var(--brand-lime);
}

.news-alert-popover__item-meta,
.news-alert-popover__item-headline {
  color: var(--text-muted);
  font-size: 11px;
}

.news-alert-popover__item-headline {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 640px) {
  .news-alert-popover__panel {
    width: min(320px, calc(100vw - 24px));
    right: 0;
  }
}
</style>
