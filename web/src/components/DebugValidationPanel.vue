<script setup lang="ts">
import { computed } from "vue";
import { useValidationHealthStore } from "../stores/validation-health.js";

const validationHealth = useValidationHealthStore();

const statusLabel = computed(() => {
  if (!validationHealth.connected) return "Offline";
  return validationHealth.stale ? "Stale" : "Live";
});

const statusClass = computed(() => ({
  stale: validationHealth.stale,
  live: validationHealth.connected && !validationHealth.stale,
}));

const mismatchRateLabel = computed(() => `${(validationHealth.mismatchRate * 100).toFixed(1)}%`);
</script>

<template>
  <section class="validation-panel" aria-label="Validation health">
    <header>
      <h2>Validation</h2>
      <span class="status" :class="statusClass">{{ statusLabel }}</span>
    </header>

    <dl class="metrics">
      <div>
        <dt>Mismatch</dt>
        <dd>{{ validationHealth.mismatchCount }}</dd>
      </div>
      <div>
        <dt>Rate</dt>
        <dd>{{ mismatchRateLabel }}</dd>
      </div>
      <div>
        <dt>Retry</dt>
        <dd>{{ validationHealth.retryCount }}</dd>
      </div>
      <div>
        <dt>Fallback</dt>
        <dd>{{ validationHealth.fallbackCount }}</dd>
      </div>
    </dl>

    <p v-if="validationHealth.latestEvent" class="latest">
      <span>{{ validationHealth.latestEvent.code }}</span>
      {{ validationHealth.latestEvent.source }}
      <small v-if="validationHealth.latestEvent.path">{{ validationHealth.latestEvent.path }}</small>
    </p>

    <button v-if="validationHealth.recentEvents.length > 0 || validationHealth.stale" type="button" @click="validationHealth.clearEvents()">
      Clear
    </button>
  </section>
</template>

<style scoped>
.validation-panel {
  display: grid;
  gap: 12px;
  border: 1px solid #d7dde8;
  border-radius: 8px;
  padding: 14px;
  background: #ffffff;
}

header,
.metrics,
.latest {
  min-width: 0;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

h2 {
  margin: 0;
  color: #172033;
  font-size: 14px;
  font-weight: 700;
}

.status {
  flex: 0 0 auto;
  border: 1px solid #cfd7e6;
  border-radius: 999px;
  padding: 3px 9px;
  color: #4d5b73;
  font-size: 12px;
  line-height: 1.2;
}

.status.live {
  border-color: #84bf99;
  color: #207344;
}

.status.stale {
  border-color: #dda35f;
  color: #9a5a13;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.metrics div {
  min-width: 0;
}

dt {
  color: #667085;
  font-size: 11px;
}

dd {
  margin: 3px 0 0;
  color: #172033;
  font-size: 18px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.latest {
  overflow: hidden;
  margin: 0;
  color: #4d5b73;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.latest span {
  margin-right: 8px;
  color: #a33747;
  font-weight: 700;
}

.latest small {
  margin-left: 8px;
  color: #667085;
}

button {
  justify-self: start;
  border: 1px solid #cfd7e6;
  border-radius: 6px;
  padding: 6px 10px;
  color: #172033;
  background: #ffffff;
  font: inherit;
  font-size: 12px;
}

button:hover {
  background: #f2f5f9;
}

@media (max-width: 600px) {
  .metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
