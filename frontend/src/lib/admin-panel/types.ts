import type { Locale } from '@/lib/i18n'
import type { EventLocationLevel } from '@/lib/utils/event-location'

// 兼容既有引用：从单一来源转出（历史上这些 options 定义在本文件）
export { relationTypeOptions, revisionTypeOptions, subjectTypeOptions } from '@/lib/research-taxonomy'

export type AdminCollectionKey =
  | 'announcements'
  | 'creators'
  | 'friend-links'
  | 'online-events'
  | 'offline-events'
  | 'students'
  | 'schools'
  | 'admin-audit-logs'
  | 'research-entries'
  | 'research-themes'
  | 'research-citations'
  | 'research-subjects'
  | 'research-paths'
  | 'spoiler-tiers'

export type AdminFieldType =
  | 'text'
  | 'textarea'
  | 'url'
  | 'number'
  | 'boolean'
  | 'datetime-local'
  | 'select'
  | 'location-select'
  | 'media'
  | 'multiselect'
  | 'relation-multiselect'
  | 'relation-select'
  | 'component-rows'
  | 'json-csv'
  /** 发布状态三态控件：草稿 / 立即发布 / 定时发布（带时间选择） */
  | 'publish-state'

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
  /** 必填：界面加星号标记，提交前做非空校验（服务端仍会强制） */
  required?: boolean
  placeholder?: Record<Locale, string>
  description?: Record<Locale, string>
  options?: AdminFieldOption[]
  relationKey?: string
  locationLevel?: EventLocationLevel
  columns?: AdminRowColumn[]
}

export interface AdminCollectionMeta {
  endpoint: string
  localized: boolean
  supportsDraft: boolean
  title: Record<Locale, string>
  /** 只在能补充标题以外的信息时才写 */
  description?: Record<Locale, string>
  createLabel: Record<Locale, string>
  editLabel: Record<Locale, string>
  fields: AdminEditorField[]
}

export interface AdminMediaAsset {
  /** 上传返回的 R2 对象键，形如 panel/xxx.png —— 不是数字 id */
  id: string
  /** 可直接放进 <img src> 的站内路径，形如 /media/panel/xxx.png */
  url: string
  alternativeText?: string | null
  name?: string | null
}

export interface AdminRelationOption {
  /** 关联写入值：documentId 字符串（后端据此解析成外键） */
  id: string
  label: string
  imageUrl?: string
  description?: string
}

export const commonNatureOptions: AdminFieldOption[] = [
  { value: 'official', label: 'official' },
  { value: 'fanmade', label: 'fanmade' },
]

export const eventFormatOptions: AdminFieldOption[] = [
  { value: 'stream', label: { 'zh-Hans': '线上直播 / 放送', en: 'Stream / broadcast', ja: '配信 / 放送' } },
  { value: 'stage', label: { 'zh-Hans': '线下演出', en: 'Stage event', ja: '公演' } },
  { value: 'only', label: { 'zh-Hans': '同人专场', en: 'Only event', ja: 'オンリーイベント' } },
  { value: 'exhibition', label: { 'zh-Hans': '展览 / 快闪', en: 'Exhibition / pop-up', ja: '展示 / ポップアップ' } },
  { value: 'contest', label: { 'zh-Hans': '征集 / 比赛', en: 'Contest / call', ja: '募集 / コンテスト' } },
  { value: 'uncategorized', label: { 'zh-Hans': '未分类', en: 'Uncategorized', ja: '未分類' } },
]

export const eventStatusOverrideOptions: AdminFieldOption[] = [
  { value: 'normal', label: { 'zh-Hans': '正常', en: 'Normal', ja: '通常' } },
  { value: 'postponed', label: { 'zh-Hans': '延期', en: 'Postponed', ja: '延期' } },
  { value: 'cancelled', label: { 'zh-Hans': '取消', en: 'Cancelled', ja: '中止' } },
  { value: 'rescheduled', label: { 'zh-Hans': '改期', en: 'Rescheduled', ja: '日程変更' } },
  { value: 'ticketing', label: { 'zh-Hans': '售票中', en: 'Ticketing', ja: '販売中' } },
  { value: 'sold_out', label: { 'zh-Hans': '已售罄', en: 'Sold out', ja: '完売' } },
  { value: 'changed', label: { 'zh-Hans': '信息变更', en: 'Changed', ja: '変更あり' } },
]

export const ticketStatusOptions: AdminFieldOption[] = [
  { value: 'unknown', label: { 'zh-Hans': '未知', en: 'Unknown', ja: '不明' } },
  { value: 'free', label: { 'zh-Hans': '免费', en: 'Free', ja: '無料' } },
  { value: 'ticketing', label: { 'zh-Hans': '售票中', en: 'Ticketing', ja: '販売中' } },
  { value: 'lottery', label: { 'zh-Hans': '抽选 / 抽票', en: 'Lottery', ja: '抽選' } },
  { value: 'sold_out', label: { 'zh-Hans': '已售罄', en: 'Sold out', ja: '完売' } },
  { value: 'closed', label: { 'zh-Hans': '已截止', en: 'Closed', ja: '終了' } },
]

export const sourcePlatformOptions: AdminFieldOption[] = [
  { value: 'manual', label: 'manual' },
  { value: 'bilibili', label: 'bilibili' },
  { value: 'twitter', label: 'twitter' },
  { value: 'pixiv', label: 'pixiv' },
  { value: 'youtube', label: 'youtube' },
  { value: 'other', label: 'other' },
]

