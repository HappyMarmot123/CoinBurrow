<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";

import type { CoinMetaView, MarketStatusView, MarketSummaryView, FreeApiProviderPolicy } from "../../api/rest.js";
import type { TickerView } from "../../stores/types.js";

const props = defineProps<{
  open: boolean;
  market: string;
  policy?: FreeApiProviderPolicy | null;
  selectedMarketSummary?: MarketSummaryView;
  selectedMarketStatus?: MarketStatusView;
  liveTicker?: TickerView;
  spreadRatio?: number;
  usdKrwRate: number | null;
  coinMeta?: CoinMetaView | null;
  coinMetaLoading?: boolean;
  coinMetaError?: string;
  coinMetaSource?: "coingecko" | "coinpaprika" | "";
  coinMetaLookupId?: string;
}>();

const emit = defineEmits<{ close: [] }>();

const selectedCoinMeta = computed(() => props.coinMeta ?? null);
const selectedCoinMetaDescription = computed(() => selectedCoinMeta.value?.description ?? "");
const selectedCoinMetaTags = computed(() =>
  [...new Set((selectedCoinMeta.value?.tags ?? []).slice(0, 8))],
);
const selectedCoinMetaEvents = computed(() =>
  (selectedCoinMeta.value?.recentEvents ?? []).slice(0, 4),
);
const selectedCoinMetaTeam = computed(() =>
  (selectedCoinMeta.value?.team ?? []).slice(0, 6),
);
const selectedPolicyText = computed(() => {
  if (!props.policy) return "";
  const retries = `${props.policy.requestPolicy.maxRetries}`;
  const delays = props.policy.requestPolicy.retryDelaysMs.join(", ");
  return `timeout ${props.policy.requestPolicy.timeoutMs}ms, retry x${retries} (${delays}ms)`;
});

function handleClose() {
  emit("close");
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === "Escape") {
    emit("close");
  }
}

onMounted(() => {
  document.addEventListener("keydown", handleEscape);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleEscape);
});
</script>

<template>
  <Teleport to="body" v-if="open">
    <div class="coin-meta-drawer__overlay" role="presentation" @click="handleClose" />
    <section class="coin-meta-drawer" role="dialog" aria-modal="true" :aria-label="`Coin detail ${market}`">
      <header class="coin-meta-drawer__header">
        <h2>Coin Detail</h2>
        <button type="button" class="coin-meta-drawer__close" @click="handleClose">Close</button>
      </header>

      <h3 class="coin-meta-drawer__market">{{ market }}</h3>

      <section class="coin-meta-drawer__section">
        <h4>Market snapshot</h4>
        <div class="coin-meta-drawer__grid">
          <p><strong>Base</strong> {{ props.selectedMarketSummary?.koreanName ?? "-" }}</p>
          <p><strong>English</strong> {{ props.selectedMarketSummary?.englishName ?? "-" }}</p>
          <p><strong>Quote</strong> {{ props.selectedMarketSummary?.quote ?? "-" }}</p>
          <p><strong>Trade Price</strong> {{ props.liveTicker?.tradePrice ?? "-" }}</p>
          <p><strong>24h Volume</strong> {{ props.liveTicker?.accTradePrice24h ?? "-" }}</p>
          <p><strong>Spread</strong> {{ props.spreadRatio ?? "-" }}</p>
          <p><strong>USD/KRW</strong> {{ props.usdKrwRate ?? "-" }}</p>
          <p><strong>Warning</strong> {{ props.selectedMarketStatus ? (props.selectedMarketStatus.warning ? "Warning" : "Normal") : "-" }}</p>
          <p><strong>Restriction</strong> {{ props.selectedMarketStatus?.market_warning ?? props.selectedMarketStatus?.market_warning_message ?? "-" }}</p>
        </div>
      </section>

      <section class="coin-meta-drawer__section">
        <div class="coin-meta-drawer__section-head">
          <h4>Project metadata</h4>
          <span v-if="props.coinMetaLookupId">{{ props.coinMetaLookupId }}</span>
        </div>

        <div v-if="props.coinMetaLoading && !selectedCoinMeta" class="coin-meta-drawer__empty">
          loading project metadata...
        </div>
        <div v-else-if="props.coinMetaError && !selectedCoinMeta" class="coin-meta-drawer__empty">
          {{ props.coinMetaError }}
        </div>

        <div v-if="selectedCoinMeta" class="coin-meta-drawer__meta">
          <div class="coin-meta-drawer__identity">
            <img
              v-if="selectedCoinMeta.logo"
              :alt="`${selectedCoinMeta.name} logo`"
              :src="selectedCoinMeta.logo"
            />
            <div>
              <strong>{{ selectedCoinMeta.name }}</strong>
              <small>{{ selectedCoinMeta.symbol }}{{ selectedCoinMeta.category ? ` / ${selectedCoinMeta.category}` : "" }}</small>
            </div>
          </div>

          <dl class="coin-meta-drawer__meta-grid">
            <div>
              <dt>Provider</dt>
              <dd>{{ props.coinMetaSource || "-" }}</dd>
            </div>
            <div>
              <dt>Website</dt>
              <dd>
                <a v-if="selectedCoinMeta.website" :href="selectedCoinMeta.website" target="_blank" rel="noopener noreferrer">
                  open
                </a>
                <span v-else>-</span>
              </dd>
            </div>
            <div>
              <dt>Whitepaper</dt>
              <dd>
                <a v-if="selectedCoinMeta.whitepaper" :href="selectedCoinMeta.whitepaper" target="_blank" rel="noopener noreferrer">
                  open
                </a>
                <span v-else>-</span>
              </dd>
            </div>
          </dl>

          <p v-if="selectedCoinMetaDescription" class="coin-meta-drawer__desc">
            {{ selectedCoinMetaDescription }}
          </p>

          <div v-if="selectedCoinMetaTags.length > 0" class="coin-meta-drawer__chips">
            <span v-for="tag in selectedCoinMetaTags" :key="tag">{{ tag }}</span>
          </div>

          <div v-if="selectedCoinMetaEvents.length > 0" class="coin-meta-drawer__list">
            <p>Recent Events</p>
            <ul>
              <li v-for="event in selectedCoinMetaEvents" :key="event">{{ event }}</li>
            </ul>
          </div>

          <div v-if="selectedCoinMetaTeam.length > 0" class="coin-meta-drawer__list">
            <p>Team</p>
            <ul>
              <li v-for="member in selectedCoinMetaTeam" :key="member">{{ member }}</li>
            </ul>
          </div>
        </div>
      </section>

      <section class="coin-meta-drawer__section">
        <h4>Meta fetch policy</h4>
        <div v-if="policy" class="coin-meta-drawer__meta-grid">
          <div>
            <dt>Provider</dt>
            <dd>{{ policy.provider }}</dd>
          </div>
          <div>
            <dt>Cache TTL</dt>
            <dd>{{ policy.cacheTtlMs }} ms</dd>
          </div>
          <div v-if="policy.staleCacheTtlMs">
            <dt>Stale TTL</dt>
            <dd>{{ policy.staleCacheTtlMs }} ms</dd>
          </div>
          <div>
            <dt>Timeout / Retry</dt>
            <dd>{{ selectedPolicyText || "-" }}</dd>
          </div>
        </div>
        <div v-else class="coin-meta-drawer__empty">
          Policy info is not available.
        </div>
      </section>
    </section>
  </Teleport>
