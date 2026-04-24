import type { Locale } from '@/lib/i18n'

export type AdminCollectionKey =
  | 'announcements'
  | 'works'
  | 'online-events'
  | 'offline-events'
  | 'students'
  | 'bilibili-subscriptions'

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

export interface AdminFieldOption {
  value: string
  label: string
}

export interface AdminEditorField {
  name: string
  type: AdminFieldType
  label: Record<Locale, string>
  placeholder?: Record<Locale, string>
  description?: Record<Locale, string>
  options?: AdminFieldOption[]
  relationKey?: string
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
      { name: 'isActive', type: 'boolean', label: { 'zh-Hans': '启用', en: 'Active', ja: '有効' } },
      { name: 'coverImage', type: 'media', label: { 'zh-Hans': '封面图', en: 'Cover image', ja: 'カバー画像' } },
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
      { name: 'sourcePlatform', type: 'text', label: { 'zh-Hans': '来源平台', en: 'Source platform', ja: '元プラットフォーム' } },
      { name: 'sourceId', type: 'text', label: { 'zh-Hans': '来源 ID', en: 'Source ID', ja: '元 ID' } },
      { name: 'isAutoImported', type: 'boolean', label: { 'zh-Hans': '自动导入', en: 'Auto imported', ja: '自動取込' } },
      { name: 'importedAt', type: 'datetime-local', label: { 'zh-Hans': '导入时间', en: 'Imported at', ja: '取込日時' } },
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
      { name: 'school', type: 'text', label: { 'zh-Hans': '学校', en: 'School', ja: '学校' } },
      { name: 'organization', type: 'text', label: { 'zh-Hans': '组织', en: 'Organization', ja: '所属' } },
      { name: 'avatar', type: 'media', label: { 'zh-Hans': '头像', en: 'Avatar', ja: 'アイコン' } },
      { name: 'bio', type: 'textarea', label: { 'zh-Hans': '简介', en: 'Bio', ja: '紹介' } },
      { name: 'publishedAt', type: 'boolean', label: { 'zh-Hans': '立即发布', en: 'Publish now', ja: 'すぐ公開' } },
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
}
