<script setup lang="ts">
import type { KimchiRow } from "../../stores/kimchi.js";

defineProps<{ rows: KimchiRow[] }>();

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
        <th>김프 %</th>
        <th>24h 거래대금</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in rows" :key="row.upbitMarket">
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
  min-width: 720px;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 13px;
}
.kimchi-table th,
.kimchi-table td {
  overflow: hidden;
  padding: 8px 10px;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-bottom: 1px solid var(--panel-border);
}
.kimchi-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--bg-page-mid);
}
.kimchi-table th:first-child,
.kimchi-table td:first-child {
  text-align: left;
}
.kimchi-table__symbol {
  color: var(--text-muted);
  font-size: 11px;
}
.is-up { color: var(--brand-lime, #d9ff66); }
.is-down { color: #ff5d5d; }
</style>
