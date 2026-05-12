import { AdminCollectionEditorPage } from '@/components/admin/admin-collection-editor-page'
import type { Locale } from '@/lib/i18n'

export default async function EditFriendLinkManagePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params
  return <AdminCollectionEditorPage collection="friend-links" locale={locale as Locale} id={id} />
}
