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
const maxBadgeCount = 99;

const unreadLabel = computed(() =>
  props.hotAlertUnseenCount > maxBadgeCount ? `${maxBadgeCount}+` : `${props.hotAlertUnseenCount}`,
);

const permissionMessage = computed(() => {
  if (isBlocked.value) {
    return "브라우저 알림이 차단되어 있습니다";
  }
  if (!isGranted.value) {
    return "브라우저 알림 권한이 필요합니다";
  }
  if (props.hotAlertEnabled) {
    return "실시간 알림이 활성화되어 있습니다";
  }
  return "실시간 알림이 비활성 상태입니다";
});

const hotAlertEnabledLabel = computed(() => (props.hotAlertEnabled ? "알림 끄기" : "알림 켜기"));

const permissionActionLabel = computed(() => {
  if (isBlocked.value) {
    return "브라우저 설정에서 허용";
  }
  return !isGranted.value ? "권한 요청" : hotAlertEnabledLabel.value;
});

const permissionStatusClass = computed(() => {
  if (isBlocked.value) return "blocked";
  if (!isGranted.value) return "pending";
  return props.hotAlertEnabled ? "enabled" : "muted";
});

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

function onDocumentPointerDown(event: PointerEvent) {
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
  <div ref="containerRef" class="news-alert-popover" :class="{ 'news-alert-popover--open': isOpen }">
    <button
      ref="triggerRef"
      class="news-alert-popover__trigger"
      :class="{ 'news-alert-popover__trigger--open': isOpen }"
      type="button"
      aria-label="뉴스 알림 패널 열기"
      :aria-expanded="isOpen"
      :aria-controls="popoverId"
      @click="toggle"
    >
      <span aria-hidden="true" class="news-alert-popover__trigger-icon">🔔</span>
      <span v-if="hotAlertUnseenCount > 0" class="news-alert-popover__trigger-indicator">
        <span class="news-alert-popover__trigger-indicator-pulse" aria-hidden="true"></span>
        <span class="news-alert-popover__trigger-badge">{{ unreadLabel }}</span>
      </span>
      <span class="sr-only">뉴스 알림</span>
    </button>

    <section
      v-if="isOpen"
      :id="popoverId"
      class="news-alert-popover__panel"
      role="dialog"
      aria-label="실시간 뉴스 알림 패널"
    >
      <span class="news-alert-popover__arrow" aria-hidden="true"></span>

      <header class="news-alert-popover__header">
        <div class="news-alert-popover__heading">
          <p class="news-alert-popover__title">알림</p>
          <p class="news-alert-popover__subtitle">실시간 뉴스 이벤트</p>
        </div>
        <button class="news-alert-popover__close" type="button" aria-label="알림 패널 닫기" @click="close">×</button>
      </header>

      <p class="news-alert-popover__status-line">
        상태:
        <span :class="['news-alert-popover__status', `news-alert-popover__status--${permissionStatusClass}`]">
          {{ permissionMessage }}
        </span>
      </p>

      <div class="news-alert-popover__toolbar">
        <button class="news-alert-popover__btn" type="button" :disabled="isBlocked" @click="onToggleRequested">
          {{ permissionActionLabel }}
        </button>
        <span class="news-alert-popover__count">미확인 {{ unreadLabel }}</span>
      </div>

      <div v-if="hotAlertHistory.length > 0" class="news-alert-popover__list-wrap">
        <p class="news-alert-popover__section-title">최근 알림</p>
        <ul class="news-alert-popover__list">
          <li v-for="issue in hotAlertHistory" :key="`${issue.topic}-${issue.seenAt}`" class="news-alert-popover__item">
            <a
              v-if="issue.url"
              :href="issue.url"
              target="_blank"
              rel="noopener noreferrer"
              class="news-alert-popover__item-link"
            >
              <span class="news-alert-popover__item-dot" aria-hidden="true"></span>
              <div class="news-alert-popover__item-content">
                <span class="news-alert-popover__item-title">{{ issue.label }}</span>
                <span class="news-alert-popover__item-meta">
                  {{ issue.count }}회 언급됨 · {{ formatHistoryDate(issue.seenAt) }}
                </span>
              </div>
            </a>
            <span v-else class="news-alert-popover__item-link">
              <span class="news-alert-popover__item-dot" aria-hidden="true"></span>
              <div class="news-alert-popover__item-content">
                <span class="news-alert-popover__item-title">{{ issue.label }}</span>
                <span class="news-alert-popover__item-meta">
                  {{ issue.count }}회 언급됨 · {{ formatHistoryDate(issue.seenAt) }}
                </span>
              </div>
            </span>
            <p class="news-alert-popover__item-headline">{{ issue.headline }}</p>
          </li>
        </ul>
      </div>
      <p v-else class="news-alert-popover__empty">현재 알림이 없습니다.</p>
    </section>
  </div>
</template>

<style scoped lang="scss">
.news-alert-popover {
  position: relative;
}

.news-alert-popover--open {
  &::before {
    content: "";
    position: fixed;
    inset: 0;
    z-index: 1199;
    background: rgb(6 9 21 / 72%);
    backdrop-filter: blur(3px);
    pointer-events: none;
  }
}

.news-alert-popover__trigger {
  position: relative;
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  min-width: 34px;
  min-height: 34px;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  line-height: 1;
  font-weight: 850;
  transition:
    border-color var(--ease),
    color var(--ease),
    background var(--ease),
    box-shadow var(--ease);
}

.news-alert-popover__trigger:hover,
.news-alert-popover__trigger:focus-visible {
  border-color: var(--panel-border-hover);
  color: #fff;
  background: var(--panel-bg-strong);
  outline: none;
}

.news-alert-popover__trigger:focus-visible,
.news-alert-popover__trigger--open {
  box-shadow: 0 0 0 2px rgb(217 255 102 / 14%);
  color: var(--brand-lime);
}

.news-alert-popover__trigger-icon {
  transform: translateY(0.5px);
}

.news-alert-popover__trigger-indicator {
  position: absolute;
  top: -4px;
  right: -4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
}

.news-alert-popover__trigger-indicator-pulse {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #17c964;
  box-shadow: 0 0 0 0 rgb(23 201 100 / 54%);
  animation: news-alert-popover-pulse 1.8s infinite;
}

.news-alert-popover__trigger-badge {
  position: relative;
  z-index: 1;
  min-width: 16px;
  height: 16px;
  border-radius: 999px;
  padding: 0 5px;
  display: inline-grid;
  align-items: center;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  line-height: 1;
  font-weight: 900;
  font-family: inherit;
}

.news-alert-popover__panel {
  position: absolute;
  z-index: 1200;
  right: 0;
  top: calc(100% + 12px);
  width: min(392px, calc(100vw - 24px));
  max-width: 392px;
  max-height: min(520px, 84dvh);
  overflow: hidden;
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgb(13 19 35 / 96%) 0%, rgb(8 12 26 / 96%) 100%);
  padding: 12px;
  display: grid;
  gap: 10px;
  box-shadow:
    0 26px 58px rgb(0 0 0 / 58%),
    inset 0 0 0 1px rgb(255 255 255 / 10%);
  animation: news-alert-popover-in 130ms cubic-bezier(0.2, 0, 0, 1) both;
  transform-origin: calc(100% - 28px) top;
}

