import type {
  EventStatusOverride,
  EventTicketStatus,
  OfflineEvent,
  OnlineEvent,
} from '@/lib/api'
import type { Locale } from '@/lib/i18n'
import { normalizeEventLocationName } from '@/lib/utils/event-location'

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

export function getTicketStatusLabel(status: EventTicketStatus | null | undefined, locale: Locale) {
  if (!status || status === 'unknown') return ''
  return (ticketLabels[locale] || ticketLabels['zh-Hans'])[status] || status
}

export function getEventDisplayPlace(event: AnyEvent, type: 'online' | 'offline') {
  if (type === 'offline') {
    const offline = event as OfflineEvent
    const area = [offline.country, offline.region, offline.city, offline.district]
      .map((value) => normalizeEventLocationName(value))
      .filter(Boolean)
      .join(' / ')
    return [area, offline.venue].filter(Boolean).join(' · ') || offline.location || offline.address || ''
  }

  const online = event as OnlineEvent
  return [online.country, online.region]
    .map((value) => normalizeEventLocationName(value))
    .filter(Boolean)
    .join(' / ')
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
