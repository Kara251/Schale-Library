/**
 * /panel 集合注册表：白名单集合 → D1 表 + 字段白名单。
 * 未登记集合 404，未登记字段拒绝（400 unknown_field）。
 * camelCase 是面板契约的对外字段名，column 是 D1 列名；
 * localized 字段以 JSON 列存储 {"zh-Hans":...,"en":...,"ja":...}。
 */
export type FieldKind =
  | 'text'
  | 'number'
  | 'boolean'
  | 'media'
  | 'relation-one'
  | 'relation-list'
  | 'datetime'
  | 'published-at'

export interface FieldDef {
  column: string
  kind: FieldKind
  /** localized: true → 值包装为 i18n JSON 存储，读取时按 locale 解包 */
  localized?: boolean
  /**
   * relation-* 字段的目标表。对外一律用 documentId，写入时在此表上解析成数字外键
   * —— 面板列表返回的 id 就是 documentId，没有别的 ID 可用。
   */
  relationTable?: string
}

const rel = (column: string, relationTable: string): FieldDef => ({
  column,
  kind: 'relation-one',
  relationTable,
})

export interface CollectionDef {
  table: string
  localized: boolean
  supportsDraft: boolean
  readOnly?: boolean
  /**
   * 固定过滤器：多个集合视图共用一张表时的判别列。
   * 列表按它过滤，新建按它自动落值，单条读写按它限定作用域
   * —— 否则 online-events 能读写到 offline 的行。
   */
  fixedFilter?: { column: string; value: string }
  /**
   * 1:1 副表：字段散落在关联表时的写入目标（如 events → event_locations）。
   * 副表字段与主表字段在面板契约里是平的，读取 LEFT JOIN，写入 upsert。
   */
  sideTable?: { table: string; fk: string; fields: Record<string, FieldDef> }
  /**
   * 自动生成 slug：表上 slug 为 NOT NULL、但面板不暴露该字段时使用。
   * from 是字段白名单里的字段名，取其值转写；转写为空（如纯中文）时回退 documentId。
   */
  autoSlug?: { column: string; from: string }
  /**
   * 与发布状态联动的「启用」列。
   * 这两个字段对维护者是同一个意思（内容是否对外可见），分开暴露只会造成
   * 「勾了一个却不显示」。面板只给一个发布控件，此列由服务端跟随写入。
   */
  activeColumn?: string
  searchColumns: string[]
  defaultSort: Array<[string, 'asc' | 'desc']>
  labelColumn: string
  fields: Record<string, FieldDef>
}

const f = (column: string, kind: FieldKind, localized = false): FieldDef => ({ column, kind, localized })