.news-alert-popover__arrow {
  position: absolute;
  z-index: 1;
  top: -7px;
  right: 14px;
  width: 12px;
  height: 12px;
  transform: rotate(45deg);
  border-left: 1px solid var(--panel-border);
  border-top: 1px solid var(--panel-border);
  background: linear-gradient(180deg, rgb(13 19 35 / 96%) 0%, rgb(8 12 26 / 96%) 100%);
}

.news-alert-popover__header,
.news-alert-popover__toolbar,
.news-alert-popover__heading {
  display: grid;
  gap: 6px;
}

.news-alert-popover__header {
  grid-template-columns: 1fr auto;
  align-items: center;
  justify-content: space-between;
}

.news-alert-popover__title {
  margin: 0;
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 900;
}

.news-alert-popover__subtitle {
  margin: 0;
  color: var(--text-muted);
  font-size: 11px;
}

.news-alert-popover__status-line {
  margin: 0;
  color: var(--text-muted);
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.news-alert-popover__status-line::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--panel-line);
}

.news-alert-popover__status {
  margin: 0;
  font-weight: 800;
}

.news-alert-popover__status--blocked {
  color: #ffd27a;
}

.news-alert-popover__status--pending {
  color: #ffe6a0;
}

.news-alert-popover__status--enabled {
  color: var(--c-up);
}