</template>

<style scoped lang="scss">
.coin-meta-drawer__overlay {
  position: fixed;
  z-index: 90;
  inset: 0;
  background: rgba(6, 10, 18, 0.58);
}

.coin-meta-drawer {
  position: fixed;
  z-index: 91;
  top: 10vh;
  right: max(10px, calc(50vw - 540px));
  width: min(90vw, 560px);
  max-height: 82vh;
  overflow: auto;
  border: 1px solid var(--panel-border);
  border-radius: var(--radius);
  padding: 16px;
  background: var(--panel-bg-strong);
  backdrop-filter: blur(16px);
  box-shadow: var(--shadow);
  display: grid;
  gap: 12px;
}

.coin-meta-drawer__header {
  @include flex-between;
  gap: 10px;
}

.coin-meta-drawer__header h2 {
  margin: 0;
  @include panel-title(18px);
}

.coin-meta-drawer__close {
  @include field-control;
  width: auto;
  min-width: 64px;
  padding: 7px 10px;
}

.coin-meta-drawer__market {
  margin: 0;
  color: var(--text-strong);
}

.coin-meta-drawer__section {
  display: grid;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px solid var(--panel-border);
}

.coin-meta-drawer__section h4,
.coin-meta-drawer__section-head {
  margin: 0;
}

.coin-meta-drawer__section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.coin-meta-drawer__section-head span {
  color: var(--text-dim);
  font-size: 11px;
}

.coin-meta-drawer__grid {
  margin: 0;
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.coin-meta-drawer__grid p {
  margin: 0;
  color: var(--text-subtle);
  font-size: 13px;
}

.coin-meta-drawer__grid strong {
  color: var(--text-muted);
  margin-right: 6px;
}

.coin-meta-drawer__meta,
.coin-meta-drawer__meta-grid,
.coin-meta-drawer__chips,
.coin-meta-drawer__list ul {
  margin: 0;
}

.coin-meta-drawer__meta-grid {
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.coin-meta-drawer__meta-grid div {
  min-width: 0;
}

.coin-meta-drawer__meta-grid dt,
.coin-meta-drawer__meta-grid dd {
  margin: 0;
}

.coin-meta-drawer__meta-grid dt {
  color: var(--text-muted);
  font-size: 11px;
}

.coin-meta-drawer__meta-grid dd {
  color: var(--text-strong);
  font-size: 12px;
  font-weight: 700;
}

.coin-meta-drawer__identity {
  display: grid;
  gap: 8px;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
}

.coin-meta-drawer__identity img {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid var(--panel-border);
  background: var(--panel-bg);
}

.coin-meta-drawer__identity strong {
  display: block;
  color: var(--text-strong);
  font-size: 13px;
}

.coin-meta-drawer__identity small {
  color: var(--text-muted);
  font-size: 11px;
}

.coin-meta-drawer__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.coin-meta-drawer__chips span {
  border: 1px solid var(--panel-border);
  border-radius: 999px;
  padding: 4px 7px;
  color: var(--text-muted);
  font-size: 11px;
}

.coin-meta-drawer__desc {
  margin: 0;
  color: var(--text-subtle);
  font-size: 12px;
  line-height: 1.5;
}

.coin-meta-drawer__list p {
  margin: 0 0 4px;
  color: var(--text-muted);
  font-size: 11px;
}

.coin-meta-drawer__list ul {
  padding-left: 16px;
  color: var(--text-strong);
}

.coin-meta-drawer__empty {
  border: 1px dashed var(--panel-border-soft);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  color: var(--text-muted);
  font-size: 11px;
}

@media (max-width: 640px) {
  .coin-meta-drawer {
    top: 6vh;
    width: min(96vw, 560px);
    max-height: 86vh;
  }

  .coin-meta-drawer__grid,
  .coin-meta-drawer__meta-grid {
    grid-template-columns: 1fr;
  }
}
</style>
