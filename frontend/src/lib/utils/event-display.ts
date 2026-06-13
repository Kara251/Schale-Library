import type {
  EventFormat,
  EventSourcePlatform,
  EventStatusOverride,
  EventTicketStatus,
  OfflineEvent,
  OnlineEvent,
} from '@/lib/api'
import type { Locale } from '@/lib/i18n'

type AnyEvent = OnlineEvent | OfflineEvent

const statusOverrideLabels: Record<Locale, Record<EventStatusOverride, string>> = {
  'zh-Hans': {
    normal: '',
    postponed: '延期',
    cancelled: '取消',
    rescheduled: '改期',
    ticketing: '售票中',
    sold_out: '已售罄',
    changed: '信息变更',
  },
  en: {
    normal: '',
    postponed: 'Postponed',
    cancelled: 'Cancelled',
    rescheduled: 'Rescheduled',
    ticketing: 'Ticketing',
    sold_out: 'Sold out',
    changed: 'Changed',
  },
  ja: {
    normal: '',
    postponed: '延期',
    cancelled: '中止',
    rescheduled: '日程変更',
    ticketing: '販売中',
    sold_out: '完売',
    changed: '変更あり',
  },
}

const formatLabels: Record<Locale, Record<EventFormat, string>> = {
  'zh-Hans': {
    live_stream: '线上直播',
    live_show: 'Live',
    only_event: 'Only',
    collaboration: '联动',
    contest: '征集',
    campaign: '企划',
    exhibition: '展览',
    meetup: '聚会',
    release: '放送',
    other: '活动',
  },
  en: {
    live_stream: 'Live stream',
    live_show: 'Live',
    only_event: 'Only',
    collaboration: 'Collab',
    contest: 'Contest',
    campaign: 'Campaign',
    exhibition: 'Exhibition',
    meetup: 'Meetup',
    release: 'Release',
    other: 'Event',
  },
  ja: {
    live_stream: '配信',
    live_show: 'ライブ',
    only_event: 'Only',
    collaboration: 'コラボ',
    contest: '募集',
    campaign: '企画',
    exhibition: '展示',
    meetup: '交流会',
    release: '放送',
    other: 'イベント',
  },
}

const ticketLabels: Record<Locale, Record<EventTicketStatus, string>> = {
  'zh-Hans': {
    unknown: '',
    free: '免费',
    ticketing: '售票中',
    lottery: '抽选',
    sold_out: '已售罄',
    closed: '已截止',
  },
  en: {
    unknown: '',
    free: 'Free',
    ticketing: 'Ticketing',
    lottery: 'Lottery',
    sold_out: 'Sold out',
    closed: 'Closed',
  },
  ja: {
    unknown: '',
    free: '無料',
    ticketing: '販売中',
    lottery: '抽選',
    sold_out: '完売',
    closed: '終了',
  },
}

const sourceLabels: Record<Locale, Record<EventSourcePlatform, string>> = {
  'zh-Hans': {
    manual: '手动维护',
    official: '官方',
    baonly: 'baonly.cn',
    bilibili: 'Bilibili',
    x: 'X / Twitter',
    youtube: 'YouTube',
    website: '官网',
    ticketing: '票务平台',
    other: '其他',
  },
  en: {
    manual: 'Manual',
    official: 'Official',
    baonly: 'baonly.cn',
    bilibili: 'Bilibili',
    x: 'X / Twitter',
    youtube: 'YouTube',
    website: 'Website',
    ticketing: 'Ticketing',
    other: 'Other',
  },
  ja: {
    manual: '手動管理',
    official: '公式',
    baonly: 'baonly.cn',
    bilibili: 'Bilibili',
    x: 'X / Twitter',
    youtube: 'YouTube',
    website: 'Webサイト',
    ticketing: 'チケット',
    other: 'その他',
  },
}

export function splitEventTags(tags?: string | null) {
  return String(tags || '')
    .split(/[,，、\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 6)
}

export function getEventStatusOverrideLabel(status: EventStatusOverride | null | undefined, locale: Locale) {
  if (!status || status === 'normal') return ''
  return (statusOverrideLabels[locale] || statusOverrideLabels['zh-Hans'])[status] || status
}

export function getEventFormatLabel(format: EventFormat | null | undefined, locale: Locale) {
  if (!format) return ''
  return (formatLabels[locale] || formatLabels['zh-Hans'])[format] || format
}

export function getTicketStatusLabel(status: EventTicketStatus | null | undefined, locale: Locale) {
  if (!status || status === 'unknown') return ''
  return (ticketLabels[locale] || ticketLabels['zh-Hans'])[status] || status
}

export function getEventSourcePlatformLabel(source: EventSourcePlatform | null | undefined, locale: Locale) {
  if (!source) return ''
  return (sourceLabels[locale] || sourceLabels['zh-Hans'])[source] || source
}

export function getEventDisplayPlace(event: AnyEvent, type: 'online' | 'offline') {
  if (type === 'offline') {
    const offline = event as OfflineEvent
    return [offline.city, offline.venue].filter(Boolean).join(' / ') || offline.location || offline.address || ''
  }

  const online = event as OnlineEvent
  return [online.platform, online.region].filter(Boolean).join(' / ')
}

export function formatEventPrice(event: AnyEvent, locale: Locale) {
  if (event.ticketPriceText) return event.ticketPriceText

  const min = normalizePrice(event.priceMin)
  const max = normalizePrice(event.priceMax)
  if (min === null && max === null) {
    return getTicketStatusLabel(event.ticketStatus, locale)
  }

  const currency = event.currency?.trim() || ''
  const prefix = currency ? `${currency} ` : ''
  if (min !== null && max !== null && min !== max) return `${prefix}${formatNumber(min)} - ${formatNumber(max)}`
  return `${prefix}${formatNumber(min ?? max ?? 0)}`
}

export function getEventSourceUrl(event: AnyEvent) {
  return event.sourceUrl || event.link || ''
}

export function getEventSourceHost(event: AnyEvent) {
  const link = getEventSourceUrl(event)
  if (!link) return ''
  try {
    return new URL(link).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function normalizePrice(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}
