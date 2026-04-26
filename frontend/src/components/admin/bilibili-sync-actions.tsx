'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useToast } from '@/contexts/toast-context'

interface BilibiliSyncActionsProps {
  id?: number
  labels: {
    syncOne: string
    syncAll: string
    syncing: string
    failed: string
  }
}

export function BilibiliSyncActions({ id, labels }: BilibiliSyncActionsProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [isPending, setIsPending] = useState(false)

  const handleSync = async () => {
    setIsPending(true)

    try {
      const endpoint = id
        ? `/api/admin/bilibili-subscriptions/${id}/sync`
        : '/api/admin/bilibili-subscriptions/sync-all'

      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
      })

      const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null
      if (!response.ok) {
        throw new Error(payload?.error || labels.failed)
      }

      if (payload?.message) {
        showToast({ message: payload.message, variant: 'success' })
      }

      router.refresh()
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : labels.failed, variant: 'error' })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Button type="button" size="sm" variant="secondary" onClick={() => void handleSync()} disabled={isPending}>
      {isPending ? labels.syncing : id ? labels.syncOne : labels.syncAll}
    </Button>
  )
}
