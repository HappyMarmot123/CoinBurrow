<script setup lang="ts">
import { computed } from "vue";
import { NEWS_ASSET_FILTERS, NEWS_SOURCE_FILTERS } from "../../constants/news.js";
import type { NewsHotAlertHistoryItem, NewsHotIssue } from "../../stores/news.js";

const props = defineProps<{
  asset: string;
  source: string;
  query: string;
  articleCount: number;
  refreshing: boolean;
  statusText: string;
  sourceCount: number;
  categoryCount: number;
  hotAlertEnabled: boolean;
  hotAlertPermission: "default" | "granted" | "denied";
  hotAlertTopIssues: NewsHotIssue[];
  hotAlertHistory: NewsHotAlertHistoryItem[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:asset": [value: string];
  "update:source": [value: string];
  "update:query": [value: string];
  refresh: [];
  reset: [];
  "toggle-hot-alert": [value: boolean];
  "request-hot-alert-permission": [];
}>();

const isPermissionGranted = computed(() => props.hotAlertPermission === "granted");
const isPermissionBlocked = computed(() => props.hotAlertPermission === "denied");

const alertButtonText = computed(() => {
  if (!isPermissionGranted.value) {
    return props.hotAlertPermission === "default" ? "Enable notifications" : "Notification blocked";
  }
  return props.hotAlertEnabled ? "Stop hot alerts" : "Start hot alerts";
});

function toggleHotAlert() {
  if (!isPermissionGranted.value) {
    emit("request-hot-alert-permission");
    return;
  }
  emit("toggle-hot-alert", !props.hotAlertEnabled);
}

function formatHistoryDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}
</script>

<template>
  <section class="news-filters" aria-label="News filters">
    <section class="news-title">
      <p>Crypto News</p>
      <h1>Crypto News</h1>
      <p class="news-title__stats">
        Status: {{ statusText }} | Sources: {{ sourceCount.toLocaleString() }} | Categories: {{ categoryCount.toLocaleString() }} | Articles: {{ articleCount.toLocaleString() }}
      </p>
    </section>

    <section class="filter-section filter-section--alerts" aria-label="Hot alerts">
      <p class="filter-section__title">Hot alerts</p>
      <p class="news-filters__meta">Permission: {{ hotAlertPermission }}</p>
      <div class="filter-row">
        <button class="text-button" type="button" :disabled="disabled || isPermissionBlocked" @click="toggleHotAlert">
          {{ alertButtonText }}
        </button>
      </div>

      <div class="news-filters__list-wrap">
        <p class="news-filters__sub-title">Top hot issues</p>
        <ul v-if="hotAlertTopIssues.length > 0" class="news-filters__list">
          <li v-for="issue in hotAlertTopIssues" :key="issue.topic" class="news-filters__item">
            <a :href="issue.url" target="_blank" rel="noopener noreferrer">{{ issue.label }}</a>
            <span class="news-filters__item-meta">{{ issue.count }} mentions</span>
          </li>
        </ul>
        <p v-else class="news-filters__muted">No issue data yet.</p>
      </div>

      <div class="news-filters__list-wrap">
        <p class="news-filters__sub-title">Recent alerts</p>
        <ul v-if="hotAlertHistory.length > 0" class="news-filters__list news-filters__list--history">
          <li v-for="issue in hotAlertHistory" :key="`${issue.topic}-${issue.seenAt}`" class="news-filters__item">
            <span>{{ issue.label }} ({{ issue.count }})</span>
            <span class="news-filters__item-meta">{{ formatHistoryDate(issue.seenAt) }}</span>
          </li>
        </ul>
        <p v-else class="news-filters__muted">No alert history yet.</p>
      </div>
    </section>

    <div class="filter-section filter-section--asset" role="group" aria-label="Asset filter">
      <p class="filter-section__title">Asset</p>
      <div class="filter-group">
        <button
          v-for="option in NEWS_ASSET_FILTERS"
          :key="option.value"
          type="button"
          :class="{ active: asset === option.value }"
          :disabled="disabled"
          @click="emit('update:asset', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div class="filter-section filter-section--source" role="group" aria-label="Source filter">
      <p class="filter-section__title">Source</p>
      <div class="filter-group source-group">
        <button
          v-for="option in NEWS_SOURCE_FILTERS"
          :key="option.value"
          type="button"
          :class="{ active: source === option.value }"
          :disabled="disabled"
          :title="option.blurb"
          :aria-label="option.value === 'ALL' ? option.label : `${option.label}: ${option.blurb}`"
          @click="emit('update:source', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div class="filter-row">
      <label class="search-field">
        <span>Search</span>
        <input
          :value="query"
          :disabled="disabled"
          type="search"
          placeholder="Search text"
          aria-label="News search"
          @input="emit('update:query', ($event.target as HTMLInputElement).value)"
        >
      </label>

      <button class="icon-button" type="button" :disabled="disabled || refreshing" @click="emit('refresh')">
        <span aria-hidden="true">?</span>
        <span class="sr-only">Refresh</span>
      </button>

      <button class="text-button" type="button" :disabled="disabled" @click="emit('reset')">
        Reset
      </button>
    </div>
  </section>
