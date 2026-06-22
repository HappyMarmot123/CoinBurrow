import { z } from 'zod'

import type { RawNewsFeed } from './types.js'

const baseRawNewsFeedSchema = z
  .object({
    articles: z.array(z.record(z.string(), z.unknown())).optional(),
    sources: z.array(z.string()).optional(),
    availableCategories: z.array(z.string()).optional(),
    availableLanguages: z.array(z.string()).optional(),
    fetchedAt: z.string().optional(),
    total: z.number().optional(),
    totalCount: z.number().optional(),
    pagination: z
      .object({
        page: z.number().optional(),
        perPage: z.number().optional(),
        totalPages: z.number().optional(),
        hasMore: z.boolean().optional(),
      })
      .optional(),
    meta: z
      .object({
        total: z.number().optional(),
        languages: z.array(z.string()).optional(),
        regions: z.array(z.string()).optional(),
      })
      .optional(),
  })
  .passthrough()

export const rawNewsFeedSchema = baseRawNewsFeedSchema.transform((feed): RawNewsFeed => ({
  ...feed,
  articles: feed.articles ?? [],
  sources: feed.sources ?? [],
  availableCategories: feed.availableCategories ?? [],
  availableLanguages: feed.availableLanguages ?? [],
}))

export const rawNewsHealthSchema = z.record(z.string(), z.unknown())
