'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/contexts/toast-context'
import { adminErrorMessage } from '@/lib/admin-panel/error-message'
import type { CuratorAdminData } from '@/lib/server/admin-content'
import type { Locale } from '@/lib/i18n'

interface EntryOption {
  id: string
  title: string
}

interface ResearchCuratorFormProps {
  initialData: CuratorAdminData | null
  entries: EntryOption[]
  locale: Locale
}

const labels: Record<Locale, {
  title: string
  description: string
  featuredEntry: string
  featuredEntryHint: string
  noEntry: string
  pickNote: string
  pathDescription: string
  pathStepsNote: string
  save: string
  saving: string
  cancel: string
  saveSuccess: string
  saveFailed: string
}> = {
  'zh-Hans': {
    title: '考据策展配置',
    description: '配置侧边栏"主编精选"与"推荐阅读路径"的文字说明。',
    featuredEntry: '主编精选条目',
    featuredEntryHint: '将在侧边栏"主编精选"区域展示',
    noEntry: '（不选择）',
    pickNote: '推荐语',
    pathDescription: '推荐路径说明',
    pathStepsNote: '本页只设置说明文字。路径步骤请在「阅读路径」中逐条编辑。',
    save: '保存',
    saving: '保存中...',
    cancel: '返回',
    saveSuccess: '保存成功',
    saveFailed: '保存失败',
  },
  en: {
    title: 'Research Curation Settings',
    description: 'Configure the sidebar "Featured" pick and "Recommended Path" description.',
    featuredEntry: 'Featured entry',
    featuredEntryHint: 'Shown in the sidebar "Editor\'s Pick" section',
    noEntry: '(None)',
    pickNote: 'Pick note',
    pathDescription: 'Path description',
    pathStepsNote: 'This page only sets the description text. Edit path steps under Reading paths.',
    save: 'Save',
    saving: 'Saving...',
    cancel: 'Back',
    saveSuccess: 'Saved successfully',
    saveFailed: 'Save failed',
  },
  ja: {
    title: '考察キュレーション設定',
    description: 'サイドバーの「おすすめ」とパス説明を設定します。',
    featuredEntry: 'おすすめ記事',
    featuredEntryHint: 'サイドバーの「編集部のおすすめ」に表示されます',
    noEntry: '（なし）',
    pickNote: 'おすすめコメント',
    pathDescription: 'パス説明',
    pathStepsNote: 'このページでは説明文のみ設定します。ステップは「読み順」で編集してください。',
    save: '保存',
    saving: '保存中...',
    cancel: '戻る',
    saveSuccess: '保存しました',
    saveFailed: '保存に失敗しました',
  },
}
export function ResearchCuratorForm({ initialData, entries, locale }: ResearchCuratorFormProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const t = labels[locale] || labels['zh-Hans']

  const [featuredEntry, setFeaturedEntry] = useState<string>(
    String(initialData?.featured_entry?.id ?? '')
  )
  const [pickNote, setPickNote] = useState(initialData?.pick_note ?? '')
  const [pathDescription, setPathDescription] = useState(initialData?.path_description ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSaving(true)

    try {
      const data: Record<string, unknown> = {
        pick_note: pickNote,
        path_description: pathDescription,
        featured_entry: featuredEntry ? Number(featuredEntry) : null,
      }

      const response = await fetch(`/api/admin/curator?locale=${encodeURIComponent(locale)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ data, locale }),
      })

      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) throw new Error(adminErrorMessage(payload?.error, locale))

      showToast({ message: t.saveSuccess, variant: 'success' })
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : t.saveFailed
      setError(message)
      showToast({ message, variant: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-bold">{t.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {/* 主编精选条目 */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium" htmlFor="featured_entry">
              {t.featuredEntry}
            </label>
            <select
              id="featured_entry"
              value={featuredEntry}
              onChange={(e) => setFeaturedEntry(e.target.value)}
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              <option value="">{t.noEntry}</option>
              {entries.map((entry) => (
                <option key={entry.id} value={String(entry.id)}>
                  {entry.title}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{t.featuredEntryHint}</p>
          </div>

          {/* 推荐语 */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium" htmlFor="pick_note">
              {t.pickNote}
            </label>
            <textarea
              id="pick_note"
              value={pickNote}
              onChange={(e) => setPickNote(e.target.value)}
              className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            />
          </div>

          {/* 推荐路径说明 */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium" htmlFor="path_description">
              {t.pathDescription}
            </label>
            <textarea
              id="path_description"
              value={pathDescription}
              onChange={(e) => setPathDescription(e.target.value)}
              className="min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            />
          </div>

          {/* path_steps 说明 */}
          <div className="md:col-span-2 rounded-md border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            <p>{t.pathStepsNote}</p>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? t.saving : t.save}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {t.cancel}
        </Button>
      </div>
    </form>
  )
}
