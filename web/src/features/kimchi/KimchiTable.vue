<script setup lang="ts">
import { computed, ref } from "vue";
import type { KimchiRow } from "../../stores/kimchi.js";

const props = defineProps<{ rows: KimchiRow[] }>();

type SortKey = "premiumPercent" | "accTradePrice24h";
const sortKey = ref<SortKey>("premiumPercent");
const sortDesc = ref(true);

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDesc.value = !sortDesc.value;
  } else {
    sortKey.value = key;
    sortDesc.value = true;
  }
}

function ariaSort(key: SortKey): "ascending" | "descending" | "none" {
  if (sortKey.value !== key) return "none";
  return sortDesc.value ? "descending" : "ascending";
}

const sortedRows = computed(() => {
  const factor = sortDesc.value ? -1 : 1;
  return [...props.rows].sort((a, b) => {
    const av = a[sortKey.value];
    const bv = b[sortKey.value];
    const an = av === null ? Number.NEGATIVE_INFINITY : av;
    const bn = bv === null ? Number.NEGATIVE_INFINITY : bv;
    return (an - bn) * factor;
  });
});

function fmtKrw(value: number | null): string {
  return value === null ? "—" : `₩${Math.round(value).toLocaleString("ko-KR")}`;
}

function fmtPercent(value: number | null): string {
  return value === null ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function fmtValue(value: number): string {
  return `₩${Math.round(value).toLocaleString("ko-KR")}`;
}
</script>

<template>
  <table class="kimchi-table">
    <thead>
      <tr>
        <th>코인</th>
        <th>업비트(KRW)</th>
        <th>바이낸스(KRW 환산)</th>
        <th
          class="kimchi-table__sortable"
          role="columnheader"
          tabindex="0"
          :aria-sort="ariaSort('premiumPercent')"
          @click="toggleSort('premiumPercent')"
          @keydown.enter="toggleSort('premiumPercent')"
          @keydown.space.prevent="toggleSort('premiumPercent')"
        >김프 %</th>
        <th
          class="kimchi-table__sortable"
          role="columnheader"
          tabindex="0"
          :aria-sort="ariaSort('accTradePrice24h')"
          @click="toggleSort('accTradePrice24h')"
          @keydown.enter="toggleSort('accTradePrice24h')"
          @keydown.space.prevent="toggleSort('accTradePrice24h')"
        >24h 거래대금</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in sortedRows" :key="row.upbitMarket">
        <td>{{ row.koreanName }} <span class="kimchi-table__symbol">{{ row.base }}</span></td>
        <td>{{ fmtKrw(row.upbitKrw) }}</td>
        <td :title="`바이낸스 ${row.binanceSymbol} · USDT≈USD 근사`">{{ fmtKrw(row.binanceKrw) }}</td>
        <td :class="{ 'is-up': (row.premiumPercent ?? 0) > 0, 'is-down': (row.premiumPercent ?? 0) < 0 }">
          {{ fmtPercent(row.premiumPercent) }}
        </td>
        <td>{{ fmtValue(row.accTradePrice24h) }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped lang="scss">
.kimchi-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.kimchi-table th,
.kimchi-table td {
  padding: 8px 10px;
  text-align: right;
  border-bottom: 1px solid var(--panel-border);
}
.kimchi-table th:first-child,
.kimchi-table td:first-child {
  text-align: left;
}
.kimchi-table__sortable {
  cursor: pointer;
  user-select: none;
}
.kimchi-table__symbol {
  color: var(--text-muted);
  font-size: 11px;
}
.is-up { color: var(--brand-lime, #d9ff66); }
.is-down { color: #ff5d5d; }
</style>
