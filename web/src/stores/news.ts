import { defineStore } from "pinia";
import { getNewsArticles, getNewsSources, type NewsQueryOptions } from "../api/rest.js";
import {
  NEWS_HOT_ALERT_COOLDOWN_MS,
  NEWS_HOT_ALERT_HISTORY_LIMIT,
  NEWS_HOT_ALERT_POLL_LIMIT,
  NEWS_HOT_ALERT_RECENCY_WINDOW_MS,
  NEWS_HOT_ALERT_TOP_N,
  NEWS_PAGE_SIZE,
} from "../constants/news.js";
import type { CryptoNewsArticle, CryptoNewsSourceSummary } from "./types.js";

export interface NewsStoreQuery {
  q: string;
  asset: string;
  category: string;
  language: "all" | "ko" | "en";
  source: string;
}

export interface NewsHotIssue {
  topic: string;
  label: string;
  headline: string;
  url: string;
  count: number;
  score: number;
  firstSeenAt: number;
}

export interface NewsHotAlertHistoryItem extends NewsHotIssue {
  seenAt: number;
}

interface HotAlertStorage {
  enabled: boolean;
  history: NewsHotAlertHistoryItem[];
  cooldown: Record<string, number>;
  updatedAt: number;
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
  hotAlertEnabled: boolean;
  hotAlertPermission: NotificationPermission;
  hotAlertTopIssues: NewsHotIssue[];
  hotAlertHistory: NewsHotAlertHistoryItem[];
  hotAlertCooldown: Record<string, number>;
  hotAlertUpdatedAt: number | null;
}

const HOT_ALERT_STORAGE_KEY = "coinburrow.news.hotAlerts";

interface TopicAggregate {
  topic: string;
  label: string;
  count: number;
  latestAt: number;
  firstSeenAt: number;
  latestHeadline: string;
  latestUrl: string;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "failed to load data";
}

function hasNotificationSupport(): boolean {
  return typeof Notification !== "undefined" && typeof window !== "undefined";
}

function getNotificationPermission(): NotificationPermission {
  if (!hasNotificationSupport()) {
    return "denied";
  }
  return Notification.permission;
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

function parseIntSafe(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.floor(value));
}

function parseStringSafe(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  return value.trim();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function loadHotAlertStateFromStorage(): HotAlertStorage {
  if (typeof localStorage === "undefined") {
    return {
      enabled: false,
      history: [],
      cooldown: {},
      updatedAt: 0,
    };
  }

  const raw = localStorage.getItem(HOT_ALERT_STORAGE_KEY);
  if (!raw) {
    return {
      enabled: false,
      history: [],
      cooldown: {},
      updatedAt: 0,
    };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isPlainObject(parsed)) {
      throw new Error("invalid payload");
    }

    const history = Array.isArray(parsed.history)
      ? parsed.history
        .map((item): NewsHotAlertHistoryItem | null => {
          if (!isPlainObject(item)) {
            return null;
          }

          const topic = parseStringSafe(item.topic, "");
          if (!topic) {
            return null;
          }

          return {
            topic,
            label: parseStringSafe(item.label, topic),
            headline: parseStringSafe(item.headline, ""),
            url: parseStringSafe(item.url, ""),
            count: parseIntSafe(item.count, 0),
            score: parseIntSafe(item.score, 0),
            firstSeenAt: parseIntSafe(item.firstSeenAt, 0),
            seenAt: parseIntSafe(item.seenAt, 0),
          };
        })
        .filter((item): item is NewsHotAlertHistoryItem => item !== null)
      : [];

    const cooldownSource = isPlainObject(parsed.cooldown) ? parsed.cooldown : {};
    const cooldown = Object.fromEntries(
      Object.entries(cooldownSource).map(([topic, ts]) => [topic, parseIntSafe(ts, 0)]),
    ) as Record<string, number>;

    return {
      enabled: parsed.enabled === true,
      history,
      cooldown,
      updatedAt: parseIntSafe(parsed.updatedAt, 0),
    };
  } catch {
    return {
      enabled: false,
      history: [],
      cooldown: {},
      updatedAt: 0,
    };
  }
}

function saveHotAlertState(state: HotAlertStorage): void {
  if (typeof localStorage === "undefined") {
    return;
  }

  const payload = {
    ...state,
    cooldown: Object.fromEntries(
      Object.entries(state.cooldown)
        .filter(([, ts]) => ts > 0),
    ),
  };
  localStorage.setItem(HOT_ALERT_STORAGE_KEY, JSON.stringify(payload));
}

function normalizeTopic(raw: string): string {
  return raw.trim().toUpperCase();
}

function makeIssueLabel(topic: string): string {
  if (topic.length <= 5 && topic === topic.toUpperCase()) {
    return topic;
  }
  return `${topic[0]}${topic.slice(1).toLowerCase()}`;
}

function getRecencyScore(publishedAt: number, now: number): number {
  const ageMs = Math.max(0, now - publishedAt);
  if (ageMs >= NEWS_HOT_ALERT_RECENCY_WINDOW_MS) {
    return 0;
  }
  const decay = 1 - ageMs / NEWS_HOT_ALERT_RECENCY_WINDOW_MS;
  return Number(Math.max(0, decay).toFixed(3));
}

