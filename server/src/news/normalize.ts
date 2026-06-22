import { createHash } from 'node:crypto'

import type {
  CryptoNewsArticle,
  CryptoNewsQuery,
  NewsSentiment,
  RawNewsFeed,
} from './types.js'

const PROVIDER = 'cryptocurrency.cv' as const

const assetMatchers: Record<string, RegExp[]> = {
  BTC: [/\bBTC\b/i, /\bBitcoin\b/i],
  ETH: [/\bETH\b/i, /\bEthereum\b/i],
  SOL: [/\bSOL\b/i, /\bSolana\b/i],
  XRP: [/\bXRP\b/i, /\bRipple\b/i],
  DOGE: [/\bDOGE\b/i, /\bDogecoin\b/i],
  ADA: [/\bADA\b/i, /\bCardano\b/i],
  DOT: [/\bDOT\b/i, /\bPolkadot\b/i],
  TRX: [/\bTRX\b/i, /\bTron\b/i],
  DEFI: [/\bDeFi\b/i, /\bdecentralized finance\b/i],
}

const categoryAssets: Record<string, string> = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  solana: 'SOL',
  defi: 'DEFI',
}

function getString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }
  return undefined
}

function getNumberOrDate(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value < 1_000_000_000_000 ? value * 1000 : value
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Date.parse(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return undefined
}

function getStringArray(record: Record<string, unknown>, keys: string[]): string[] {
  const result: string[] = []

  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      result.push(value)
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.trim().length > 0) {
          result.push(item)
        } else if (item && typeof item === 'object') {
          const symbol = getString(item as Record<string, unknown>, ['symbol', 'ticker', 'slug', 'name'])
          if (symbol) result.push(symbol)
        }
      }
    }
  }

  return result
}

function uniqueClean(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function cleanText(value: string | undefined, maxLength?: number): string | undefined {
  if (!value) return undefined
  const cleaned = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()

  if (!maxLength || cleaned.length <= maxLength) return cleaned
  return `${cleaned.slice(0, maxLength - 1).trim()}...`
}

function normalizeCategories(record: Record<string, unknown>): string[] {
  const raw = getStringArray(record, ['category', 'categories', 'tags'])
    .flatMap((value) => value.split(','))
    .map((value) => value.trim().toLowerCase().replace(/\s+/g, '-'))

  return uniqueClean(raw)
}

function inferAssets(text: string, categories: string[]): string[] {
  const assets = new Set<string>()

  for (const [asset, patterns] of Object.entries(assetMatchers)) {
    if (patterns.some((pattern) => pattern.test(text))) {
      assets.add(asset)
    }
  }

  for (const category of categories) {
    const mapped = categoryAssets[category]
    if (mapped) assets.add(mapped)
  }

  return [...assets]
}

function normalizeAssets(record: Record<string, unknown>, text: string, categories: string[]): string[] {
  const explicit = getStringArray(record, ['assets', 'coins', 'tickers', 'currencies'])
    .map((value) => value.toUpperCase().replace(/^\$/, ''))
    .filter((value) => /^[A-Z0-9]{2,12}$/.test(value))

  return uniqueClean([...explicit, ...inferAssets(text, categories)])
}

function normalizeSentiment(record: Record<string, unknown>): NewsSentiment {
  const value = record.sentiment ?? record.sentimentLabel ?? record.sentiment_score ?? record.sentimentScore

  if (typeof value === 'string') {
    const normalized = value.toLowerCase()
    if (normalized.includes('positive') || normalized === 'bullish') return 'positive'
    if (normalized.includes('negative') || normalized === 'bearish') return 'negative'
    if (normalized.includes('neutral')) return 'neutral'
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > 0.1) return 'positive'
    if (value < -0.1) return 'negative'
    return 'neutral'
  }

  return 'unknown'
}

function stableId(record: Record<string, unknown>, url: string, publishedAt: number): string {
  const existing = getString(record, ['id', 'guid', 'slug'])
  if (existing) return existing

  return createHash('sha256')
    .update(`${PROVIDER}:${url}:${publishedAt}`)
    .digest('hex')
    .slice(0, 16)
}

function normalizeArticle(record: Record<string, unknown>): CryptoNewsArticle | null {
  const title = cleanText(getString(record, ['title', 'headline', 'name']))
  const url = getString(record, ['url', 'link', 'href'])
  const publishedAt = getNumberOrDate(record, ['publishedAt', 'published_at', 'pubDate', 'date', 'createdAt', 'timestamp'])

  if (!title || !url || !publishedAt) return null

  const summary = cleanText(getString(record, ['summary', 'description', 'excerpt', 'contentSnippet', 'content']), 220)
  const source = getString(record, ['source', 'sourceName', 'publisher']) ?? 'Unknown'
  const language = getString(record, ['language', 'lang'])
  const categories = normalizeCategories(record)
  const searchableText = `${title} ${summary ?? ''} ${categories.join(' ')}`
  const imageUrl = getString(record, ['imageUrl', 'image', 'thumbnail', 'thumbnailUrl'])

  return {
    id: stableId(record, url, publishedAt),
    title,
    url,
    source,
    publishedAt,
    ...(summary ? { summary } : {}),
    ...(language ? { language } : {}),
    assets: normalizeAssets(record, searchableText, categories),
    categories,
    sentiment: normalizeSentiment(record),
    ...(imageUrl ? { imageUrl } : {}),
    provider: PROVIDER,
  }
}

function matchesQuery(article: CryptoNewsArticle, query: CryptoNewsQuery): boolean {
  if (query.language !== 'all' && article.language && article.language !== query.language) {
    return false
  }

  if (query.asset !== 'ALL' && !article.assets.includes(query.asset)) {
    return false
  }

  if (query.category && !article.categories.includes(query.category.toLowerCase())) {
    return false
  }

  if (query.q) {
    const keywords = query.q
      .split(/[|,]/)
      .map((keyword) => keyword.trim().toLowerCase())
      .filter((keyword) => keyword.length > 0)
    const text = `${article.title} ${article.summary ?? ''} ${article.source} ${article.assets.join(' ')}`.toLowerCase()
    return keywords.some((keyword) => text.includes(keyword))
  }

  return true
}

export function normalizeNewsFeed(feed: RawNewsFeed, query: CryptoNewsQuery): CryptoNewsArticle[] {
  const byId = new Map<string, CryptoNewsArticle>()

  for (const rawArticle of feed.articles) {
    const article = normalizeArticle(rawArticle)
    if (article && matchesQuery(article, query)) {
      byId.set(article.id, article)
    }
  }

  return [...byId.values()].sort((left, right) => right.publishedAt - left.publishedAt)
}

export function parseFeedFetchedAt(feed: RawNewsFeed): number {
  if (feed.fetchedAt) {
    const parsed = Date.parse(feed.fetchedAt)
    if (Number.isFinite(parsed)) return parsed
  }
  return Date.now()
}
