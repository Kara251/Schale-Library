'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import type { AdminCollectionKey } from '@/lib/admin-panel'

interface AdminRowActionsProps {
  locale: string
  collection: AdminCollectionKey
  id: number
  labels: {
    edit: string
    delete: string
    deleting: string
    confirm: string
    failed: string
  }
}

export function AdminRowActions({ locale, collection, id, labels }: AdminRowActionsProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!window.confirm(labels.confirm)) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/content/${collection}/${id}?locale=${encodeURIComponent(locale)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error || labels.failed)
      }

      router.refresh()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : labels.failed)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href={`/${locale}/manage/${collection}/${id}`}>{labels.edit}</Link>
      </Button>
      <Button size="sm" variant="destructive" onClick={() => void handleDelete()} disabled={isDeleting}>
        {isDeleting ? labels.deleting : labels.delete}
      </Button>
    </div>
  )
}
