import type { Locale } from '@/lib/i18n'

export type AdminCollectionKey =
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

export type AdminFieldType =
  | 'text'
  | 'textarea'
  | 'url'
  | 'number'
  | 'boolean'
  | 'datetime-local'
  | 'select'
  | 'media'
  | 'multiselect'
  | 'relation-multiselect'
  | 'relation-select'
  | 'component-rows'
  | 'json-csv'

export interface AdminFieldOption {
  value: string
  label: string | Record<Locale, string>
}

export function resolveOptionLabel(option: AdminFieldOption, locale: Locale): string {
  if (typeof option.label === 'string') {
    return option.label
  }
  return option.label[locale] || option.label['zh-Hans'] || option.value
}

export interface AdminRowColumn {
  name: string
  kind: 'relation' | 'select' | 'text' | 'date'
  label: Record<Locale, string>
  options?: AdminFieldOption[]
  relationKey?: string
}

export interface AdminEditorField {
  name: string
  type: AdminFieldType
  label: Record<Locale, string>
  placeholder?: Record<Locale, string>
  description?: Record<Locale, string>
  options?: AdminFieldOption[]
  relationKey?: string
  columns?: AdminRowColumn[]
}

export interface AdminCollectionMeta {
  endpoint: string
  localized: boolean
  supportsDraft: boolean
  title: Record<Locale, string>
  description: Record<Locale, string>
  createLabel: Record<Locale, string>
  editLabel: Record<Locale, string>
  fields: AdminEditorField[]
}

export interface AdminMediaAsset {
  id: number
  url: string
  alternativeText?: string | null
  name?: string | null
}

export interface AdminRelationOption {
  id: number
  label: string
  imageUrl?: string
  description?: string
}

const commonNatureOptions: AdminFieldOption[] = [
  { value: 'official', label: 'official' },
  { value: 'fanmade', label: 'fanmade' },
]

export const relationTypeOptions: AdminFieldOption[] = [
  { value: 'related', label: { 'zh-Hans': '相关', en: 'Related', ja: '関連' } },
  { value: 'prototype', label: { 'zh-Hans': '原型', en: 'Prototype of', ja: '原型・モチーフ' } },
  { value: 'echoes', label: { 'zh-Hans': '呼应', en: 'Echoes', ja: '呼応' } },
  { value: 'extends', label: { 'zh-Hans': '补充', en: 'Builds on', ja: '補足' } },
  { value: 'contradicts', label: { 'zh-Hans': '相左', en: 'Contradicts', ja: '対立' } },
  { value: 'prerequisite', label: { 'zh-Hans': '前置阅读', en: 'Read first', ja: '前提知識' } },
]

export const revisionTypeOptions: AdminFieldOption[] = [
  { value: 'created', label: { 'zh-Hans': '建立', en: 'Created', ja: '作成' } },
  { value: 'updated', label: { 'zh-Hans': '更新', en: 'Updated', ja: '更新' } },
  { value: 'confirmed', label: { 'zh-Hans': '获官方证实', en: 'Confirmed by canon', ja: '公式で確定' } },
  { value: 'refuted', label: { 'zh-Hans': '被官方推翻', en: 'Refuted by canon', ja: '公式で否定' } },
]

export const subjectTypeOptions: AdminFieldOption[] = [
  { value: 'school', label: { 'zh-Hans': '学院', en: 'School', ja: '学園' } },
  { value: 'organization', label: { 'zh-Hans': '组织', en: 'Organization', ja: '組織' } },
  { value: 'club', label: { 'zh-Hans': '社团', en: 'Club', ja: '部活' } },
  { value: 'character', label: { 'zh-Hans': '人物', en: 'Character', ja: '人物' } },
  { value: 'location', label: { 'zh-Hans': '地点', en: 'Location', ja: '場所' } },
  { value: 'concept', label: { 'zh-Hans': '概念', en: 'Concept', ja: '概念' } },
  { value: 'item', label: { 'zh-Hans': '物品', en: 'Item', ja: 'アイテム' } },
]

const sourcePlatformOptions: AdminFieldOption[] = [
  { value: 'manual', label: 'manual' },
  { value: 'bilibili', label: 'bilibili' },
  { value: 'twitter', label: 'twitter' },
  { value: 'pixiv', label: 'pixiv' },
  { value: 'youtube', label: 'youtube' },
  { value: 'other', label: 'other' },
]

