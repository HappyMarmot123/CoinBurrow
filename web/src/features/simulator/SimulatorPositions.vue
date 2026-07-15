<script setup lang="ts">
import type { SimulatorPosition } from "../../api/simulator.js";

const props = defineProps<{ positions: SimulatorPosition[] }>();

const currency = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const quantity = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 8 });
const names = { BTC: "비트코인", ETH: "이더리움" } as const;

function formatKrw(value: number): string {
  return `${currency.format(Math.round(value))}원`;
}

function formatRate(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}
</script>

<template>
  <section class="positions-panel" aria-labelledby="positions-title">
    <header class="positions-panel__head">
      <h2 id="positions-title">보유 자산</h2>
      <span>보유 {{ props.positions.length }}종목</span>
    </header>

    <div v-if="props.positions.length === 0" class="positions-empty">
      <strong>아직 보유한 자산이 없습니다.</strong>
      <p>오른쪽 주문 패널에서 BTC 또는 ETH를 시장가로 매수해 보세요.</p>
    </div>

    <div v-else class="positions-table-wrap">
      <table class="positions-table">
        <thead>
          <tr>
            <th>자산</th>
            <th>보유 수량</th>
            <th>평단가</th>
            <th>현재가</th>
            <th>평가액</th>
            <th>평가 손익</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="position in props.positions" :key="position.symbol">
            <td data-label="자산">
              <strong>{{ position.symbol }}</strong>
              <small>{{ names[position.symbol] }}</small>
            </td>
            <td data-label="보유 수량">{{ quantity.format(position.quantity) }}</td>
            <td data-label="평단가">{{ formatKrw(position.avgPrice) }}</td>
            <td data-label="현재가">{{ formatKrw(position.currentPrice) }}</td>
            <td data-label="평가액">{{ formatKrw(position.marketValue) }}</td>
            <td
              data-label="평가 손익"
              :class="position.profit > 0 ? 'is-up' : position.profit < 0 ? 'is-down' : ''"
            >
              {{ formatKrw(position.profit) }}
              <small>{{ formatRate(position.returnRate) }}</small>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped lang="scss">
.positions-panel {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  background: var(--panel-bg);
}

.positions-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--panel-line);
  padding: 17px 20px;
}

.positions-panel__head h2 {
  margin: 0;
}

.positions-panel__head h2 {
  @include panel-title(18px);
}

.positions-panel__head > span {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 750;
}

.positions-empty {
  min-height: 210px;
  display: grid;
  place-content: center;
  margin: 20px;
  text-align: center;
  border: 1px dashed var(--panel-border);
  border-radius: 8px;
  padding: 24px;
  background: color-mix(in srgb, var(--input-bg) 45%, transparent);
}

.positions-empty strong {
  color: var(--text);
}

.positions-empty p {
  max-width: 420px;
  margin: 8px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.positions-table-wrap {
  overflow-x: auto;
}

.positions-table {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}

.positions-table th,
.positions-table td {
  border-bottom: 1px solid var(--panel-line);
  padding: 14px 16px;
  text-align: right;
  white-space: nowrap;
}

.positions-table tbody tr:last-child td {
  border-bottom: 0;
}

.positions-table th:first-child,
.positions-table td:first-child {
  text-align: left;
}

.positions-table th {
  color: var(--text-dim);
  font-size: 11px;
  font-weight: 800;
}

.positions-table td {
  color: var(--text);
  font-size: 13px;
  font-weight: 750;
}

.positions-table td strong,
.positions-table td small {
  display: block;
}

.positions-table td small {
  margin-top: 3px;
  color: var(--text-muted);
  font-size: 11px;
}

.positions-table .is-up,
.positions-table .is-up small {
  color: var(--c-up);
}

.positions-table .is-down,
.positions-table .is-down small {
  color: var(--c-down-strong);
}

@media (max-width: 720px) {
  .positions-table thead {
    display: none;
  }

  .positions-table,
  .positions-table tbody,
  .positions-table tr,
  .positions-table td {
    display: block;
    width: 100%;
  }

  .positions-table tr {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    border-bottom: 1px solid var(--panel-line);
    padding: 8px 0;
  }

  .positions-table tr:last-child {
    border-bottom: 0;
  }

  .positions-table td,
  .positions-table td:first-child {
    border: 0;
    padding: 8px;
    text-align: right;
    white-space: normal;
  }

  .positions-table td::before {
    display: block;
    margin-bottom: 3px;
    color: var(--text-dim);
    content: attr(data-label);
    font-size: 10px;
  }
}
</style>
