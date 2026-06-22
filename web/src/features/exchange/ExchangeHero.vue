<script setup lang="ts">
import { computed } from "vue";
import type { CoinMetaView, MarketStatusView, MarketSummaryView } from "../../api/rest.js";
import type { TickerView } from "../../stores/types.js";
import { formatCompact, formatPrice, formatRatio } from "../../utils/format.js";

const props = defineProps<{
  exchangeError: string;
  statusError: string;
  market: string;
  selectedMarketLabel: string;
  marketState: string;
  quote: string;
  selectedMarketStatus?: MarketStatusView;
  selectedMarketSummary?: MarketSummaryView;
  marketRestriction: string;
  marketStatusCautions: string[];
  liveTicker?: TickerView;
  spreadRatio?: number;
  usdKrwRate: number | null;
  coinMeta?: CoinMetaView | null;
}>();

const assetCode = computed(() => props.market.split("-").at(-1) ?? props.market);
const signedChangeRate = computed(() => props.liveTicker?.signedChangeRate);
const movementClass = computed(() => {
  const rate = signedChangeRate.value ?? 0;
  if (rate > 0) return "is-up";
  if (rate < 0) return "is-down";
  return "is-flat";
});
const signedRateLabel = computed(() => {
  const rate = signedChangeRate.value;
  if (typeof rate !== "number") return "-";
  const sign = rate > 0 ? "+" : "";
  return `${sign}${(rate * 100).toFixed(2)}%`;
});
const hasError = computed(() => Boolean(props.exchangeError || props.statusError));

const selectedCoinMeta = computed(() => props.coinMeta ?? null);
const selectedCoinLogo = computed(() => selectedCoinMeta.value?.logo ?? "");
const selectedCoinIconFallback = computed(() => {
  const label = props.selectedMarketLabel.trim();
  const code = assetCode.value.trim();
  const candidate = label[0] ?? code[0] ?? "M";
  return candidate.toUpperCase();
});
</script>

<template>
  <section class="exchange-hero" aria-label="선택 마켓 티커">
    <div class="market-ticker">
      <div class="market-ticker__primary">
        <div class="market-id">
          <span class="market-id__icon" :title="selectedCoinLogo ? `${selectedMarketLabel} logo` : undefined">
            <img
              v-if="selectedCoinLogo"
              :alt="`${selectedMarketLabel} logo`"
              :src="selectedCoinLogo"
            />
            <span v-else>{{ selectedCoinIconFallback }}</span>
          </span>
          <span class="market-id__name">{{ selectedMarketLabel }}</span>
          <span class="market-id__code">{{ assetCode }}</span>
          <span class="market-id__quote">{{ quote }}</span>
        </div>

        <div class="market-price" :class="movementClass">
          <span>현재가</span>
          <strong>{{ formatPrice(liveTicker?.tradePrice) }}</strong>
          <em>{{ signedRateLabel }}</em>
        </div>

        <div class="ticker-chips" aria-label="마켓 보조 지표">
          <span class="ticker-chip">
            <span>24h 거래대금</span>
            <strong>{{ formatCompact(liveTicker?.accTradePrice24h) }}</strong>
          </span>
          <span class="ticker-chip">
            <span>스프레드</span>
            <strong>{{ formatRatio(spreadRatio) }}</strong>
          </span>
          <span class="ticker-chip">
            <span>시장 상태</span>
            <strong>{{ marketState }}</strong>
          </span>
          <span v-if="usdKrwRate" class="ticker-chip">
            <span>USD/KRW</span>
            <strong>{{ formatPrice(usdKrwRate) }}</strong>
          </span>
        </div>
      </div>

      <div class="market-details" aria-label="선택 마켓 상세">
        <div class="market-details__meta">
          <div class="market-details__head">
            <h2>선택 마켓 상세</h2>
          </div>
          <p class="market-details__state">
            {{ selectedMarketStatus ? marketState : "선택 마켓 메타정보 대기중입니다." }}
          </p>
        </div>

        <dl class="market-details__grid">
          <div>
            <dt>마켓</dt>
            <dd>{{ selectedMarketSummary?.market ?? market }}</dd>
          </div>
          <div>
            <dt>심볼</dt>
            <dd>{{ selectedMarketSummary?.englishName ?? "-" }}</dd>
          </div>
          <div>
            <dt>제재</dt>
            <dd>{{ marketRestriction }}</dd>
          </div>
          <div>
            <dt>주의 항목</dt>
            <dd v-if="marketStatusCautions.length === 0">-</dd>
            <dd v-else>
              <ul class="market-caution-list">
                <li v-for="caution in marketStatusCautions" :key="caution">
                  {{ caution }}
                </li>
              </ul>
            </dd>
          </div>
        </dl>

      </div>
    </div>

    <div v-if="hasError" class="hero-alerts" role="alert">
      <p v-if="exchangeError">{{ exchangeError }}</p>
      <p v-if="statusError">{{ statusError }}</p>
    </div>
  </section>
