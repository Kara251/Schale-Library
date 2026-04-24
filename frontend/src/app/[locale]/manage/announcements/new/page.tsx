import type { Locale } from '@/lib/i18n'
import { AdminCollectionEditorPage } from '@/components/admin/admin-collection-editor-page'

export default async function NewAnnouncementManagePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <AdminCollectionEditorPage collection="announcements" locale={locale as Locale} />
}