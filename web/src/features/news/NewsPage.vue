<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import NewsCard from "./NewsCard.vue";
import NewsEmptyState from "./NewsEmptyState.vue";
import NewsFilters from "./NewsFilters.vue";
import NewsSkeleton from "./NewsSkeleton.vue";
import { useNewsStore } from "../../stores/news.js";

const newsStore = useNewsStore();
const searchInput = ref(newsStore.query.q);

let searchTimer: number | undefined;

const statusText = computed(() => {
  if (newsStore.refreshing) return "갱신 중";
  if (newsStore.stale) return "캐시 표시 중";
  if (!newsStore.lastFetchedAt) return "대기 중";
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(newsStore.lastFetchedAt));
});

const sourceCount = computed(() => newsStore.sources?.sources.length ?? 0);
const categoryCount = computed(() => newsStore.sources?.categories.length ?? 0);

onMounted(() => {
  void newsStore.loadSources();
  void newsStore.loadNews();
});

onBeforeUnmount(() => {
  if (searchTimer) window.clearTimeout(searchTimer);
});

watch(searchInput, (value) => {
  if (searchTimer) window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    void newsStore.setQuery({ q: value });
  }, 300);
});

function setAsset(asset: string) {
  void newsStore.setQuery({ asset });
}

function resetFilters() {
  searchInput.value = "";
  void newsStore.resetFilters();
}
</script>

<template>
  <main class="news-page">
    <section class="news-layout">
      <aside class="panel news-filter-panel">
        <nav class="news-nav" aria-label="주요 메뉴">
          <router-link to="/" class="brand">CoinBurrow</router-link>
          <div>
            <router-link to="/exchange">마켓</router-link>
            <router-link to="/news" aria-current="page">뉴스</router-link>
          </div>
        </nav>

        <section class="news-title">
          <p>Crypto News</p>
          <h1>크립토 뉴스</h1>
          <dl>
            <div>
              <dt>상태</dt>
              <dd>{{ statusText }}</dd>
            </div>
            <div>
              <dt>소스</dt>
              <dd>{{ sourceCount.toLocaleString() }}</dd>
            </div>
            <div>
              <dt>카테고리</dt>
              <dd>{{ categoryCount.toLocaleString() }}</dd>
            </div>
          </dl>
        </section>

        <NewsFilters
          v-model:query="searchInput"
          :asset="newsStore.query.asset"
          :refreshing="newsStore.refreshing"
          :disabled="newsStore.loading"
          @update:asset="setAsset"
          @refresh="newsStore.refreshNews"
          @reset="resetFilters"
        />
      </aside>

      <section class="panel news-feed" aria-live="polite">
        <div class="feed-head">
          <h2>최신 뉴스</h2>
          <span>{{ newsStore.articles.length.toLocaleString() }}개</span>
        </div>

        <p v-if="newsStore.error" class="news-error">
          {{ newsStore.error }}
        </p>

        <NewsSkeleton v-if="newsStore.loading" />
        <NewsEmptyState v-else-if="newsStore.articles.length === 0" />
        <div v-else class="news-list">
          <NewsCard
            v-for="article in newsStore.articles"
            :key="article.id"
            :article="article"
          />
        </div>

        <button
          v-if="newsStore.nextCursor && !newsStore.loading"
          class="load-more"
          type="button"
          :disabled="newsStore.loadingMore"
          @click="newsStore.loadMore"
        >
          {{ newsStore.loadingMore ? "불러오는 중" : "더 보기" }}
        </button>
      </section>
    </section>
  </main>
</template>

<style scoped lang="scss">
:global(body) {
  margin: 0;
}

.news-page {
  min-height: 100vh;
  padding: 18px 0 36px;
  color: var(--text);
  font-family: $font-sans;
  background:
    radial-gradient(900px 420px at 20% -120px, rgba(217, 255, 102, 0.14), transparent 62%),
    radial-gradient(760px 400px at 100% 0, rgba(255, 176, 46, 0.12), transparent 60%),
    linear-gradient(to bottom right, var(--bg-page), var(--bg-page-mid) 42%, var(--bg-page-soft));
}

.news-layout {
  width: min(1320px, calc(100% - 40px));
  margin: 0 auto;
}

.news-nav {
  display: grid;
  gap: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--panel-line);
}

.news-nav div {
  display: flex;
  gap: 8px;
}

.news-nav a {
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 850;
  text-decoration: none;
}

.news-nav a:hover,
.news-nav a:focus-visible,
.news-nav a[aria-current="page"] {
  border-color: var(--panel-border-hover);
  color: var(--brand-lime);
  outline: none;
}

.news-nav .brand {
  border-color: transparent;
  padding-left: 0;
  color: var(--text-strong);
  font-size: 17px;
}

.news-title {
  display: grid;
  gap: 12px;
  border-bottom: 1px solid var(--panel-line);
  padding-bottom: 16px;
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

.news-title dl {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin: 0;
}

.news-title dl div {
  border: 1px solid var(--panel-border-soft);
  border-radius: var(--radius-sm);
  padding: 10px;
  background: var(--panel-bg);
}

.news-title dt {
  @include muted-label;
}

.news-title dd {
  margin: 4px 0 0;
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 900;
}

.news-layout {
  display: grid;
  grid-template-columns: minmax(240px, 320px) minmax(0, 1fr);
  gap: 14px;
}

.panel {
  @include exchange-panel;
}

.news-filter-panel {
  display: grid;
  gap: 16px;
  align-self: start;
  position: sticky;
  top: 14px;
}

.news-feed {
  display: grid;
  gap: 14px;
}

.feed-head {
  @include panel-head;
  margin-bottom: 0;
}

.feed-head h2 {
  @include panel-title(20px);
}

.feed-head span {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 800;
}

.news-error {
  margin: 0;
  border: 1px solid var(--alert-border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  color: var(--alert-text);
  background: var(--alert-bg);
  font-size: 13px;
}

.news-list {
  display: grid;
  gap: 12px;
}

.load-more {
  justify-self: center;
  min-width: 140px;
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  color: var(--text-strong);
  background: var(--panel-bg-strong);
  font: inherit;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
}

.load-more:hover,
.load-more:focus-visible {
  border-color: var(--panel-border-hover);
  color: var(--brand-lime);
  outline: none;
}

@media (max-width: 880px) {
  .news-layout {
    width: min(880px, calc(100% - 24px));
  }

  .news-layout {
    grid-template-columns: 1fr;
  }

  .news-filter-panel {
    position: static;
  }
}

@media (max-width: 640px) {
  .news-page {
    padding-top: 12px;
  }

  .news-nav div {
    width: 100%;
  }

  .news-nav div a {
    flex: 1 1 0;
    text-align: center;
  }
}
</style>
