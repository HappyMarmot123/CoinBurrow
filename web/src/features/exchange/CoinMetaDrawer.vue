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
  return `타임아웃 ${props.policy.requestPolicy.timeoutMs}ms, 재시도 x${retries} (${delays}ms)`;
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
    <div class="coin-meta-drawer__overlay" role="presentation" @click="handleClose">
      <section class="coin-meta-drawer" role="dialog" aria-modal="true" :aria-label="`코인 상세 ${market}`" @click.stop>
        <header class="coin-meta-drawer__header">
          <h2>코인 상세</h2>
          <button type="button" class="coin-meta-drawer__close" @click="handleClose">닫기</button>
        </header>
        <h3 class="coin-meta-drawer__market">{{ market }}</h3>

        <section class="coin-meta-drawer__section">
          <h4>마켓 스냅샷</h4>
          <div class="coin-meta-drawer__grid">
            <p><strong>기본 자산</strong> {{ props.selectedMarketSummary?.koreanName ?? "-" }}</p>
            <p><strong>영문명</strong> {{ props.selectedMarketSummary?.englishName ?? "-" }}</p>
            <p><strong>기준통화</strong> {{ props.selectedMarketSummary?.quote ?? "-" }}</p>
            <p><strong>현재가</strong> {{ props.liveTicker?.tradePrice ?? "-" }}</p>
            <p><strong>24H 거래대금</strong> {{ props.liveTicker?.accTradePrice24h ?? "-" }}</p>
            <p><strong>스프레드</strong> {{ props.spreadRatio ?? "-" }}</p>
            <p><strong>USD/KRW</strong> {{ props.usdKrwRate ?? "-" }}</p>
            <p>
              <strong>상태</strong>
              {{ props.selectedMarketStatus ? (props.selectedMarketStatus.warning ? "위험" : "안전") : "-" }}
            </p>
            <p>
              <strong>거래 제약</strong>
              {{ props.selectedMarketStatus?.market_warning ?? props.selectedMarketStatus?.market_warning_message ?? "-" }}
            </p>
          </div>
        </section>

        <section class="coin-meta-drawer__section">
          <div class="coin-meta-drawer__section-head">
            <h4>프로젝트 메타데이터</h4>
            <span v-if="props.coinMetaLookupId">{{ props.coinMetaLookupId }}</span>
          </div>

          <div v-if="props.coinMetaLoading && !selectedCoinMeta" class="coin-meta-drawer__empty">
            프로젝트 메타데이터를 조회 중입니다.
          </div>
          <div v-else-if="props.coinMetaError && !selectedCoinMeta" class="coin-meta-drawer__empty">
            {{ props.coinMetaError }}
          </div>

          <div v-if="selectedCoinMeta" class="coin-meta-drawer__meta">
            <div class="coin-meta-drawer__identity">
              <img
                v-if="selectedCoinMeta.logo"
                :alt="`${selectedCoinMeta.name} 로고`"
                :src="selectedCoinMeta.logo"
              />
              <div>
                <strong>{{ selectedCoinMeta.name }}</strong>
                <small>{{ selectedCoinMeta.symbol }}{{ selectedCoinMeta.category ? ` / ${selectedCoinMeta.category}` : "" }}</small>
              </div>
            </div>

            <dl class="coin-meta-drawer__meta-grid">
              <div>
                <dt>데이터 제공사</dt>
                <dd>{{ props.coinMetaSource || "-" }}</dd>
              </div>
              <div>
                <dt>웹사이트</dt>
                <dd>
                  <a v-if="selectedCoinMeta.website" :href="selectedCoinMeta.website" target="_blank" rel="noopener noreferrer">
                    열기
                  </a>
                  <span v-else>-</span>
                </dd>
              </div>
              <div>
                <dt>백서</dt>
                <dd>
                  <a v-if="selectedCoinMeta.whitepaper" :href="selectedCoinMeta.whitepaper" target="_blank" rel="noopener noreferrer">
                    열기
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
              <p>최근 이벤트</p>
              <ul>
                <li v-for="event in selectedCoinMetaEvents" :key="event">{{ event }}</li>
              </ul>
            </div>

            <div v-if="selectedCoinMetaTeam.length > 0" class="coin-meta-drawer__list">
              <p>팀</p>
              <ul>
                <li v-for="member in selectedCoinMetaTeam" :key="member">{{ member }}</li>
              </ul>
            </div>
          </div>
        </section>

        <section class="coin-meta-drawer__section">
          <h4>메타 조회 정책</h4>
          <div v-if="policy" class="coin-meta-drawer__meta-grid">
            <div>
              <dt>제공사</dt>
              <dd>{{ policy.provider }}</dd>
            </div>
            <div>
              <dt>캐시 TTL</dt>
              <dd>{{ policy.cacheTtlMs }} ms</dd>
            </div>
            <div v-if="policy.staleCacheTtlMs">
              <dt>스테일 캐시 TTL</dt>
              <dd>{{ policy.staleCacheTtlMs }} ms</dd>
            </div>
            <div>
              <dt>타임아웃 / 재시도</dt>
              <dd>{{ selectedPolicyText || "-" }}</dd>
            </div>
          </div>
          <div v-else class="coin-meta-drawer__empty">
            정책 정보를 불러오지 못했습니다.
          </div>
        </section>
      </section>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.coin-meta-drawer__overlay {
  position: fixed;
  z-index: 90;
  inset: 0;
  background: rgba(2, 8, 20, 0.72);
  padding: max(12px, 2vw);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  overflow-y: overlay;
  -webkit-overflow-scrolling: touch;
  cursor: pointer;
}

