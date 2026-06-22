<script setup lang="ts">
import type { CryptoNewsArticle } from "../../stores/types.js";

defineProps<{
  article: CryptoNewsArticle;
}>();

function formatPublishedAt(timestamp: number): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function sentimentLabel(sentiment: CryptoNewsArticle["sentiment"]): string {
  if (sentiment === "positive") return "긍정";
  if (sentiment === "negative") return "부정";
  if (sentiment === "neutral") return "중립";
  return "미분류";
}
</script>

<template>
  <article class="news-card" :class="{ stale: article.isStale }">
    <div class="news-card__meta">
      <span>{{ article.source }}</span>
      <time :datetime="new Date(article.publishedAt).toISOString()">
        {{ formatPublishedAt(article.publishedAt) }}
      </time>
      <span v-if="article.language">{{ article.language.toUpperCase() }}</span>
    </div>

    <h2>{{ article.title }}</h2>
    <p v-if="article.summary">{{ article.summary }}</p>

    <div class="news-card__tags">
      <span
        class="sentiment"
        :data-sentiment="article.sentiment"
      >
        {{ sentimentLabel(article.sentiment) }}
      </span>
      <span v-for="asset in article.assets.slice(0, 4)" :key="asset">{{ asset }}</span>
      <span v-for="category in article.categories.slice(0, 3)" :key="category">{{ category }}</span>
      <span v-if="article.isStale">stale</span>
    </div>

    <a :href="article.url" target="_blank" rel="noopener noreferrer">
      원문 열기
    </a>
  </article>
</template>

<style scoped lang="scss">
.news-card {
  display: grid;
  gap: 10px;
  min-width: 0;
  border: 1px solid var(--panel-border-soft);
  border-radius: var(--radius-sm);
  padding: 16px;
  background: rgba(255, 255, 255, 0.04);
  transition:
    border-color var(--ease),
    background var(--ease);
}

.news-card:hover,
.news-card:focus-within {
  border-color: var(--panel-border-hover);
  background: var(--panel-bg-strong);
}

.news-card.stale {
  border-color: var(--alert-border);
}

.news-card__meta,
.news-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.news-card__meta span,
.news-card__meta time,
.news-card__tags span {
  border: 1px solid var(--panel-border-soft);
  border-radius: 999px;
  padding: 4px 8px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 800;
  line-height: 1.2;
}

.news-card h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 18px;
  line-height: 1.32;
  letter-spacing: 0;
}

.news-card p {
  margin: 0;
  color: var(--text-subtle);
  font-size: 13px;
  line-height: 1.6;
}

.sentiment[data-sentiment="positive"] {
  color: var(--c-up);
  border-color: rgba(155, 225, 93, 0.4);
  background: var(--c-up-bg);
}

.sentiment[data-sentiment="negative"] {
  color: var(--c-down);
  border-color: rgba(255, 176, 46, 0.4);
  background: var(--c-down-bg);
}

.news-card a {
  justify-self: start;
  color: var(--brand-lime);
  font-size: 13px;
  font-weight: 850;
  text-decoration: none;
}

.news-card a:hover,
.news-card a:focus-visible {
  text-decoration: underline;
  outline: none;
}
</style>
