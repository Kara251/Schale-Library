import type { Locale } from '@/lib/i18n'

export interface AdminCollectionLabels {
  title: Record<Locale, string>
  description: Record<Locale, string>
  createLabel: Record<Locale, string>
  editLabel: Record<Locale, string>
}