.coin-meta-drawer {
  position: relative;
  z-index: 91;
  width: min(92vw, 560px);
  max-height: min(90vh, 860px);
  overflow: auto;
  border: 1px solid var(--panel-border);
  border-radius: var(--radius);
  padding: 16px;
  background: rgb(12, 21, 36);
  border-color: rgba(217, 255, 102, 0.34);
  color: var(--text-strong);
  backdrop-filter: blur(16px);
  box-shadow: 0 24px 56px rgba(0, 0, 0, 0.58), 0 0 0 1px rgba(217, 255, 102, 0.22);
  display: grid;
  gap: 12px;
  cursor: auto;
}

.coin-meta-drawer__header {
  @include flex-between;
  gap: 10px;
  padding-bottom: 6px;
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
  color: #ffebbc;
  border-color: rgba(217, 255, 102, 0.55);
  background: rgba(217, 255, 102, 0.08);
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
  color: #f4f7ff;
}

.coin-meta-drawer__section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.coin-meta-drawer__section-head span {
  color: #b8c4d8;
  font-size: 11px;
}

.coin-meta-drawer__grid {
  margin: 0;
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  color: var(--text-strong);
}

.coin-meta-drawer__grid p {
  margin: 0;
  color: var(--text-strong);
  font-size: 13px;
}

.coin-meta-drawer__grid strong {
  color: var(--text-muted);
  margin-right: 6px;
  font-weight: 700;
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
  color: #b5c4d8;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.coin-meta-drawer__meta-grid dd {
  color: #f0f5ff;
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
  color: #f4f7ff;
  font-size: 13px;
  font-weight: 700;
}

.coin-meta-drawer__identity small {
  color: #b3c1d7;
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
  color: #f1f6ff;
  font-size: 11px;
  background: rgba(217, 255, 102, 0.12);
}

.coin-meta-drawer__desc {
  margin: 0;
  color: #d8e1ef;
  font-size: 12px;
  line-height: 1.5;
  white-space: normal;
}

.coin-meta-drawer__list p {
  margin: 0 0 4px;
  color: #dce4f3;
  font-size: 11px;
  font-weight: 700;
}

.coin-meta-drawer__list ul {
  padding-left: 16px;
  color: var(--text-strong);
}

.coin-meta-drawer__empty {
  border: 1px dashed var(--panel-border-soft);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  color: #d8e2f3;
  font-size: 11px;
}

@media (max-width: 640px) {
  .coin-meta-drawer {
    width: min(96vw, 560px);
    max-height: min(92vh, 780px);
    padding: 14px;
  }

  .coin-meta-drawer__grid,
  .coin-meta-drawer__meta-grid {
    grid-template-columns: 1fr;
  }
}
</style>