</template>

<style scoped lang="scss">
.news-filters {
  display: grid;
  gap: 2rem;
}

.filter-section,
.filter-row,
.news-filters__list-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: start;
}

.filter-section {
  display: grid;
  gap: 8px;
  align-items: start;
}

.filter-section__title {
  margin: 0;
  color: var(--text-subtle);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.news-filters__meta,
.news-filters__item-meta,
.news-filters__muted {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
}

.news-filters__sub-title {
  width: 100%;
  margin: 0;
  color: var(--text-subtle);
  font-size: 11px;
  font-weight: 900;
}

.news-filters__list {
  margin: 0;
  padding: 0;
  width: 100%;
  list-style: none;
  display: grid;
  gap: 6px;
}

.news-filters__list--history {
  max-height: 150px;
  overflow: auto;
}

.news-filters__item {
  border: 1px solid var(--panel-border-soft);
  border-radius: var(--radius-sm);
  padding: 8px;
  display: grid;
  gap: 6px;
  color: var(--text);
  background: rgba(255, 255, 255, 0.03);
  min-width: 0;
}

.news-filters__item a,
.news-filters__item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.news-filters__item a {
  color: var(--text-strong);
  text-decoration: none;
  font-weight: 750;
}

.news-filters__item a:hover,
.news-filters__item a:focus-visible {
  color: var(--brand-lime);
  outline: none;
}

.filter-section--alerts {
  border-left: 3px solid var(--panel-border-hover);
  padding-left: 10px;
}

.filter-section--asset {
  border-left: 3px solid var(--brand-lime);
  padding-left: 10px;
}

.filter-section--source {
  border-left: 3px solid #7aa2ff;
  padding-left: 10px;
}

.filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-group button,
.text-button,
.icon-button {
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
  transition:
    border-color var(--ease),
    color var(--ease),
    background var(--ease);
}

.filter-group button,
.text-button {
  min-height: 36px;
  padding: 8px 10px;
}

.filter-section--source button {
  border-color: rgba(122, 162, 255, 0.45);
}

.filter-section--source button.active {
  color: #d2dcff;
  background: rgba(122, 162, 255, 0.14);
}

.icon-button {
  display: inline-grid;
  place-items: center;
  width: 38px;
  height: 38px;
  font-size: 18px;
}

.filter-group button:hover,
.filter-group button:focus-visible,
.filter-group button.active,
.text-button:hover,
.text-button:focus-visible,
.icon-button:hover,
.icon-button:focus-visible {
  border-color: var(--panel-border-hover);
  color: var(--brand-lime);
  background: var(--panel-bg-strong);
  outline: none;
}

.filter-section--source button:hover,
.filter-section--source button:focus-visible,
.filter-section--source button.active {
  border-color: #7aa2ff;
  color: #b8c9ff;
  background: rgba(122, 162, 255, 0.12);
}

.news-title {
  display: grid;
  gap: 12px;
}

.news-title p {
  @include muted-label;
  margin: 0 0 6px;
  color: var(--brand-lime);
}

.news-title h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: clamp(28px, 3vw, 42px);
  line-height: 1;
  letter-spacing: 0;
}

.news-title__stats {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.35;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

label {
  display: grid;
  gap: 6px;
  min-width: 130px;
}

.search-field {
  flex: 1 1 260px;
  min-width: min(260px, 100%);
}

label span {
  @include muted-label;
}

select,
input {
  @include field-control;
  min-height: 38px;
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
  .news-title__stats {
    white-space: normal;
    font-size: 11px;
  }

  .filter-row,
  .news-filters__list-wrap,
  .news-filters__item,
  .news-filters__item a,
  .news-filters__item span {
    width: 100%;
  }

  label,
  .text-button {
    width: 100%;
  }
}
</style>


