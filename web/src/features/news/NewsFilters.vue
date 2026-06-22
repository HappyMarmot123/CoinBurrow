<script setup lang="ts">
import { NEWS_ASSET_FILTERS } from "../../constants/news.js";

defineProps<{
  asset: string;
  query: string;
  refreshing: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:asset": [value: string];
  "update:query": [value: string];
  refresh: [];
  reset: [];
}>();
</script>

<template>
  <section class="news-filters" aria-label="뉴스 필터">
    <div class="filter-group" role="group" aria-label="자산 필터">
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

    <div class="filter-row">
      <label class="search-field">
        <span>검색</span>
        <input
          :value="query"
          :disabled="disabled"
          type="search"
          placeholder="키워드 입력"
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
  gap: 12px;
}

.filter-group,
.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: end;
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
  .filter-row {
    align-items: stretch;
  }

  label,
  .text-button {
    width: 100%;
  }
}
</style>
