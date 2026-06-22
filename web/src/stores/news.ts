import { defineStore } from "pinia";
import { getNewsArticles, getNewsSources, type NewsQueryOptions } from "../api/rest.js";
import { NEWS_PAGE_SIZE } from "../constants/news.js";
import type { CryptoNewsArticle, CryptoNewsSourceSummary } from "./types.js";

export interface NewsStoreQuery {
  q: string;
  asset: string;
  category: string;
  language: "all" | "ko" | "en";
  source: string;
}

interface NewsState {
  articles: CryptoNewsArticle[];
  sources: CryptoNewsSourceSummary | null;
  query: NewsStoreQuery;
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  stale: boolean;
  lastFetchedAt: number | null;
  nextCursor?: string;
}

function toRequestOptions(
  query: NewsStoreQuery,
  overrides: Partial<NewsQueryOptions> = {},
): NewsQueryOptions {
  return {
    q: query.q.trim() || undefined,
    asset: query.asset,
    category: query.category.trim() || undefined,
    language: query.language,
    source: query.source && query.source !== "ALL" ? query.source : undefined,
    limit: NEWS_PAGE_SIZE,
    ...overrides,
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "뉴스를 불러오지 못했습니다.";
}

export const useNewsStore = defineStore("news", {
  state: (): NewsState => ({
    articles: [],
    sources: null,
    query: {
      q: "",
      asset: "ALL",
      category: "",
      language: "all",
      source: "ALL",
    },
    loading: false,
    refreshing: false,
    loadingMore: false,
    error: null,
    stale: false,
    lastFetchedAt: null,
    nextCursor: undefined,
  }),
  actions: {
    async loadNews(options: Partial<NewsQueryOptions> = {}) {
      const hasArticles = this.articles.length > 0;
      this.loading = !hasArticles;
      this.refreshing = hasArticles;
      this.error = null;

      try {
        const response = await getNewsArticles(toRequestOptions(this.query, options));
        this.articles = response.articles;
        this.nextCursor = response.nextCursor;
        this.lastFetchedAt = response.fetchedAt;
        this.stale = response.stale;
      } catch (error) {
        this.error = getErrorMessage(error);
      } finally {
        this.loading = false;
        this.refreshing = false;
      }
    },
    async refreshNews() {
      await this.loadNews();
    },
    async loadMore() {
      if (!this.nextCursor || this.loadingMore) return;

      this.loadingMore = true;
      this.error = null;

      try {
        const response = await getNewsArticles(toRequestOptions(this.query, {
          cursor: this.nextCursor,
        }));
        const existing = new Set(this.articles.map((article) => article.id));
        this.articles = [
          ...this.articles,
          ...response.articles.filter((article) => !existing.has(article.id)),
        ];
        this.nextCursor = response.nextCursor;
        this.lastFetchedAt = response.fetchedAt;
        this.stale = response.stale;
      } catch (error) {
        this.error = getErrorMessage(error);
      } finally {
        this.loadingMore = false;
      }
    },
    async setQuery(nextQuery: Partial<NewsStoreQuery>) {
      this.query = { ...this.query, ...nextQuery };
      this.nextCursor = undefined;
      await this.loadNews();
    },
    async resetFilters() {
      this.query = {
        q: "",
        asset: "ALL",
        category: "",
        language: "all",
        source: "ALL",
      };
      this.nextCursor = undefined;
      await this.loadNews();
    },
    async loadSources() {
      try {
        this.sources = await getNewsSources();
      } catch {
        this.sources = null;
      }
    },
  },
});
