import type { Locale } from '@/lib/i18n'
import { AdminCollectionEditorPage } from '@/components/admin/admin-collection-editor-page'

export default async function NewStudentManagePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <AdminCollectionEditorPage collection="students" locale={locale as Locale} />
}