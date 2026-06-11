import type { PanelCollectionKey } from './collection-config'

export function buildSearchFilters(fields: string[], search?: string) {
  const trimmedSearch = search?.trim()
  if (!trimmedSearch) {
    return {}
  }

  return {
    $or: fields.map((field) => ({
      [field]: {
        $containsi: trimmedSearch,
      },
    })),
  }
}

export function buildStatusFilters(status: string | undefined, supportsDraft: boolean) {
  if (!supportsDraft || !status || status === 'all') {
    return {}
  }

  if (status === 'published') {
    return {
      publishedAt: {
        $notNull: true,
      },
    }
  }

  return {
    publishedAt: {
      $null: true,
    },
  }
}

export function buildCollectionSpecificFilters(collection: PanelCollectionKey, query: Record<string, unknown>) {
  if (collection === 'admin-audit-logs') {
    const filters: Record<string, unknown> = {}

    if (typeof query.action === 'string' && query.action) {
      filters.action = { $eq: query.action }
    }

    if (typeof query.status === 'string' && query.status && query.status !== 'all') {
      filters.status = { $eq: query.status }
    }

    if (typeof query.collection === 'string' && query.collection) {
      filters.targetCollection = { $eq: query.collection }
    }

    if (typeof query.actor === 'string' && query.actor.trim()) {
      filters.$or = [
        { actorEmail: { $containsi: query.actor.trim() } },
        { actorUsername: { $containsi: query.actor.trim() } },
      ]
    }

    const createdAt: Record<string, string> = {}
    if (typeof query.from === 'string' && query.from) {
      createdAt.$gte = new Date(query.from).toISOString()
    }
    if (typeof query.to === 'string' && query.to) {
      createdAt.$lte = new Date(query.to).toISOString()
    }
    if (Object.keys(createdAt).length > 0) {
      filters.createdAt = createdAt
    }

    return filters
  }

  if (collection === 'sync-logs') {
    const filters: Record<string, unknown> = {}
    if (typeof query.status === 'string' && query.status && query.status !== 'all') {
      filters.status = { $eq: query.status }
    }
    if (typeof query.stage === 'string' && query.stage && query.stage !== 'all') {
      filters.stage = { $eq: query.stage }
    }
    return filters
  }

  if (collection === 'works') {
    const filters: Record<string, unknown> = {}
    if (typeof query.featured === 'string' && query.featured === 'featured') {
      filters.isFeatured = { $eq: true }
    }
    if (typeof query.featured === 'string' && query.featured === 'not-featured') {
      filters.isFeatured = { $ne: true }
    }
    return filters
  }

  return {}
}

export function mergeFilters(...filters: Array<Record<string, unknown>>) {
  const entries = filters.filter((filter) => Object.keys(filter).length > 0)
  if (entries.length === 0) {
    return undefined
  }

  if (entries.length === 1) {
    return entries[0]
  }

  return { $and: entries }
}

export function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
