<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";

export interface InsightTab {
  key: string;
  label: string;
  to: string;
  degraded?: boolean;
}

const props = defineProps<{ tabs: InsightTab[]; activeKey: string }>();
const router = useRouter();

const activeIndex = computed(() =>
  Math.max(0, props.tabs.findIndex((t) => t.key === props.activeKey)),
);

const indicatorStyle = computed(() => ({
  width: `${100 / props.tabs.length}%`,
  transform: `translateX(${activeIndex.value * 100}%)`,
}));

function focusTab(index: number, el: HTMLElement) {
  const list = el.closest('[role="tablist"]');
  const target = list?.querySelectorAll<HTMLElement>('[role="tab"]')[index];
  target?.focus();
}

function onKeydown(event: KeyboardEvent, index: number) {
  const last = props.tabs.length - 1;
  let next = index;
  if (event.key === "ArrowRight") next = index >= last ? 0 : index + 1;
  else if (event.key === "ArrowLeft") next = index <= 0 ? last : index - 1;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = last;
  else return;
  event.preventDefault();
  focusTab(next, event.currentTarget as HTMLElement);
  void router.push(props.tabs[next].to);
}
</script>

<template>
  <div class="insights-tabs" role="tablist" aria-label="시장 동향 지표 선택">
    <RouterLink
      v-for="(tab, index) in tabs"
      :key="tab.key"
      :to="tab.to"
      role="tab"
      class="insights-tabs__tab"
      :class="{ 'is-active': tab.key === activeKey }"
      :aria-selected="tab.key === activeKey ? 'true' : 'false'"
      :tabindex="tab.key === activeKey ? 0 : -1"
      @keydown="onKeydown($event, index)"
    >
      <span>{{ tab.label }}</span>
      <span v-if="tab.degraded" class="insights-tabs__dot" aria-hidden="true" />
    </RouterLink>
    <span class="insights-tabs__indicator" :style="indicatorStyle" aria-hidden="true" />
  </div>
</template>

<style scoped lang="scss">
.insights-tabs {
  position: relative;
  display: flex;
  border-bottom: 1px solid var(--panel-border);
}

.insights-tabs__tab {
  flex: 1 1 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 10px;
  color: var(--text-muted);
  font-size: clamp(13px, 1.5vw, 15px);
  font-weight: 850;
  text-decoration: none;
  background: transparent;
  cursor: pointer;
  transition: color var(--ease);
}

.insights-tabs__tab:hover,
.insights-tabs__tab.is-active {
  color: var(--brand-lime);
}

.insights-tabs__tab:focus-visible {
  outline: 2px solid var(--panel-border-hover);
  outline-offset: -2px;
  border-radius: var(--radius-sm);
}

.insights-tabs__dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--c-down);
}

.insights-tabs__indicator {
  position: absolute;
  bottom: -1px;
  left: 0;
  height: 2px;
  background: var(--brand-lime);
  transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

@media (prefers-reduced-motion: reduce) {
  .insights-tabs__indicator {
    transition: none;
  }
}
</style>
