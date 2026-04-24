import type { Locale } from '@/lib/i18n'
import { AdminCollectionEditorPage } from '@/components/admin/admin-collection-editor-page'

export default async function EditAnnouncementManagePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params
  return <AdminCollectionEditorPage collection="announcements" locale={locale as Locale} id={id} />
}