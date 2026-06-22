<script setup lang="ts">
import { NEWS_ASSET_FILTERS, NEWS_SOURCE_FILTERS } from "../../constants/news.js";

const props = defineProps<{
  asset: string;
  source: string;
  query: string;
  articleCount: number;
  statusText: string;
  sourceCount: number;
  categoryCount: number;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:asset": [value: string];
  "update:source": [value: string];
  "update:query": [value: string];
}>();
</script>

<template>
  <section class="news-filters" aria-label="뉴스 필터">
    <section class="news-title">
      <h1>크립토 뉴스</h1>
      <p class="news-title__stats">
        상태: {{ statusText }} | 소스: {{ sourceCount.toLocaleString() }} | 카테고리: {{ categoryCount.toLocaleString() }} | 기사: {{ articleCount.toLocaleString() }}
      </p>
    </section>

    <div class="filter-row">
      <label class="search-field">
        <span>검색</span>
        <input
          :value="query"
          :disabled="disabled"
          type="search"
          maxlength="100"
          placeholder="키워드 입력"
          aria-label="뉴스 검색"
          @input="emit('update:query', ($event.target as HTMLInputElement).value)"
        >
      </label>
    </div>

    <div class="filter-section filter-section--asset" role="group" aria-label="자산 필터">
      <p class="filter-section__title">자산</p>
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
      <p class="filter-section__title">매체</p>
      <div class="filter-group source-group">
        <button
          v-for="option in NEWS_SOURCE_FILTERS"
          :key="option.value"
          type="button"
          class="filter-group__source-button"
          :class="{ active: source === option.value }"
          :disabled="disabled"
          :title="option.value === 'ALL' ? undefined : option.blurb"
          :aria-label="option.value === 'ALL' ? option.label : `${option.label}: ${option.blurb}`"
          @click="emit('update:source', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
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

.filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-group button,
.filter-group__source-button {
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
.filter-group__source-button {
  min-height: 36px;
  padding: 8px 10px;
}

.filter-section--source .filter-group__source-button {
  border-color: rgba(122, 162, 255, 0.45);
}

.filter-group__source-button.active {
  color: #d2dcff;
  background: rgba(122, 162, 255, 0.14);
}

.filter-group button:hover,
.filter-group button:focus-visible,
.filter-group button.active,
.filter-group__source-button:hover,
.filter-group__source-button:focus-visible,
.filter-group__source-button.active {
  border-color: var(--panel-border-hover);
  color: var(--brand-lime);
  background: var(--panel-bg-strong);
  outline: none;
}

.filter-section--source .filter-group__source-button:hover,
.filter-section--source .filter-group__source-button:focus-visible,
.filter-section--source .filter-group__source-button.active {
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

@media (max-width: 640px) {
  .news-title__stats {
    white-space: normal;
    font-size: 11px;
  }

  .filter-row,
  label,
  .filter-group {
    width: 100%;
  }
}
</style>
