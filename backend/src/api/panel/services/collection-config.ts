export type PanelCollectionKey =
  | 'announcements'
  | 'works'
  | 'friend-links'
  | 'online-events'
  | 'offline-events'
  | 'students'
  | 'schools'
  | 'bilibili-subscriptions'
  | 'sync-logs'
  | 'admin-audit-logs'
  | 'research-entries'
  | 'research-themes'
  | 'research-citations'
  | 'research-subjects'
  | 'research-paths'

export interface CollectionConfig {
  uid: any
  localized: boolean
  populate?: any
  searchFields: string[]
  defaultSort: string | string[]
  supportsDraft: boolean
  fields: string[]
  readOnly?: boolean
}

export const COLLECTIONS: Record<PanelCollectionKey, CollectionConfig> = {
  announcements: {
    uid: 'api::announcement.announcement',
    localized: true,
    populate: ['coverImage'],
    searchFields: ['title'],
    defaultSort: ['isPinned:desc', 'priority:desc', 'updatedAt:desc'],
    supportsDraft: true,
    fields: ['title', 'content', 'link', 'priority', 'isPinned', 'isActive', 'coverImage', 'publishedAt'],
  },
  'friend-links': {
    uid: 'api::friend-link.friend-link',
    localized: true,
    populate: ['icon'],
    searchFields: ['title', 'description', 'url'],
    defaultSort: ['priority:desc', 'updatedAt:desc'],
    supportsDraft: true,
    fields: ['title', 'description', 'url', 'icon', 'priority', 'isActive', 'publishedAt'],
  },
  works: {
    uid: 'api::work.work',
    localized: true,
    populate: {
      coverImage: true,
      students: {
        fields: ['id', 'name'],
        populate: {
          avatar: true,
        },
      },
    },
    searchFields: ['title', 'author'],
    defaultSort: 'updatedAt:desc',
    supportsDraft: true,
    fields: [
      'title',
      'author',
      'description',
      'nature',
      'workType',
      'link',
      'isActive',
      'sourceUrl',
      'sourcePlatform',
      'sourceId',
      'isAutoImported',
      'importedAt',
      'isFeatured',
      'featuredPriority',
      'featuredReason',
      'featuredUntil',
      'coverImageUrl',
      'originalPublishDate',
      'coverImage',
      'students',
      'publishedAt',
    ],
  },
  'online-events': {
    uid: 'api::online-event.online-event',
    localized: true,
    populate: ['coverImage'],
    searchFields: ['title', 'organizer'],
    defaultSort: 'startTime:desc',
    supportsDraft: true,
    fields: ['title', 'nature', 'startTime', 'endTime', 'link', 'coverImage', 'organizer', 'description', 'publishedAt'],
  },
  'offline-events': {
    uid: 'api::offline-event.offline-event',
    localized: true,
    populate: ['coverImage'],
    searchFields: ['title', 'organizer', 'location'],
    defaultSort: 'startTime:desc',
    supportsDraft: true,
    fields: ['title', 'nature', 'location', 'guests', 'startTime', 'endTime', 'link', 'coverImage', 'organizer', 'description', 'publishedAt'],
  },
  students: {
    uid: 'api::student.student',
    localized: true,
    populate: ['avatar', 'school_ref'],
    searchFields: ['name', 'organization'],
    defaultSort: 'updatedAt:desc',
    supportsDraft: true,
    fields: ['name', 'school_ref', 'organization', 'avatar', 'bio', 'publishedAt'],
  },
  schools: {
    uid: 'api::school.school',
    localized: true,
    populate: ['logo'],
    searchFields: ['name', 'slug'],
    defaultSort: ['order:asc', 'updatedAt:desc'],
    supportsDraft: false,
    fields: ['name', 'slug', 'description', 'color', 'order', 'logo'],
  },
  'bilibili-subscriptions': {
    uid: 'api::bilibili-subscription.bilibili-subscription',
    localized: false,
    searchFields: ['upName', 'uid'],
    defaultSort: 'updatedAt:desc',
    supportsDraft: false,
    fields: ['upName', 'uid', 'isActive', 'defaultNature', 'autoPublishKeywords', 'notes'],
  },
  'sync-logs': {
    uid: 'api::sync-log.sync-log',
    localized: false,
    searchFields: ['targetName', 'message'],
    defaultSort: 'startedAt:desc',
    supportsDraft: false,
    fields: [],
    readOnly: true,
  },
  'admin-audit-logs': {
    uid: 'api::admin-audit-log.admin-audit-log',
    localized: false,
    searchFields: ['actorEmail', 'actorUsername', 'targetCollection', 'targetName', 'message'],
    defaultSort: 'createdAt:desc',
    supportsDraft: false,
    fields: [],
    readOnly: true,
  },
  'research-entries': {
    uid: 'api::research-entry.research-entry',
    localized: true,
    populate: {
      themes: true,
      citations: true,
      subjects: true,
      related_links: { populate: { target_entry: { fields: ['id', 'documentId', 'title', 'slug'] } } },
      revisions: true,
    },
    searchFields: ['title', 'summary'],
    defaultSort: 'updatedAt:desc',
    supportsDraft: true,
    fields: [
      'title', 'slug', 'stance', 'media_type', 'spoiler_scope',
      'themes', 'citations', 'subjects', 'related_links', 'revisions',
      'summary', 'body', 'publishedAt',
    ],
  },
  'research-subjects': {
    uid: 'api::research-subject.research-subject',
    localized: true,
    populate: ['cover', 'students'],
    searchFields: ['name'],
    defaultSort: 'updatedAt:desc',
    supportsDraft: true,
    fields: ['name', 'slug', 'subject_type', 'description', 'cover', 'students', 'publishedAt'],
  },
  'research-paths': {
    uid: 'api::research-path.research-path',
    localized: true,
    populate: { steps: { populate: { entry: { fields: ['id', 'documentId', 'title', 'slug'] } } } },
    searchFields: ['title'],
    defaultSort: ['order:asc', 'updatedAt:desc'],
    supportsDraft: true,
    fields: ['title', 'slug', 'description', 'difficulty', 'order', 'steps', 'publishedAt'],
  },
  'research-themes': {
    uid: 'api::research-theme.research-theme',
    localized: true,
    searchFields: ['name'],
    defaultSort: 'updatedAt:desc',
    supportsDraft: true,
    fields: ['name', 'slug', 'curated_intro', 'publishedAt'],
  },
  'research-citations': {
    uid: 'api::research-citation.research-citation',
    localized: false,
    populate: ['source_image'],
    searchFields: ['claim_short', 'source_ref'],
    defaultSort: 'updatedAt:desc',
    supportsDraft: true,
    fields: ['claim_short', 'source_type', 'source_ref', 'source_image', 'source_quote', 'confidence', 'publishedAt'],
  },
}

const SUPPORTED_LOCALES = new Set(['zh-Hans', 'en', 'ja'])

export function isPanelCollectionKey(value: string): value is PanelCollectionKey {
  return value in COLLECTIONS
}

export function mapLocale(locale?: string | null): string | undefined {
  if (!locale) {
    return undefined
  }

  return SUPPORTED_LOCALES.has(locale) ? locale : undefined
}