function computeHotIssues(articles: CryptoNewsArticle[]): NewsHotIssue[] {
  const now = Date.now();
  const totals = new Map<string, TopicAggregate>();

  for (const article of articles) {
    const headline = article.title?.trim() || "";
    const url = article.url?.trim() || "";

    for (const rawTopic of article.assets) {
      const topic = normalizeTopic(rawTopic);
      if (!topic) {
        continue;
      }

      const current = totals.get(topic);
      if (!current) {
        totals.set(topic, {
          topic,
          label: makeIssueLabel(topic),
          count: 1,
          latestAt: article.publishedAt,
          firstSeenAt: article.publishedAt,
          latestHeadline: headline,
          latestUrl: url,
        });
        continue;
      }

      current.count += 1;
      if (article.publishedAt > current.latestAt) {
        current.latestAt = article.publishedAt;
        current.latestHeadline = headline;
        current.latestUrl = url;
      }
      if (article.publishedAt < current.firstSeenAt) {
        current.firstSeenAt = article.publishedAt;
      }
    }
  }

  return Array.from(totals.values())
    .map((item) => {
      const score = item.count + getRecencyScore(item.latestAt, now);
      return {
        topic: item.topic,
        label: item.label,
        headline: item.latestHeadline,
        url: item.latestUrl,
        count: item.count,
        score: Number(score.toFixed(3)),
        firstSeenAt: item.firstSeenAt,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return b.firstSeenAt - a.firstSeenAt;
    })
    .slice(0, NEWS_HOT_ALERT_TOP_N);
}

function trimHistory(
  history: NewsHotAlertHistoryItem[],
  max = NEWS_HOT_ALERT_HISTORY_LIMIT,
): NewsHotAlertHistoryItem[] {
  return [...history]
    .sort((a, b) => b.seenAt - a.seenAt)
    .slice(0, max);
}

function pushUniqueHistory(
  history: NewsHotAlertHistoryItem[],
  issue: NewsHotAlertHistoryItem,
  max: number,
): NewsHotAlertHistoryItem[] {
  const deduped = history.filter((item) => item.topic !== issue.topic);
  return trimHistory([issue, ...deduped], max);
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
    hotAlertEnabled: false,
    hotAlertPermission: getNotificationPermission(),
    hotAlertTopIssues: [],
    hotAlertHistory: [],
    hotAlertCooldown: {},
    hotAlertUpdatedAt: null,
  }),
  actions: {
    async loadHotAlertState() {
      const saved = loadHotAlertStateFromStorage();
      this.hotAlertEnabled = saved.enabled;
      this.hotAlertHistory = saved.history;
      this.hotAlertCooldown = saved.cooldown;
      this.hotAlertUpdatedAt = saved.updatedAt || null;
      this.hotAlertPermission = getNotificationPermission();
    },

    async requestNotificationPermission() {
      if (!hasNotificationSupport()) {
        this.hotAlertPermission = "denied";
        this.hotAlertEnabled = false;
        return;
      }

      const permission = await Notification.requestPermission();
      this.hotAlertPermission = permission;
      this.hotAlertEnabled = permission === "granted";
      this.persistHotAlertState();

      if (permission === "granted") {
        this.evaluateAndNotifyHotAlerts();
      }
    },

    setHotAlertEnabled(enabled: boolean) {
      this.hotAlertEnabled = enabled;
      this.persistHotAlertState();

      if (enabled) {
        this.evaluateAndNotifyHotAlerts();
      }
    },

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
        this.evaluateAndNotifyHotAlerts();
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

    async refreshHotAlertSnapshot() {
      try {
        const response = await getNewsArticles(
          toRequestOptions(this.query, { limit: NEWS_HOT_ALERT_POLL_LIMIT }),
        );
        this.evaluateAndNotifyHotAlertsFromArticles(response.articles);
      } catch {
        return;
      }
    },

    async loadMore() {
      if (!this.nextCursor || this.loadingMore) {
        return;
      }

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

    persistHotAlertState() {
      saveHotAlertState({
        enabled: this.hotAlertEnabled,
        history: this.hotAlertHistory,
        cooldown: this.hotAlertCooldown,
        updatedAt: Date.now(),
      });
      this.hotAlertUpdatedAt = Date.now();
    },

    evaluateAndNotifyHotAlertsFromArticles(articles: CryptoNewsArticle[]) {
      this.hotAlertPermission = getNotificationPermission();
      this.hotAlertTopIssues = computeHotIssues(articles);

      if (!this.hotAlertEnabled || !hasNotificationSupport()) {
        this.persistHotAlertState();
        return;
      }

      if (this.hotAlertPermission !== "granted") {
        this.persistHotAlertState();
        return;
      }

      const now = Date.now();
      let hasAlert = false;
      const alertedTopics = new Set<string>();

      for (const issue of this.hotAlertTopIssues) {
        const cooldownUntil = this.hotAlertCooldown[issue.topic] || 0;
        if (now - cooldownUntil < NEWS_HOT_ALERT_COOLDOWN_MS || alertedTopics.has(issue.topic)) {
          continue;
        }
        if (!issue.url) {
          continue;
        }

        const alertItem: NewsHotAlertHistoryItem = { ...issue, seenAt: now };

        try {
          const notification = new Notification(`[Crypto News] ${issue.label} is hot`, {
            body: `${issue.count} mentions - ${issue.headline}`,
            tag: issue.topic,
          });
          notification.onclick = () => {
            window.focus();
            window.open(issue.url, "_blank", "noopener");
          };
        } catch {
          // Ignore runtime notification errors.
        }

        this.hotAlertCooldown[issue.topic] = now;
        this.hotAlertHistory = pushUniqueHistory(
          this.hotAlertHistory,
          alertItem,
          NEWS_HOT_ALERT_HISTORY_LIMIT,
        );
        alertedTopics.add(issue.topic);
        hasAlert = true;
      }

      this.persistHotAlertState();
      if (!hasAlert) {
        this.hotAlertUpdatedAt = now;
      }
    },

    evaluateAndNotifyHotAlerts() {
      this.evaluateAndNotifyHotAlertsFromArticles(this.articles);
    },
  },
});
