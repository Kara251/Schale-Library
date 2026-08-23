import { AdminCollectionEditorPage } from '@/components/admin/admin-collection-editor-page'
import type { Locale } from '@/lib/i18n'

export default async function NewCreatorManagePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <AdminCollectionEditorPage collection="creators" locale={locale as Locale} />
}
