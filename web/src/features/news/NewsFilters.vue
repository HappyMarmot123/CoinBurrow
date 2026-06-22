<script setup lang="ts">
import { NEWS_ASSET_FILTERS, NEWS_SOURCE_FILTERS } from "../../constants/news.js";

defineProps<{
  asset: string;
  source: string;
  query: string;
  refreshing: boolean;
  statusText: string;
  sourceCount: number;
  categoryCount: number;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:asset": [value: string];
  "update:source": [value: string];
  "update:query": [value: string];
  refresh: [];
  reset: [];
}>();
</script>

<template>
  <section class="news-filters" aria-label="뉴스 필터">
    <section class="news-title">
      <p>Crypto News</p>
      <h1>크립토 뉴스</h1>
      <dl class="news-title__stats">
        <dt>상태</dt>
        <dd>{{ statusText }}</dd>
        <dt>매체</dt>
        <dd>{{ sourceCount.toLocaleString() }}</dd>
        <dt>카테고리</dt>
        <dd>{{ categoryCount.toLocaleString() }}</dd>
      </dl>
    </section>

    <div class="filter-section filter-section--asset" role="group" aria-label="자산 필터">
      <p class="filter-section__title">자산 필터</p>
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

    <div class="filter-section filter-section--source" role="group" aria-label="매체 필터">
      <p class="filter-section__title">매체 필터</p>
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
        <span>검색</span>
        <input
          :value="query"
          :disabled="disabled"
          type="search"
          placeholder="검색어 입력"
          aria-label="뉴스 검색"
          @input="emit('update:query', ($event.target as HTMLInputElement).value)"
        >
      </label>

      <button class="icon-button" type="button" :disabled="disabled || refreshing" @click="emit('refresh')">
        <span aria-hidden="true">↻</span>
        <span class="sr-only">새로고침</span>
      </button>

      <button class="text-button" type="button" :disabled="disabled" @click="emit('reset')">
        초기화
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
.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: end;
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
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  align-items: baseline;
  font-size: 13px;
}

.news-title__stats dt,
.news-title__stats dd {
  display: inline;
  margin: 0;
}

.news-title__stats dt {
  @include muted-label;
  margin-right: 2px;
}

.news-title__stats dd {
  margin-right: 12px;
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 900;
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
    flex-wrap: wrap;
  }

  .filter-row {
    align-items: stretch;
  }

  label,
  .text-button {
    width: 100%;
  }
}
</style>