.news-alert-popover__status--muted {
  color: var(--text-subtle);
}

.news-alert-popover__close {
  position: relative;
  top: -2px;
  border: 1px solid var(--panel-border-soft);
  border-radius: 999px;
  width: 26px;
  height: 26px;
  display: inline-grid;
  place-items: center;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  transition:
    border-color var(--ease),
    color var(--ease),
    background var(--ease);
}

.news-alert-popover__close:hover,
.news-alert-popover__close:focus-visible {
  border-color: var(--panel-border-hover);
  color: var(--text-strong);
  background: var(--panel-bg-strong);
  outline: none;
}

.news-alert-popover__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.news-alert-popover__btn {
  border: 1px solid var(--panel-border);
  border-radius: 999px;
  min-height: 30px;
  padding: 0 12px;
  color: var(--text-strong);
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition:
    border-color var(--ease),
    color var(--ease),
    background var(--ease),
    transform var(--ease);
}

.news-alert-popover__btn:hover,
.news-alert-popover__btn:focus-visible {
  border-color: var(--panel-border-hover);
  color: var(--brand-lime);
  outline: none;
}

.news-alert-popover__btn:active {
  transform: translateY(1px);
}

.news-alert-popover__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.news-alert-popover__count {
  color: var(--text-subtle);
  font-size: 11px;
  font-weight: 700;
}

.news-alert-popover__section-title {
  margin: 0;
  color: var(--text-subtle);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.01em;
}

.news-alert-popover__list-wrap {
  display: grid;
  gap: 8px;
  min-height: 0;
}

.news-alert-popover__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
  max-height: 320px;
  overflow: auto;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--panel-border-hover) 70%, transparent) transparent;
}

.news-alert-popover__list:focus-visible,
.news-alert-popover__item:focus-within {
  outline: none;
}

.news-alert-popover__item {
  border: 1px solid var(--panel-border-soft);
  border-radius: 11px;
  padding: 8px 10px 10px;
  background: rgb(11 19 34 / 64%);
  display: grid;
  gap: 6px;
  transition:
    border-color var(--ease),
    background var(--ease);
}

.news-alert-popover__item:hover,
.news-alert-popover__item:focus-within {
  border-color: var(--panel-border-hover);
  background: rgb(14 23 41 / 80%);
}

.news-alert-popover__item-link,
.news-alert-popover__item-link:hover,
.news-alert-popover__item-link:focus-visible {
  text-decoration: none;
}

.news-alert-popover__item-link {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  color: inherit;
}

.news-alert-popover__item-dot {
  width: 6px;
  height: 6px;
  margin-top: 5px;
  border-radius: 999px;
  background: var(--c-up);
  flex: 0 0 auto;
}

.news-alert-popover__item-content {
  display: grid;
  gap: 2px;
  min-width: 0;
  flex: 1 1 auto;
}

.news-alert-popover__item-title {
  color: var(--text-strong);
  font-size: 12px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.news-alert-popover__item-meta {
  color: var(--text-muted);
  font-size: 11px;
}

.news-alert-popover__item-headline {
  margin: 0;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-width: 0;
}

.news-alert-popover__empty {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  padding: 4px 2px 2px;
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

@keyframes news-alert-popover-in {
  from {
    opacity: 0;
    transform: translate3d(0, -6px, 0) scale(0.985);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}

@keyframes news-alert-popover-pulse {
  0% {
    transform: scale(0.75);
    box-shadow: 0 0 0 0 rgb(23 201 100 / 65%);
  }

  70% {
    transform: scale(1.4);
    box-shadow: 0 0 0 6px rgb(23 201 100 / 0%);
  }

  100% {
    transform: scale(0.75);
    box-shadow: 0 0 0 0 rgb(23 201 100 / 0%);
  }
}

@media (max-width: 640px) {
  .news-alert-popover__panel {
    width: calc(100vw - 20px);
    max-width: calc(100vw - 20px);
    max-height: min(72dvh, calc(100dvh - 120px));
  }

  .news-alert-popover__trigger {
    width: 30px;
    height: 30px;
    min-width: 30px;
    min-height: 30px;
    font-size: 12px;
  }
}
</style>