</template>

<style scoped lang="scss">
.exchange-hero {
  width: min(1500px, calc(100% - 40px));
  margin: 0 auto 14px;
  position: relative;
  z-index: 1;
  padding-top: 12px;
}

.market-ticker {
  @include exchange-panel;
  display: grid;
  grid-template-columns: minmax(0, 6fr) minmax(0, 4fr);
  grid-template-areas: "primary details";
  align-items: stretch;
  gap: 14px;
  background: var(--panel-bg-strong);
  backdrop-filter: blur(16px);
}

.market-ticker__primary {
  grid-area: primary;
  min-width: 0;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas:
    "id"
    "price"
    "chips";
  align-items: stretch;
  gap: 14px;
}

.market-id {
  grid-area: id;
  align-self: center;
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
}

.market-id__icon {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  border: 1px solid var(--panel-border);
  border-radius: 999px;
  background: var(--panel-bg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.market-id__icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.market-id__icon span {
  color: var(--text-strong);
  font-size: 12px;
  font-weight: 800;
}

.market-id__name {
  min-width: 0;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 17px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.market-id__code,
.market-id__quote {
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  padding: 4px 7px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 800;
}

.market-id__quote {
  border-color: var(--panel-border-hover);
  color: var(--brand-lime);
}

.market-price {
  grid-area: price;
  align-self: center;
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: baseline;
  justify-content: start;
  gap: 10px;
  font-variant-numeric: tabular-nums;
}

.market-price span {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 800;
}

.market-price strong {
  overflow: hidden;
  color: var(--text-strong);
  font-size: clamp(26px, 3vw, 36px);
  font-weight: 850;
  line-height: 1;
  text-overflow: ellipsis;
}

.market-price em {
  font-style: normal;
  font-size: 15px;
  font-weight: 850;
}

.market-price.is-up em {
  color: var(--c-up);
}

.market-price.is-down em {
  color: var(--c-down);
}

.market-price.is-flat em {
  color: var(--c-flat);
}

.ticker-chips {
  grid-area: chips;
  align-self: end;
  min-width: 0;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  @include thin-scrollbar;
}

.ticker-chip {
  flex: 0 0 auto;
  display: grid;
  gap: 3px;
  min-width: 116px;
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  background: var(--panel-bg);
}

.ticker-chip span {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 800;
}

.ticker-chip strong {
  color: var(--text);
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
}

.market-details {
  grid-area: details;
  min-width: 0;
  display: grid;
  align-content: start;
  grid-template-columns: 1fr;
  gap: 12px;
  border-left: 1px solid var(--panel-border);
  padding-left: 14px;
}

.market-details__meta {
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 6px;
}

.market-details__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.market-details__head h2 {
  @include panel-title(15px);
}

.market-details dt {
  @include muted-label;
}

.market-details__state {
  margin: 0;
  color: var(--text-subtle);
  font-size: 13px;
  font-weight: 700;
}

.market-details__grid {
  min-width: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.market-details__grid > div {
  min-width: 0;
}

.market-details dd {
  margin: 3px 0 0;
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.market-caution-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
}

.market-caution-list li {
  margin: 0;
}

.hero-alerts {
  display: grid;
  gap: 6px;
  margin-top: 8px;
  border: 1px solid var(--alert-border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  background: var(--alert-bg);
  color: var(--alert-text);
  font-size: 13px;
  font-weight: 700;
}

.hero-alerts p {
  margin: 0;
}

@media (max-width: 1200px) {
  .exchange-hero {
    width: min(1300px, calc(100% - 28px));
  }
}

@media (max-width: 960px) {
  .ticker-chips {
    margin-right: -16px;
    padding-right: 16px;
  }

  .market-details__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .exchange-hero {
    width: min(640px, calc(100% - 20px));
    padding-top: 8px;
  }

  .market-ticker {
    grid-template-columns: 1fr;
    grid-template-areas:
      "primary"
      "details";
    gap: 12px;
    padding: 14px;
  }

  .market-ticker__primary {
    grid-template-columns: 1fr;
    grid-template-areas:
      "id"
      "price"
      "chips";
  }

  .market-id {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .market-id__quote {
    grid-column: 2 / -1;
    width: fit-content;
  }

  .market-price {
    grid-template-columns: 1fr auto;
    justify-content: start;
  }

  .market-price span {
    grid-column: 1 / -1;
  }

  .market-price strong {
    font-size: 28px;
  }

  .market-details__head {
    display: grid;
  }

  .market-details {
    grid-template-columns: 1fr;
    border-top: 1px solid var(--panel-border);
    border-left: 0;
    padding-top: 12px;
    padding-left: 0;
  }

  .market-details__grid {
    grid-template-columns: 1fr;
  }
}
</style>