export const ADMIN_COLLECTION_META: Record<AdminCollectionKey, AdminCollectionMeta> = {
  announcements: {
    endpoint: 'announcements',
    localized: true,
    supportsDraft: true,
    title: {
      'zh-Hans': '公告',
      en: 'Announcements',
      ja: 'お知らせ',
    },
    description: {
      'zh-Hans': '创建、编辑和发布站内公告。',
      en: 'Create, edit, and publish announcements.',
      ja: 'お知らせを作成・編集・公開します。',
    },
    createLabel: {
      'zh-Hans': '新建公告',
      en: 'New announcement',
      ja: 'お知らせを新規作成',
    },
    editLabel: {
      'zh-Hans': '编辑公告',
      en: 'Edit announcement',
      ja: 'お知らせを編集',
    },
    fields: [
      { name: 'title', type: 'text', label: { 'zh-Hans': '标题', en: 'Title', ja: 'タイトル' } },
      { name: 'content', type: 'textarea', label: { 'zh-Hans': '正文', en: 'Content', ja: '本文' } },
      { name: 'link', type: 'url', label: { 'zh-Hans': '跳转链接', en: 'Link', ja: 'リンク' } },
      { name: 'priority', type: 'number', label: { 'zh-Hans': '优先级', en: 'Priority', ja: '優先度' } },
      { name: 'isPinned', type: 'boolean', label: { 'zh-Hans': '置顶', en: 'Pinned', ja: '固定表示' } },
      { name: 'isActive', type: 'boolean', label: { 'zh-Hans': '启用', en: 'Active', ja: '有効' } },
      { name: 'coverImage', type: 'media', label: { 'zh-Hans': '封面图', en: 'Cover image', ja: 'カバー画像' } },
      { name: 'publishedAt', type: 'boolean', label: { 'zh-Hans': '立即发布', en: 'Publish now', ja: 'すぐ公開' } },
    ],
  },
  'friend-links': {
    endpoint: 'friend-links',
    localized: true,
    supportsDraft: true,
    title: {
      'zh-Hans': '友情链接',
      en: 'Friend Links',
      ja: '相互リンク',
    },
    description: {
      'zh-Hans': '维护首页底部展示的友情链接。',
      en: 'Manage friend links shown at the bottom of the home page.',
      ja: 'ホーム下部に表示する相互リンクを管理します。',
    },
    createLabel: {
      'zh-Hans': '新建友链',
      en: 'New friend link',
      ja: '相互リンクを新規作成',
    },
    editLabel: {
      'zh-Hans': '编辑友链',
      en: 'Edit friend link',
      ja: '相互リンクを編集',
    },
    fields: [
      { name: 'title', type: 'text', label: { 'zh-Hans': '标题', en: 'Title', ja: 'タイトル' } },
      { name: 'description', type: 'textarea', label: { 'zh-Hans': '简介', en: 'Description', ja: '説明' } },
      { name: 'url', type: 'url', label: { 'zh-Hans': '跳转链接', en: 'URL', ja: 'URL' } },
      { name: 'priority', type: 'number', label: { 'zh-Hans': '优先级', en: 'Priority', ja: '優先度' } },
      { name: 'isActive', type: 'boolean', label: { 'zh-Hans': '启用', en: 'Active', ja: '有効' } },
      { name: 'icon', type: 'media', label: { 'zh-Hans': '图标', en: 'Icon', ja: 'アイコン' } },
      { name: 'publishedAt', type: 'boolean', label: { 'zh-Hans': '立即发布', en: 'Publish now', ja: 'すぐ公開' } },
    ],
  },
  works: {
    endpoint: 'works',
    localized: true,
    supportsDraft: true,
    title: {
      'zh-Hans': '推荐作品',
      en: 'Works',
      ja: '作品',
    },
    description: {
      'zh-Hans': '维护作品信息、来源与关联学生。',
      en: 'Manage work details, sources, and related students.',
      ja: '作品情報、出典、関連生徒を管理します。',
    },
    createLabel: {
      'zh-Hans': '新建作品',
      en: 'New work',
      ja: '作品を新規作成',
    },
    editLabel: {
      'zh-Hans': '编辑作品',
      en: 'Edit work',
      ja: '作品を編集',
    },
    fields: [
      { name: 'title', type: 'text', label: { 'zh-Hans': '标题', en: 'Title', ja: 'タイトル' } },
      { name: 'author', type: 'text', label: { 'zh-Hans': '作者', en: 'Author', ja: '作者' } },
      { name: 'description', type: 'textarea', label: { 'zh-Hans': '简介', en: 'Description', ja: '説明' } },
      { name: 'nature', type: 'select', label: { 'zh-Hans': '性质', en: 'Nature', ja: '区分' }, options: commonNatureOptions },
      { name: 'workType', type: 'select', label: { 'zh-Hans': '类型', en: 'Type', ja: '種類' }, options: [
        { value: 'video', label: 'video' },
        { value: 'image', label: 'image' },
        { value: 'text', label: 'text' },
        { value: 'other', label: 'other' },
      ] },
      { name: 'link', type: 'url', label: { 'zh-Hans': '作品链接', en: 'Work link', ja: '作品リンク' } },
      { name: 'isActive', type: 'boolean', label: { 'zh-Hans': '启用', en: 'Active', ja: '有効' } },
      { name: 'sourceUrl', type: 'url', label: { 'zh-Hans': '源地址', en: 'Source URL', ja: '元 URL' } },
      { name: 'sourcePlatform', type: 'select', label: { 'zh-Hans': '来源平台', en: 'Source platform', ja: '元プラットフォーム' }, options: sourcePlatformOptions },
      { name: 'sourceId', type: 'text', label: { 'zh-Hans': '来源 ID', en: 'Source ID', ja: '元 ID' } },
      { name: 'isAutoImported', type: 'boolean', label: { 'zh-Hans': '自动导入', en: 'Auto imported', ja: '自動取込' } },
      { name: 'importedAt', type: 'datetime-local', label: { 'zh-Hans': '导入时间', en: 'Imported at', ja: '取込日時' } },
      { name: 'isFeatured', type: 'boolean', label: { 'zh-Hans': '精选推荐', en: 'Featured', ja: 'おすすめ' } },
      { name: 'featuredPriority', type: 'number', label: { 'zh-Hans': '推荐优先级', en: 'Featured priority', ja: 'おすすめ優先度' } },
      { name: 'featuredReason', type: 'textarea', label: { 'zh-Hans': '推荐理由', en: 'Featured reason', ja: 'おすすめ理由' } },
      { name: 'featuredUntil', type: 'datetime-local', label: { 'zh-Hans': '推荐到期时间', en: 'Featured until', ja: 'おすすめ期限' } },
      { name: 'coverImageUrl', type: 'url', label: { 'zh-Hans': '远程封面地址', en: 'Remote cover URL', ja: 'リモートカバー URL' } },
      { name: 'originalPublishDate', type: 'datetime-local', label: { 'zh-Hans': '原始发布日期', en: 'Original publish date', ja: '元公開日時' } },
      { name: 'coverImage', type: 'media', label: { 'zh-Hans': '封面图', en: 'Cover image', ja: 'カバー画像' } },
      { name: 'students', type: 'multiselect', label: { 'zh-Hans': '关联学生', en: 'Related students', ja: '関連生徒' }, relationKey: 'students' },
      { name: 'publishedAt', type: 'boolean', label: { 'zh-Hans': '立即发布', en: 'Publish now', ja: 'すぐ公開' } },
    ],
  },
  'online-events': {
    endpoint: 'online-events',
    localized: true,
    supportsDraft: true,
    title: {
      'zh-Hans': '线上活动',
      en: 'Online events',
      ja: 'オンラインイベント',
    },
    description: {
      'zh-Hans': '维护线上活动时间、主办和封面。',
      en: 'Manage online event schedule, organizer, and artwork.',
      ja: 'オンラインイベントの時間、主催、画像を管理します。',
    },
    createLabel: {
      'zh-Hans': '新建线上活动',
      en: 'New online event',
      ja: 'オンラインイベントを新規作成',
    },
    editLabel: {
      'zh-Hans': '编辑线上活动',
      en: 'Edit online event',
      ja: 'オンラインイベントを編集',
    },
    fields: [
      { name: 'title', type: 'text', label: { 'zh-Hans': '标题', en: 'Title', ja: 'タイトル' } },
      { name: 'nature', type: 'select', label: { 'zh-Hans': '性质', en: 'Nature', ja: '区分' }, options: commonNatureOptions },
      { name: 'startTime', type: 'datetime-local', label: { 'zh-Hans': '开始时间', en: 'Start time', ja: '開始日時' } },
      { name: 'endTime', type: 'datetime-local', label: { 'zh-Hans': '结束时间', en: 'End time', ja: '終了日時' } },
      { name: 'link', type: 'url', label: { 'zh-Hans': '活动链接', en: 'Event link', ja: 'イベントリンク' } },
      { name: 'organizer', type: 'text', label: { 'zh-Hans': '主办方', en: 'Organizer', ja: '主催' } },
      { name: 'description', type: 'textarea', label: { 'zh-Hans': '活动说明', en: 'Description', ja: '説明' } },
      { name: 'coverImage', type: 'media', label: { 'zh-Hans': '封面图', en: 'Cover image', ja: 'カバー画像' } },
      { name: 'publishedAt', type: 'boolean', label: { 'zh-Hans': '立即发布', en: 'Publish now', ja: 'すぐ公開' } },
    ],
  },
  'offline-events': {
    endpoint: 'offline-events',
    localized: true,
    supportsDraft: true,
    title: {
      'zh-Hans': '线下活动',
      en: 'Offline events',
      ja: 'オフラインイベント',
    },
    description: {
      'zh-Hans': '维护线下活动的地点、嘉宾和排期。',
      en: 'Manage venue, guests, and schedule for offline events.',
      ja: 'オフラインイベントの場所、ゲスト、日程を管理します。',
    },
    createLabel: {
      'zh-Hans': '新建线下活动',
      en: 'New offline event',
      ja: 'オフラインイベントを新規作成',
    },
    editLabel: {
      'zh-Hans': '编辑线下活动',
      en: 'Edit offline event',
      ja: 'オフラインイベントを編集',
    },
    fields: [
      { name: 'title', type: 'text', label: { 'zh-Hans': '标题', en: 'Title', ja: 'タイトル' } },
      { name: 'nature', type: 'select', label: { 'zh-Hans': '性质', en: 'Nature', ja: '区分' }, options: commonNatureOptions },
      { name: 'location', type: 'text', label: { 'zh-Hans': '地点', en: 'Location', ja: '場所' } },
      { name: 'guests', type: 'textarea', label: { 'zh-Hans': '嘉宾', en: 'Guests', ja: 'ゲスト' } },
      { name: 'startTime', type: 'datetime-local', label: { 'zh-Hans': '开始时间', en: 'Start time', ja: '開始日時' } },
      { name: 'endTime', type: 'datetime-local', label: { 'zh-Hans': '结束时间', en: 'End time', ja: '終了日時' } },
      { name: 'link', type: 'url', label: { 'zh-Hans': '活动链接', en: 'Event link', ja: 'イベントリンク' } },
      { name: 'organizer', type: 'text', label: { 'zh-Hans': '主办方', en: 'Organizer', ja: '主催' } },
      { name: 'description', type: 'textarea', label: { 'zh-Hans': '活动说明', en: 'Description', ja: '説明' } },
      { name: 'coverImage', type: 'media', label: { 'zh-Hans': '封面图', en: 'Cover image', ja: 'カバー画像' } },
      { name: 'publishedAt', type: 'boolean', label: { 'zh-Hans': '立即发布', en: 'Publish now', ja: 'すぐ公開' } },
    ],
  },
  students: {
    endpoint: 'students',
    localized: true,
    supportsDraft: true,
    title: {
      'zh-Hans': '学生',
      en: 'Students',
      ja: '生徒',
    },
    description: {
      'zh-Hans': '维护学生基础信息、头像和简介。',
      en: 'Manage student basics, avatar, and profile text.',
      ja: '生徒の基本情報、アイコン、紹介文を管理します。',
    },
    createLabel: {
      'zh-Hans': '新建学生',
      en: 'New student',
      ja: '生徒を新規作成',
    },
    editLabel: {
      'zh-Hans': '编辑学生',
      en: 'Edit student',
      ja: '生徒を編集',
    },
    fields: [
      { name: 'name', type: 'text', label: { 'zh-Hans': '姓名', en: 'Name', ja: '名前' } },
      { name: 'school_ref', type: 'relation-select', label: { 'zh-Hans': '所属学院', en: 'School', ja: '所属学園' }, relationKey: 'schools' },
      { name: 'organization', type: 'text', label: { 'zh-Hans': '组织', en: 'Organization', ja: '所属' } },
      { name: 'avatar', type: 'media', label: { 'zh-Hans': '头像', en: 'Avatar', ja: 'アイコン' } },
      { name: 'bio', type: 'textarea', label: { 'zh-Hans': '简介', en: 'Bio', ja: '紹介' } },
      { name: 'publishedAt', type: 'boolean', label: { 'zh-Hans': '立即发布', en: 'Publish now', ja: 'すぐ公開' } },
    ],
  },
  schools: {
    endpoint: 'schools',
    localized: true,
    supportsDraft: false,
    title: {
      'zh-Hans': '学院',
      en: 'Schools',
      ja: '学園',
    },
    description: {
      'zh-Hans': '维护基沃托斯各学院的名称、颜色与排序，前台筛选与展示均使用这里的数据。',
      en: 'Manage Kivotos schools (names, color, order). Filters and labels on the site read from here.',
      ja: 'キヴォトス各学園の名称・カラー・並び順を管理します。サイトの表示はここを参照します。',
    },
    createLabel: {
      'zh-Hans': '新建学院',
      en: 'New school',
      ja: '学園を新規作成',
    },
    editLabel: {
      'zh-Hans': '编辑学院',
      en: 'Edit school',
      ja: '学園を編集',
    },
    fields: [
      { name: 'name', type: 'text', label: { 'zh-Hans': '名称', en: 'Name', ja: '名称' } },
      { name: 'slug', type: 'text', label: { 'zh-Hans': 'Slug（URL 标识）', en: 'Slug', ja: 'スラグ' } },
      { name: 'description', type: 'textarea', label: { 'zh-Hans': '简介', en: 'Description', ja: '説明' } },
      { name: 'color', type: 'text', label: { 'zh-Hans': '主题色（如 #2d77c9）', en: 'Theme color (e.g. #2d77c9)', ja: 'テーマカラー（例 #2d77c9）' } },
      { name: 'order', type: 'number', label: { 'zh-Hans': '排序', en: 'Order', ja: '並び順' } },
      { name: 'logo', type: 'media', label: { 'zh-Hans': '校徽', en: 'Logo', ja: 'ロゴ' } },
    ],
  },
  'bilibili-subscriptions': {
    endpoint: 'bilibili-subscriptions',
    localized: false,
    supportsDraft: false,
    title: {
      'zh-Hans': 'B站订阅',
      en: 'Bilibili subscriptions',
      ja: 'B站購読',
    },
    description: {
      'zh-Hans': '维护 UP 主订阅和自动同步配置。',
      en: 'Manage creator subscriptions and sync settings.',
      ja: 'UP 主購読と同期設定を管理します。',
    },
    createLabel: {
      'zh-Hans': '新建订阅',
      en: 'New subscription',
      ja: '購読を新規作成',
    },
    editLabel: {
      'zh-Hans': '编辑订阅',
      en: 'Edit subscription',
      ja: '購読を編集',
    },
    fields: [
      { name: 'upName', type: 'text', label: { 'zh-Hans': 'UP 名称', en: 'Creator name', ja: 'UP 名' } },
      { name: 'uid', type: 'text', label: { 'zh-Hans': 'UID', en: 'UID', ja: 'UID' } },
      { name: 'isActive', type: 'boolean', label: { 'zh-Hans': '启用', en: 'Active', ja: '有効' } },
      { name: 'defaultNature', type: 'select', label: { 'zh-Hans': '默认性质', en: 'Default nature', ja: '既定区分' }, options: commonNatureOptions },
      { name: 'autoPublishKeywords', type: 'textarea', label: { 'zh-Hans': '自动发布关键词', en: 'Auto-publish keywords', ja: '自動公開キーワード' } },
      { name: 'notes', type: 'textarea', label: { 'zh-Hans': '备注', en: 'Notes', ja: 'メモ' } },
    ],
  },
  'sync-logs': {
    endpoint: 'sync-logs',
    localized: false,
    supportsDraft: false,
    title: {
      'zh-Hans': '同步日志',
      en: 'Sync logs',
      ja: '同期ログ',
    },
    description: {
      'zh-Hans': '查看 RSSHub 与自动导入任务的执行结果。',
      en: 'Review RSSHub and auto-import execution results.',
      ja: 'RSSHub と自動取込タスクの実行結果を確認します。',
    },
    createLabel: {
      'zh-Hans': '新建日志',
      en: 'New log',
      ja: 'ログを新規作成',
    },
    editLabel: {
      'zh-Hans': '查看日志',
      en: 'View log',
      ja: 'ログを表示',
    },
    fields: [],
  },
  'admin-audit-logs': {
    endpoint: 'admin-audit-logs',
    localized: false,
    supportsDraft: false,
    title: {
      'zh-Hans': '审计日志',
      en: 'Audit logs',
      ja: '監査ログ',
    },
    description: {
      'zh-Hans': '查看自研后台的创建、更新、删除、上传与同步操作。',
      en: 'Review custom panel create, update, delete, upload, and sync actions.',
      ja: '独自管理パネルの作成、更新、削除、アップロード、同期操作を確認します。',
    },
    createLabel: {
      'zh-Hans': '新建审计日志',
      en: 'New audit log',
      ja: '監査ログを新規作成',
    },
    editLabel: {
      'zh-Hans': '查看审计日志',
      en: 'View audit log',
      ja: '監査ログを表示',
    },
    fields: [],
  },
  'research-entries': {
    endpoint: 'research-entries',
    localized: true,
    supportsDraft: true,
    title: {
      'zh-Hans': '考据条目',
      en: 'Research Entries',
      ja: '考察記事',
    },
    description: {
      'zh-Hans': '维护考据档案主体内容与元数据。',
      en: 'Manage research archive entries and metadata.',
      ja: '考察アーカイブの記事とメタデータを管理します。',
    },
    createLabel: {
      'zh-Hans': '新建条目',
      en: 'New entry',
      ja: '記事を新規作成',
    },
    editLabel: {
      'zh-Hans': '编辑条目',
      en: 'Edit entry',
      ja: '記事を編集',
    },
    fields: [
      { name: 'title', type: 'text', label: { 'zh-Hans': '标题', en: 'Title', ja: 'タイトル' } },
      { name: 'slug', type: 'text', label: { 'zh-Hans': 'Slug（URL 路径）', en: 'Slug (URL path)', ja: 'スラグ（URL）' } },
      { name: 'stance', type: 'select', label: { 'zh-Hans': '立场', en: 'Stance', ja: 'スタンス' }, options: [
        { value: 'official', label: { 'zh-Hans': '官方确认', en: 'Official basis', ja: '公式根拠' } },
        { value: 'personal', label: { 'zh-Hans': '个人考察', en: 'Personal analysis', ja: '個人考察' } },
        { value: 'speculative', label: { 'zh-Hans': '推测性', en: 'Speculative', ja: '推測的' } },
      ] },
      { name: 'media_type', type: 'select', label: { 'zh-Hans': '媒介类型', en: 'Media type', ja: 'メディアタイプ' }, options: [
        { value: 'character', label: { 'zh-Hans': '角色', en: 'Character', ja: 'キャラクター' } },
        { value: 'story', label: { 'zh-Hans': '剧情', en: 'Story', ja: 'ストーリー' } },
        { value: 'concept', label: { 'zh-Hans': '概念', en: 'Concept', ja: '概念' } },
        { value: 'setting', label: { 'zh-Hans': '世界观', en: 'Setting', ja: '設定' } },
        { value: 'organization', label: { 'zh-Hans': '组织', en: 'Organization', ja: '組織' } },
      ] },
      { name: 'subjects', type: 'relation-multiselect', label: { 'zh-Hans': '考据对象', en: 'Subjects', ja: '考察対象' }, relationKey: 'research-subjects' },
      { name: 'themes', type: 'relation-multiselect', label: { 'zh-Hans': '关联主题', en: 'Related themes', ja: '関連テーマ' }, relationKey: 'research-themes' },
      { name: 'citations', type: 'relation-multiselect', label: { 'zh-Hans': '关联引证', en: 'Related citations', ja: '関連引証' }, relationKey: 'research-citations' },
      { name: 'summary', type: 'textarea', label: { 'zh-Hans': '摘要', en: 'Summary', ja: '要約' } },
      { name: 'body', type: 'textarea', label: { 'zh-Hans': '正文', en: 'Body', ja: '本文' },
        description: {
          'zh-Hans': '支持 [[条目slug]] 或 [[条目slug|显示文字]] 站内链接，会自动计入反向链接。',
          en: 'Supports [[entry-slug]] / [[entry-slug|text]] wiki links, counted as backlinks automatically.',
          ja: '[[記事slug]] / [[記事slug|表示名]] のwikiリンクに対応し、自動でバックリンクに反映されます。',
        },
      },
      {
        name: 'related_links', type: 'component-rows', label: { 'zh-Hans': '关联条目', en: 'Related entries', ja: '関連記事' },
        columns: [
          { name: 'target_entry', kind: 'relation', label: { 'zh-Hans': '目标条目', en: 'Target entry', ja: '対象記事' }, relationKey: 'research-entries' },
          { name: 'relation_type', kind: 'select', label: { 'zh-Hans': '关系类型', en: 'Relation', ja: '関係' }, options: relationTypeOptions },
          { name: 'curate_note', kind: 'text', label: { 'zh-Hans': '策展备注', en: 'Curator note', ja: 'キュレーターメモ' } },
        ],
      },
      {
        name: 'revisions', type: 'component-rows', label: { 'zh-Hans': '修订记录', en: 'Revision log', ja: '改訂履歴' },
        columns: [
          { name: 'date', kind: 'date', label: { 'zh-Hans': '日期', en: 'Date', ja: '日付' } },
          { name: 'revision_type', kind: 'select', label: { 'zh-Hans': '类型', en: 'Type', ja: '種類' }, options: revisionTypeOptions },
          { name: 'note', kind: 'text', label: { 'zh-Hans': '说明', en: 'Note', ja: 'メモ' } },
        ],
      },
      { name: 'publishedAt', type: 'boolean', label: { 'zh-Hans': '立即发布', en: 'Publish now', ja: 'すぐ公開' } },
    ],
  },
  'research-subjects': {
    endpoint: 'research-subjects',
    localized: true,
    supportsDraft: true,
    title: {
      'zh-Hans': '考据对象',
      en: 'Research Subjects',
      ja: '考察対象',
    },
    description: {
      'zh-Hans': '知识网络中的实体枢纽：学院、组织、人物、概念等，把考据条目与学生聚合到一处。',
      en: 'Hub entities of the knowledge network: schools, organizations, characters, concepts.',
      ja: '知識ネットワークのハブ：学園・組織・人物・概念など。',
    },
    createLabel: {
      'zh-Hans': '新建考据对象',
      en: 'New subject',
      ja: '対象を新規作成',
    },
    editLabel: {
      'zh-Hans': '编辑考据对象',
      en: 'Edit subject',
      ja: '対象を編集',
    },
    fields: [
      { name: 'name', type: 'text', label: { 'zh-Hans': '名称', en: 'Name', ja: '名称' } },
      { name: 'slug', type: 'text', label: { 'zh-Hans': 'Slug（URL 路径）', en: 'Slug (URL path)', ja: 'スラグ（URL）' } },
      { name: 'subject_type', type: 'select', label: { 'zh-Hans': '对象类型', en: 'Subject type', ja: '対象タイプ' }, options: subjectTypeOptions },
      { name: 'description', type: 'textarea', label: { 'zh-Hans': '简介', en: 'Description', ja: '説明' } },
      { name: 'cover', type: 'media', label: { 'zh-Hans': '封面图', en: 'Cover image', ja: 'カバー画像' } },
      { name: 'students', type: 'relation-multiselect', label: { 'zh-Hans': '相关学生', en: 'Related students', ja: '関連生徒' }, relationKey: 'students' },
      { name: 'publishedAt', type: 'boolean', label: { 'zh-Hans': '立即发布', en: 'Publish now', ja: 'すぐ公開' } },
    ],
  },
  'research-paths': {
    endpoint: 'research-paths',
    localized: true,
    supportsDraft: true,
    title: {
      'zh-Hans': '阅读路径',
      en: 'Reading Paths',
      ja: '読書パス',
    },
    description: {
      'zh-Hans': '策展主题阅读路径，按顺序编排考据条目，读者可以沿路径逐篇阅读。',
      en: 'Curated reading paths: ordered sequences of research entries.',
      ja: 'キュレーションされた読書パス。考察記事を順に並べます。',
    },
    createLabel: {
      'zh-Hans': '新建路径',
      en: 'New path',
      ja: 'パスを新規作成',
    },
    editLabel: {
      'zh-Hans': '编辑路径',
      en: 'Edit path',
      ja: 'パスを編集',
    },
    fields: [
      { name: 'title', type: 'text', label: { 'zh-Hans': '标题', en: 'Title', ja: 'タイトル' } },
      { name: 'slug', type: 'text', label: { 'zh-Hans': 'Slug（URL 路径）', en: 'Slug (URL path)', ja: 'スラグ（URL）' } },
      { name: 'description', type: 'textarea', label: { 'zh-Hans': '路径简介', en: 'Description', ja: '説明' } },
      { name: 'difficulty', type: 'select', label: { 'zh-Hans': '难度', en: 'Difficulty', ja: '難易度' }, options: [
        { value: 'intro', label: { 'zh-Hans': '入门', en: 'Intro', ja: '入門' } },
        { value: 'deep', label: { 'zh-Hans': '深入', en: 'Deep dive', ja: '深掘り' } },
        { value: 'expert', label: { 'zh-Hans': '硬核', en: 'Expert', ja: 'エキスパート' } },
      ] },
      { name: 'order', type: 'number', label: { 'zh-Hans': '排序', en: 'Order', ja: '並び順' } },
      {
        name: 'steps', type: 'component-rows', label: { 'zh-Hans': '路径步骤', en: 'Path steps', ja: 'パスステップ' },
        columns: [
          { name: 'entry', kind: 'relation', label: { 'zh-Hans': '条目', en: 'Entry', ja: '記事' }, relationKey: 'research-entries' },
          { name: 'step_note', kind: 'text', label: { 'zh-Hans': '步骤说明', en: 'Step note', ja: 'ステップメモ' } },
        ],
      },
      { name: 'publishedAt', type: 'boolean', label: { 'zh-Hans': '立即发布', en: 'Publish now', ja: 'すぐ公開' } },
    ],
  },
  'research-themes': {
    endpoint: 'research-themes',
    localized: true,
    supportsDraft: true,
    title: {
      'zh-Hans': '考据主题',
      en: 'Research Themes',
      ja: '考察テーマ',
    },
    description: {
      'zh-Hans': '维护横向贯穿多条目的主题标签。',
      en: 'Manage theme tags that span multiple entries.',
      ja: '複数記事を横断するテーマタグを管理します。',
    },
    createLabel: {
      'zh-Hans': '新建主题',
      en: 'New theme',
      ja: 'テーマを新規作成',
    },
    editLabel: {
      'zh-Hans': '编辑主题',
      en: 'Edit theme',
      ja: 'テーマを編集',
    },
    fields: [
      { name: 'name', type: 'text', label: { 'zh-Hans': '名称', en: 'Name', ja: '名前' } },
      { name: 'slug', type: 'text', label: { 'zh-Hans': 'Slug（URL 路径）', en: 'Slug (URL path)', ja: 'スラグ（URL）' } },
      { name: 'curated_intro', type: 'textarea', label: { 'zh-Hans': '策划简介', en: 'Curated intro', ja: '紹介文' } },
      { name: 'publishedAt', type: 'boolean', label: { 'zh-Hans': '立即发布', en: 'Publish now', ja: 'すぐ公開' } },
    ],
  },
  'research-citations': {
    endpoint: 'research-citations',
    localized: false,
    supportsDraft: true,
    title: {
      'zh-Hans': '考据引证',
      en: 'Research Citations',
      ja: '考察引証',
    },
    description: {
      'zh-Hans': '维护可复用的原始出处与置信度。',
      en: 'Manage reusable primary sources and confidence levels.',
      ja: '再利用可能な一次ソースと信頼度を管理します。',
    },
    createLabel: {
      'zh-Hans': '新建引证',
      en: 'New citation',
      ja: '引証を新規作成',
    },
    editLabel: {
      'zh-Hans': '编辑引证',
      en: 'Edit citation',
      ja: '引証を編集',
    },
    fields: [
      { name: 'claim_short', type: 'text', label: { 'zh-Hans': '论点摘要', en: 'Claim summary', ja: '論点要約' } },
      { name: 'source_type', type: 'select', label: { 'zh-Hans': '来源类型', en: 'Source type', ja: 'ソースタイプ' }, options: [
        { value: 'game_line', label: { 'zh-Hans': '游戏台词', en: 'Game line', ja: 'ゲーム台詞' } },
        { value: 'interview', label: { 'zh-Hans': '采访/发帖', en: 'Interview / post', ja: 'インタビュー/投稿' } },
        { value: 'visual', label: { 'zh-Hans': '画面截图', en: 'Visual evidence', ja: 'ビジュアル証拠' } },
        { value: 'external', label: { 'zh-Hans': '外部资料', en: 'External source', ja: '外部ソース' } },
      ] },
      { name: 'source_ref', type: 'text', label: { 'zh-Hans': '出处标注', en: 'Source reference', ja: '出典注記' } },
      { name: 'source_image', type: 'media', label: { 'zh-Hans': '截图', en: 'Source image', ja: 'スクリーンショット' } },
      { name: 'source_quote', type: 'textarea', label: { 'zh-Hans': '引文', en: 'Source quote', ja: '引用文' } },
      { name: 'confidence', type: 'select', label: { 'zh-Hans': '置信度', en: 'Confidence', ja: '信頼度' }, options: [
        { value: 'official', label: { 'zh-Hans': '官方确认', en: 'Official', ja: '公式' } },
        { value: 'derived', label: { 'zh-Hans': '推导', en: 'Derived', ja: '推導' } },
        { value: 'conjecture', label: { 'zh-Hans': '推测', en: 'Conjecture', ja: '推測' } },
      ] },
      { name: 'publishedAt', type: 'boolean', label: { 'zh-Hans': '立即发布', en: 'Publish now', ja: 'すぐ公開' } },
    ],
  },
}