export const COLLECTIONS: Record<string, CollectionDef> = {
  creator: {
    table: 'creators',
    localized: true,
    supportsDraft: true,
    searchColumns: ['name', 'slug'],
    defaultSort: [['updated_at', 'desc']],
    labelColumn: 'name',
    fields: {
      name: f('name', 'text'),
      slug: f('slug', 'text'),
      bio: f('bio_json', 'text', true),
      platform: f('platform', 'text'),
      platformUid: f('platform_uid', 'text'),
      homepageUrl: f('homepage_url', 'text'),
      avatar: f('avatar_url', 'media'),
      isFeatured: f('is_featured', 'boolean'),
      featuredPriority: f('featured_priority', 'number'),
      needsReview: f('needs_review', 'boolean'),
      publishedAt: f('published_at', 'published-at'),
    },
  },
  students: {
    table: 'students',
    localized: true,
    supportsDraft: true,
    // students.slug 是 NOT NULL，而前后端表单都不暴露它 —— 不自动生成的话新建必然失败
    autoSlug: { column: 'slug', from: 'name' },
    searchColumns: ['name', 'organization'],
    defaultSort: [['updated_at', 'desc']],
    labelColumn: 'name',
    fields: {
      name: f('name', 'text'),
      organization: f('organization', 'text'),
      wikiUrl: f('wiki_url', 'text'),
      avatar: f('avatar_url', 'media'),
      school: rel('school_id', 'schools'),
      publishedAt: f('published_at', 'published-at'),
    },
  },
  schools: {
    table: 'schools',
    localized: true,
    supportsDraft: false,
    searchColumns: ['slug'],
    defaultSort: [
      ['sort_order', 'asc'],
      ['updated_at', 'desc'],
    ],
    labelColumn: 'slug',
    fields: {
      name: f('name_json', 'text', true),
      slug: f('slug', 'text'),
      description: f('description_json', 'text', true),
      shortName: f('short_name_json', 'text', true),
      color: f('color', 'text'),
      logo: f('logo_url', 'media'),
      order: f('sort_order', 'number'),
    },
  },
  events: {
    table: 'events',
    localized: true,
    supportsDraft: true,
    searchColumns: ['organizer', 'source_platform', 'source_url'],
    defaultSort: [['start_time', 'desc']],
    labelColumn: 'title_json',
    fields: {
      title: f('title_json', 'text', true),
      description: f('description_json', 'text', true),
      kind: f('kind', 'text'),
      nature: f('nature', 'text'),
      eventFormat: f('event_format', 'text'),
      statusOverride: f('status_override', 'text'),
      startTime: f('start_time', 'datetime'),
      endTime: f('end_time', 'datetime'),
      link: f('link', 'text'),
      coverImage: f('cover_image_url', 'media'),
      organizer: f('organizer', 'text'),
      organizerVerified: f('organizer_verified', 'boolean'),
      sourceName: f('source_platform', 'text'),
      sourceUrl: f('source_url', 'text'),
      lastVerifiedAt: f('last_verified_at', 'datetime'),
      tags: f('tags_json', 'text'),
      guests: f('guests_json', 'text', true),
      ticketPriceText: f('ticket_price_text_json', 'text', true),
      priceMin: f('price_min', 'number'),
      priceMax: f('price_max', 'number'),
      currency: f('currency', 'text'),
      ticketStatus: f('ticket_status', 'text'),
      ticketUrl: f('ticket_url', 'text'),
      publishedAt: f('published_at', 'published-at'),
    },
  },
  'online-events': {
    table: 'events',
    fixedFilter: { column: 'kind', value: 'online' },
    localized: true,
    supportsDraft: true,
    searchColumns: ['organizer', 'source_platform', 'source_url'],
    defaultSort: [['start_time', 'desc']],
    labelColumn: 'title_json',
    fields: {
      title: f('title_json', 'text', true),
      description: f('description_json', 'text', true),
      nature: f('nature', 'text'),
      eventFormat: f('event_format', 'text'),
      statusOverride: f('status_override', 'text'),
      startTime: f('start_time', 'datetime'),
      endTime: f('end_time', 'datetime'),
      link: f('link', 'text'),
      coverImage: f('cover_image_url', 'media'),
      organizer: f('organizer', 'text'),
      organizerVerified: f('organizer_verified', 'boolean'),
      sourceName: f('source_platform', 'text'),
      sourceUrl: f('source_url', 'text'),
      lastVerifiedAt: f('last_verified_at', 'datetime'),
      tags: f('tags_json', 'text'),
      guests: f('guests_json', 'text', true),
      ticketPriceText: f('ticket_price_text_json', 'text', true),
      priceMin: f('price_min', 'number'),
      priceMax: f('price_max', 'number'),
      currency: f('currency', 'text'),
      ticketStatus: f('ticket_status', 'text'),
      ticketUrl: f('ticket_url', 'text'),
      publishedAt: f('published_at', 'published-at'),
    },
  },
  'offline-events': {
    table: 'events',
    fixedFilter: { column: 'kind', value: 'offline' },
    // kind 不在字段白名单里：判别列由 fixedFilter 落值，客户端指定一律 400
    sideTable: {
      table: 'event_locations',
      fk: 'event_id',
      fields: {
        country: f('country', 'text'),
        region: f('region', 'text'),
        city: f('city', 'text'),
        venue: f('venue', 'text'),
        address: f('address', 'text'),
        location: f('location_note', 'text'),
        mapUrl: f('map_url', 'text'),
      },
    },
    localized: true,
    supportsDraft: true,
    searchColumns: ['organizer', 'source_platform', 'source_url'],
    defaultSort: [['start_time', 'desc']],
    labelColumn: 'title_json',
    fields: {
      title: f('title_json', 'text', true),
      description: f('description_json', 'text', true),
      nature: f('nature', 'text'),
      eventFormat: f('event_format', 'text'),
      statusOverride: f('status_override', 'text'),
      startTime: f('start_time', 'datetime'),
      endTime: f('end_time', 'datetime'),
      link: f('link', 'text'),
      coverImage: f('cover_image_url', 'media'),
      organizer: f('organizer', 'text'),
      organizerVerified: f('organizer_verified', 'boolean'),
      sourceName: f('source_platform', 'text'),
      sourceUrl: f('source_url', 'text'),
      lastVerifiedAt: f('last_verified_at', 'datetime'),
      tags: f('tags_json', 'text'),
      guests: f('guests_json', 'text', true),
      ticketPriceText: f('ticket_price_text_json', 'text', true),
      priceMin: f('price_min', 'number'),
      priceMax: f('price_max', 'number'),
      currency: f('currency', 'text'),
      ticketStatus: f('ticket_status', 'text'),
      ticketUrl: f('ticket_url', 'text'),
      publishedAt: f('published_at', 'published-at'),
    },
  },
  announcements: {
    table: 'announcements',
    localized: true,
    supportsDraft: true,
    searchColumns: ['title_json', 'content_json'],
    defaultSort: [
      ['is_pinned', 'desc'],
      ['priority', 'desc'],
      ['updated_at', 'desc'],
    ],
    labelColumn: 'title_json',
    // is_active 由发布状态联动写入，不作为独立字段暴露
    activeColumn: 'is_active',
    fields: {
      title: f('title_json', 'text', true),
      content: f('content_json', 'text', true),
      link: f('link', 'text'),
      coverImage: f('cover_image_url', 'media'),
      priority: f('priority', 'number'),
      isPinned: f('is_pinned', 'boolean'),
      publishedAt: f('published_at', 'published-at'),
    },
  },
  'friend-links': {
    table: 'friend_links',
    localized: true,
    supportsDraft: true,
    searchColumns: ['url'],
    defaultSort: [
      ['priority', 'desc'],
      ['updated_at', 'desc'],
    ],
    labelColumn: 'title_json',
    // is_active 由发布状态联动写入，不作为独立字段暴露
    activeColumn: 'is_active',
    fields: {
      title: f('title_json', 'text', true),
      description: f('description_json', 'text', true),
      url: f('url', 'text'),
      icon: f('icon_url', 'media'),
      priority: f('priority', 'number'),
      publishedAt: f('published_at', 'published-at'),
    },
  },
  'spoiler-tiers': {
    table: 'spoiler_tiers',
    localized: true,
    supportsDraft: true,
    searchColumns: ['key'],
    defaultSort: [
      ['sort_order', 'asc'],
      ['updated_at', 'desc'],
    ],
    labelColumn: 'key',
    fields: {
      key: f('key', 'text'),
      name: f('title_json', 'text', true),
      order: f('sort_order', 'number'),
      publishedAt: f('published_at', 'published-at'),
    },
  },
  'research-entries': {
    table: 'research_entries',
    localized: true,
    supportsDraft: true,
    searchColumns: ['slug'],
    defaultSort: [['updated_at', 'desc']],
    labelColumn: 'title_json',
    fields: {
      title: f('title_json', 'text', true),
      slug: f('slug', 'text'),
      summary: f('summary_json', 'text', true),
      body: f('body_json', 'text', true),
      stance: f('stance', 'text'),
      mediaType: f('media_type', 'text'),
      spoilerTier: rel('spoiler_tier_id', 'spoiler_tiers'),
      publishedAt: f('published_at', 'published-at'),
    },
  },
  'research-themes': {
    table: 'research_themes',
    localized: true,
    supportsDraft: true,
    searchColumns: ['slug'],
    defaultSort: [['updated_at', 'desc']],
    labelColumn: 'title_json',
    fields: {
      title: f('title_json', 'text', true),
      slug: f('slug', 'text'),
      curatedIntro: f('curated_intro_json', 'text', true),
      publishedAt: f('published_at', 'published-at'),
    },
  },
  'research-subjects': {
    table: 'research_subjects',
    localized: true,
    supportsDraft: true,
    searchColumns: ['slug'],
    defaultSort: [['updated_at', 'desc']],
    labelColumn: 'title_json',
    fields: {
      title: f('title_json', 'text', true),
      slug: f('slug', 'text'),
      description: f('description_json', 'text', true),
      subjectType: f('subject_type', 'text'),
      cover: f('cover_url', 'media'),
      publishedAt: f('published_at', 'published-at'),
    },
  },
  'research-paths': {
    table: 'research_paths',
    localized: true,
    supportsDraft: true,
    searchColumns: ['slug'],
    defaultSort: [
      ['sort_order', 'asc'],
      ['updated_at', 'desc'],
    ],
    labelColumn: 'title_json',
    fields: {
      title: f('title_json', 'text', true),
      slug: f('slug', 'text'),
      description: f('description_json', 'text', true),
      difficulty: f('difficulty', 'text'),
      order: f('sort_order', 'number'),
      publishedAt: f('published_at', 'published-at'),
    },
  },
  'research-citations': {
    table: 'research_citations',
    localized: true,
    supportsDraft: true,
    searchColumns: ['source_ref'],
    defaultSort: [['updated_at', 'desc']],
    labelColumn: 'claim_short_json',
    fields: {
      claimShort: f('claim_short_json', 'text', true),
      sourceType: f('source_type', 'text'),
      sourceRef: f('source_ref', 'text'),
      sourceQuote: f('source_quote_json', 'text', true),
      confidence: f('confidence', 'text'),
      publishedAt: f('published_at', 'published-at'),
    },
  },
}

/** 质量扫描覆盖的内容集合（与旧后端 scanContentQuality 对齐）。 */
export const QUALITY_SCAN_COLLECTIONS = [
  'events',
  'students',
  'announcements',
  'friend-links',
] as const

export function isPanelCollection(key: string): key is keyof typeof COLLECTIONS & string {
  return Object.hasOwn(COLLECTIONS, key)
}
