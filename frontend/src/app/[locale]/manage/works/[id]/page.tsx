import type { Locale } from '@/lib/i18n'
import { AdminCollectionEditorPage } from '@/components/admin/admin-collection-editor-page'

export default async function EditWorkManagePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params
  return <AdminCollectionEditorPage collection="works" locale={locale as Locale} id={id} />
}