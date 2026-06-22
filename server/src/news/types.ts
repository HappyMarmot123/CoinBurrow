export type NewsSentiment = 'positive' | 'negative' | 'neutral' | 'unknown'

export type NewsProviderName = 'cryptocurrency.cv'

export interface CryptoNewsArticle {
  id: string
  title: string
  url: string
  source: string
  publishedAt: number
  summary?: string
  language?: string
  originalLanguage?: string
  assets: string[]
  categories: string[]
  sentiment: NewsSentiment
  imageUrl?: string
  provider: NewsProviderName
  isStale?: boolean
}

export interface CryptoNewsResponse {
  articles: CryptoNewsArticle[]
  nextCursor?: string
  fetchedAt: number
  cacheTtlMs: number
  provider: NewsProviderName
  stale: boolean
  degraded?: boolean
  degradedReason?: string
}

export interface CryptoNewsQuery {
  q?: string
  asset: string
  category?: string
  language: 'all' | 'ko' | 'en'
  limit: number
  cursor?: string
}

export interface CryptoNewsSourceSummary {
  provider: NewsProviderName
  sources: string[]
  categories: string[]
  languages: string[]
  fetchedAt: number
  cacheTtlMs: number
  stale: boolean
  degraded?: boolean
  degradedReason?: string
}

export interface CryptoNewsHealth {
  provider: NewsProviderName
  status: 'healthy' | 'degraded' | 'unavailable'
  checkedAt: number
  responseTimeMs?: number
  upstream?: unknown
  cache: {
    ttlMs: number
    staleTtlMs: number
  }
}

export interface RawNewsFeed {
  articles: Record<string, unknown>[]
  sources: string[]
  availableCategories: string[]
  availableLanguages: string[]
  fetchedAt?: string
  total?: number
  totalCount?: number
  pagination?: {
    page?: number
    perPage?: number
    totalPages?: number
    hasMore?: boolean
  }
  meta?: {
    total?: number
    languages?: string[]
    regions?: string[]
  }
}
