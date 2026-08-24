'use client'

import { useCallback, useState } from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/i18n'

/**
 * 发布状态三态控件。
 *
 * 取代原先的「启用」+「立即发布」两个复选框 —— 它们是两个独立开关，
 * 内容要出现在站点上必须两个都勾，只勾一个会静默不显示，界面上毫无提示。
 * 现在只有一个控件，底层的 is_active 由服务端跟随写入。
 *
 * 表单值即提交给后端的 publishedAt：
 * - false        → 草稿
 * - true         → 立即发布
 * - ISO 时间字符串 → 定时发布（到点前公开 API 不返回）
 */

export type PublishStateValue = boolean | string

interface AdminPublishStateFieldProps {
  value: unknown
  onChange: (next: PublishStateValue) => void
  locale: Locale
}

const labels: Record<Locale, {
  draft: string
  draftHint: string
  now: string
  nowHint: string
  scheduled: string
  scheduledHint: string
  time: string
  timeInvalid: string
}> = {
  'zh-Hans': {
    draft: '草稿',
    draftHint: '仅自己可见，不出现在站点上',
    now: '立即发布',
    nowHint: '保存后立刻对所有访客可见',
    scheduled: '定时发布',
    scheduledHint: '到点前不出现在站点上，到点后自动显示，无需再操作',
    time: '发布时间',
    timeInvalid: '请选择一个将来的时间',
  },
  en: {
    draft: 'Draft',
    draftHint: 'Visible only to you; not shown on the site',
    now: 'Publish now',
    nowHint: 'Visible to everyone as soon as you save',
    scheduled: 'Schedule',
    scheduledHint: 'Hidden until the time you pick, then appears automatically',
    time: 'Publish at',
    timeInvalid: 'Pick a time in the future',
  },
  ja: {
    draft: '下書き',
    draftHint: '自分だけが閲覧可能。サイトには表示されません',
    now: '今すぐ公開',
    nowHint: '保存すると同時に全員に公開されます',
    scheduled: '予約公開',
    scheduledHint: '指定時刻まで非表示。時刻になると自動的に公開されます',
    time: '公開日時',
    timeInvalid: '未来の時刻を選択してください',
  },
}

type Mode = 'draft' | 'now' | 'scheduled'

/** 表单值 → 三态。ISO 字符串一律视为定时（含过去时间：那是已发布的既有内容）。 */
function modeOf(value: unknown): Mode {
  if (typeof value === 'string' && value) return 'scheduled'
  return value ? 'now' : 'draft'
}

/** datetime-local 需要本地时区的 `YYYY-MM-DDTHH:mm`，不能直接用 toISOString。 */
function toDateTimeLocal(value: unknown): string {
  if (typeof value !== 'string' || !value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offsetMs = date.getTime() - date.getTimezoneOffset() * 60 * 1000
  return new Date(offsetMs).toISOString().slice(0, 16)
}

export function AdminPublishStateField({ value, onChange, locale }: AdminPublishStateFieldProps) {
  const t = labels[locale] || labels['zh-Hans']
  const mode = modeOf(value)

  // 「所选时间已过」在用户改动时判定并记住。
  // 渲染期读时钟会让服务端与客户端渲染结果不一致（hydration 不匹配）。
  const [pastWarning, setPastWarning] = useState(false)

  const options: Array<{ mode: Mode; label: string; hint: string }> = [
    { mode: 'draft', label: t.draft, hint: t.draftHint },
    { mode: 'now', label: t.now, hint: t.nowHint },
    { mode: 'scheduled', label: t.scheduled, hint: t.scheduledHint },
  ]

  const selectMode = useCallback(
    (next: Mode) => {
      if (next === 'draft') return onChange(false)
      if (next === 'now') return onChange(true)
      // 切到定时：默认给一小时后，避免出现「选了定时却是过去时间」
      onChange(new Date(Date.now() + 60 * 60 * 1000).toISOString())
      setPastWarning(false)
    },
    [onChange]
  )

  const scheduledAt = toDateTimeLocal(value)

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((option) => (
          <button
            key={option.mode}
            type="button"
            onClick={() => selectMode(option.mode)}
            aria-pressed={mode === option.mode}
            className={cn(
              'rounded-md border px-3 py-2 text-left text-sm transition-colors',
              mode === option.mode
                ? 'border-primary bg-primary/10 text-foreground'
                : 'hover:bg-secondary text-muted-foreground'
            )}
          >
            <span className="block font-medium">{option.label}</span>
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {options.find((option) => option.mode === mode)?.hint}
      </p>

      {mode === 'scheduled' ? (
        <div className="space-y-1">
          <label className="text-xs font-medium" htmlFor="publish-at">
            {t.time}
          </label>
          <Input
            id="publish-at"
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => {
              const next = event.target.value
              if (!next) return
              setPastWarning(new Date(next).getTime() <= Date.now())
              onChange(new Date(next).toISOString())
            }}
          />
          {pastWarning ? <p className="text-xs text-destructive">{t.timeInvalid}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
