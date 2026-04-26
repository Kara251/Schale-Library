'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useToast } from '@/contexts/toast-context'
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
    cancel?: string
    confirmDelete?: string
    deleted?: string
    failed: string
  }
}

export function AdminRowActions({ locale, collection, id, labels }: AdminRowActionsProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [isConfirming, setIsConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!isConfirming) {
      setIsConfirming(true)
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

      showToast({ message: labels.deleted || labels.delete, variant: 'success' })
      setIsConfirming(false)
      router.refresh()
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : labels.failed, variant: 'error' })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href={`/${locale}/manage/${collection}/${id}`}>{labels.edit}</Link>
      </Button>
      {isConfirming ? (
        <span className="max-w-52 text-xs leading-5 text-destructive">{labels.confirm}</span>
      ) : null}
      <Button size="sm" variant="destructive" onClick={() => void handleDelete()} disabled={isDeleting}>
        {isDeleting ? labels.deleting : isConfirming ? labels.confirmDelete || labels.delete : labels.delete}
      </Button>
      {isConfirming ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setIsConfirming(false)}
          disabled={isDeleting}
        >
          {labels.cancel || 'Cancel'}
        </Button>
      ) : null}
    </div>
  )
}
