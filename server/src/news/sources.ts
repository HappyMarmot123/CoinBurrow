export interface NewsSourceDef {
  id: string
  label: string
  feed: 'ko' | 'en'
  // Lower-cased substrings used to match the upstream article `source` string.
  aliases: string[]
}

// Single source of truth for the news outlet registry.
// Used by the sources endpoint, the source filter, and feed-language routing.
// Bitcoin Magazine intentionally excluded.
export const NEWS_SOURCES: NewsSourceDef[] = [
  { id: 'tokenpost', label: 'TokenPost', feed: 'ko', aliases: ['tokenpost', '토큰포스트'] },
  { id: 'blockmedia', label: 'Block Media', feed: 'ko', aliases: ['block media', 'blockmedia', '블록미디어'] },
  { id: 'coindesk', label: 'CoinDesk', feed: 'en', aliases: ['coindesk'] },
  { id: 'theblock', label: 'The Block', feed: 'en', aliases: ['the block', 'theblock'] },
  { id: 'decrypt', label: 'Decrypt', feed: 'en', aliases: ['decrypt'] },
  { id: 'cointelegraph', label: 'CoinTelegraph', feed: 'en', aliases: ['cointelegraph', 'coin telegraph'] },
  { id: 'blockworks', label: 'Blockworks', feed: 'en', aliases: ['blockworks'] },
]

const byId = new Map(NEWS_SOURCES.map((source) => [source.id, source]))

export const NEWS_SOURCE_LABELS = NEWS_SOURCES.map((source) => source.label)

export function getNewsSource(id: string | undefined): NewsSourceDef | undefined {
  if (!id) return undefined
  const normalizedId = id.trim().toLowerCase()
  return byId.get(normalizedId)
}

function normalizeSourceFilter(value: string | undefined): string {
  return value ? value.trim().toLowerCase() : ''
}

export function resolveSourceFeed(id: string | undefined): 'ko' | 'en' | undefined {
  return resolveSourceSource(id)?.feed
}

export function resolveSourceSource(id: string | undefined): NewsSourceDef | undefined {
  if (!id) return undefined
  const normalized = id.trim().toLowerCase()

  const byIdSource = byId.get(normalized)
  if (byIdSource) return byIdSource

  return NEWS_SOURCES.find((source) =>
    source.aliases.some((alias) => {
      if (alias === normalized) return true
      if (alias.includes(" ")) {
        return (
          normalized === alias
          || normalized.startsWith(`${alias} `)
          || normalized.endsWith(` ${alias}`)
          || normalized.includes(` ${alias} `)
        )
      }

      return alias.length > 1 && (
        normalized.startsWith(`${alias} `)
        || normalized.endsWith(` ${alias}`)
        || normalized.includes(` ${alias} `)
      )
    }),
  )
}

// Returns true when no (or unknown/ALL) source filter is set, so it is a safe no-op.
export function matchSource(articleSource: string, id: string | undefined): boolean {
  const normalizedId = normalizeSourceFilter(id)
  if (!normalizedId || normalizedId === 'all') return true

  const def = resolveSourceSource(normalizedId)
  const normalizedSource = articleSource.trim().toLowerCase()
  if (def) {
    return def.aliases.some((alias) => normalizedSource.includes(alias))
  }

  // Unknown source filters are treated as no-op to avoid over-filtering unknown input.
  return true
}
