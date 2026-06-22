import {
  MockAgent,
  getGlobalDispatcher,
  setGlobalDispatcher,
  type Dispatcher,
} from 'undici'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildApp } from '../src/app.js'
import { clearNewsCacheForTest } from '../src/news/cache.js'

describe('news routes', () => {
  let app: ReturnType<typeof buildApp>
  let mockAgent: MockAgent
  let originalDispatcher: Dispatcher

  beforeEach(() => {
    clearNewsCacheForTest()
    originalDispatcher = getGlobalDispatcher()
    mockAgent = new MockAgent()
    mockAgent.disableNetConnect()
    setGlobalDispatcher(mockAgent)
    app = buildApp()
  })

  afterEach(async () => {
    try {
      try {
        mockAgent.assertNoPendingInterceptors()
      } finally {
        try {
          await app.close()
        } finally {
          vi.useRealTimers()
          setGlobalDispatcher(originalDispatcher)
          await mockAgent.close()
        }
      }
    } finally {
      vi.restoreAllMocks()
    }
  })

  function mockCryptoNews(path: string, statusCode: number, body: object): void {
    mockAgent
      .get('https://cryptocurrency.cv')
      .intercept({ method: 'GET', path })
      .reply(statusCode, body)
  }

  it('returns Korean international news as normalized articles', async () => {
    mockCryptoNews('/api/news/international?language=ko&limit=50', 200, {
      articles: [
        {
          id: 'tokenpost-1',
          title: 'Bitcoin ETF news',
          description: '<p>Bitcoin moved after ETF headlines.</p>',
          link: 'https://example.com/article',
          source: 'TokenPost',
          language: 'ko',
          pubDate: '2026-06-19T06:52:12.000Z',
          category: 'bitcoin',
        },
      ],
      meta: { total: 1 },
      pagination: { page: 1, perPage: 20, hasMore: false },
    })

    const response = await app.inject({
      method: 'GET',
      url: '/market/news/articles?language=ko',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      provider: 'cryptocurrency.cv',
      stale: false,
      articles: [
        {
          id: 'tokenpost-1',
          title: 'Bitcoin ETF news',
          url: 'https://example.com/article',
          source: 'TokenPost',
          language: 'ko',
          summary: 'Bitcoin moved after ETF headlines.',
          assets: ['BTC'],
          categories: ['bitcoin'],
        },
      ],
    })
  })

  it('uses the Korean international feed for the default all-language request path', async () => {
    mockCryptoNews('/api/news/international?language=ko&limit=50', 200, {
      articles: [
        {
          title: 'Ethereum upgrade',
          description: 'Ethereum network update',
          link: 'https://example.com/eth',
          source: 'Block Media',
          language: 'ko',
          pubDate: '2026-06-19T06:00:00.000Z',
          category: 'ethereum',
        },
      ],
    })

    const response = await app.inject({
      method: 'GET',
      url: '/market/news/articles',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().articles).toEqual([
      expect.objectContaining({
        title: 'Ethereum upgrade',
        assets: ['ETH'],
      }),
    ])
  })

  it('returns a local next cursor when the upstream feed has more than one page of articles', async () => {
    const rawArticles = Array.from({ length: 25 }, (_value, index) => ({
      title: `Bitcoin item ${index + 1}`,
      description: 'Bitcoin market update',
      link: `https://example.com/btc-${index + 1}`,
      source: 'TokenPost',
      language: 'ko',
      pubDate: new Date(Date.UTC(2026, 5, 19, 6, 0, 25 - index)).toISOString(),
      category: 'bitcoin',
    }))
    mockCryptoNews('/api/news/international?language=ko&limit=50', 200, {
      articles: rawArticles,
    })
    mockCryptoNews('/api/news/international?language=ko&limit=50', 200, {
      articles: rawArticles,
    })

    const first = await app.inject({
      method: 'GET',
      url: '/market/news/articles?limit=20',
    })
    const second = await app.inject({
      method: 'GET',
      url: '/market/news/articles?limit=20&cursor=20',
    })

    expect(first.statusCode).toBe(200)
    expect(first.json().articles).toHaveLength(20)
    expect(first.json().nextCursor).toBe('20')
    expect(second.statusCode).toBe(200)
    expect(second.json().articles).toHaveLength(5)
    expect(second.json().nextCursor).toBeUndefined()
  })

  it('matches pipe-separated keyword presets as OR search terms', async () => {
    mockCryptoNews('/api/news/international?language=ko&limit=50', 200, {
      articles: [
        {
          title: 'SEC approves new crypto market structure proposal',
          description: 'A digital asset bill advanced in committee.',
          link: 'https://example.com/regulation',
          source: 'CoinDesk',
          language: 'ko',
          pubDate: '2026-06-19T06:00:00.000Z',
          category: 'general',
        },
        {
          title: 'Solana ecosystem update',
          description: 'Developer tooling shipped.',
          link: 'https://example.com/sol',
          source: 'TokenPost',
          language: 'ko',
          pubDate: '2026-06-19T05:00:00.000Z',
          category: 'solana',
        },
      ],
    })

    const response = await app.inject({
      method: 'GET',
      url: '/market/news/articles?q=stablecoin%20bill%20%7C%20SEC&limit=20',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().articles).toEqual([
      expect.objectContaining({
        title: 'SEC approves new crypto market structure proposal',
      }),
    ])
  })

  it('filters articles by selected source', async () => {
    mockCryptoNews('/api/news/international?language=ko&limit=50', 200, {
      articles: [
        {
          title: 'Regulation update',
          description: 'A policy proposal moved markets.',
          link: 'https://example.com/regulation',
          source: 'CoinDesk',
          language: 'ko',
          pubDate: '2026-06-19T07:00:00.000Z',
          category: 'general',
        },
        {
          title: 'Network progress',
          description: 'A protocol upgrade was shipped.',
          link: 'https://example.com/protocol',
          source: 'TokenPost',
          language: 'ko',
          pubDate: '2026-06-19T06:30:00.000Z',
          category: 'general',
        },
      ],
    })

    const response = await app.inject({
      method: 'GET',
      url: '/market/news/articles?source=tokenpost&language=ko',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().articles).toEqual([
      expect.objectContaining({
        title: 'Network progress',
      }),
    ])
  })

  it('returns a degraded empty article response on a cold upstream transport failure', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/market/news/articles',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      articles: [],
      stale: false,
      degraded: true,
      provider: 'cryptocurrency.cv',
    })
  })

  it('rejects invalid query limits', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/market/news/articles?limit=100',
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      success: false,
      code: 'VALIDATION_ERROR',
    })
  })

  it('maps malformed upstream news to a stable 502', async () => {
    mockCryptoNews('/api/news/international?language=ko&limit=50', 200, {
      articles: { invalid: true },
    })

    const response = await app.inject({
      method: 'GET',
      url: '/market/news/articles?language=ko',
    })

    expect(response.statusCode).toBe(502)
    expect(response.json()).toMatchObject({
      success: false,
      code: 'SCHEMA_MISMATCH',
    })
  })

  it('serves stale cached articles when a later upstream request fails', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)

    mockCryptoNews('/api/news/international?language=ko&limit=50', 200, {
      articles: [
        {
          title: 'Solana headline',
          link: 'https://example.com/sol',
          source: 'TokenPost',
          language: 'ko',
          pubDate: '2026-06-19T06:00:00.000Z',
          category: 'solana',
        },
      ],
    })

    const first = await app.inject({
      method: 'GET',
      url: '/market/news/articles?language=ko',
    })
    expect(first.statusCode).toBe(200)

    await vi.advanceTimersByTimeAsync(301_000)

    mockCryptoNews('/api/news/international?language=ko&limit=50', 500, {
      error: 'upstream unavailable',
    })

    const second = await app.inject({
      method: 'GET',
      url: '/market/news/articles?language=ko',
    })

    expect(second.statusCode).toBe(200)
    expect(second.json()).toMatchObject({
      stale: true,
      articles: [expect.objectContaining({ isStale: true })],
    })
  })

  it('returns source metadata', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/market/news/sources',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      provider: 'cryptocurrency.cv',
      sources: expect.arrayContaining(['TokenPost', 'CoinDesk']),
      categories: expect.arrayContaining(['bitcoin']),
      languages: expect.arrayContaining(['all', 'ko', 'en']),
      degraded: true,
    })
  })

  it('returns upstream health with cache policy', async () => {
    mockCryptoNews('/api/health', 200, {
      status: 'degraded',
      checks: { api: { status: 'healthy' } },
    })

    const response = await app.inject({
      method: 'GET',
      url: '/market/news/health',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      provider: 'cryptocurrency.cv',
      status: 'degraded',
      cache: {
        ttlMs: 300_000,
        staleTtlMs: 1_800_000,
      },
    })
  })
})
