'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useToast } from '@/contexts/toast-context'
import type { Locale } from '@/lib/i18n'

const MIN_PASSWORD_LENGTH = 12

export interface AdminUserActionLabels {
  promote: string
  demote: string
  block: string
  unblock: string
  resetPassword: string
  delete: string
  working: string
  confirmDelete: string
  promptPassword: string
  done: string
  errorLastAdmin: string
  errorSelf: string
  errorTooShort: string
  errorDefault: string
}

interface AdminUserActionsProps {
  locale: Locale
  user: { id: number; username: string; role: string; blocked: boolean }
  /** 当前登录者的 id：自身行不渲染破坏性操作，服务端另有护栏 */
  currentUserId: number
  labels: AdminUserActionLabels
}

function messageForCode(code: string, labels: AdminUserActionLabels): string {
  switch (code) {
    case 'last_admin':
      return labels.errorLastAdmin
    case 'cannot_block_self':
    case 'cannot_demote_self':
    case 'cannot_delete_self':
      return labels.errorSelf
    case 'password_too_short':
      return labels.errorTooShort
    default:
      return labels.errorDefault
  }
}

export function AdminUserActions({ locale, user, currentUserId, labels }: AdminUserActionsProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)

  const isSelf = user.id === currentUserId

  async function send(path: string, init: RequestInit): Promise<boolean> {
    setBusy(true)
    try {
      const response = await fetch(path, {
        headers: { 'Content-Type': 'application/json' },
        ...init,
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: unknown } | null
        const code = typeof payload?.error === 'string' ? payload.error : ''
        showToast({ message: messageForCode(code, labels), variant: 'error' })
        return false
      }
      showToast({ message: labels.done, variant: 'success' })
      router.refresh()
      return true
    } finally {
      setBusy(false)
    }
  }

  async function patch(body: Record<string, unknown>) {
    await send(`/api/admin/users/${user.id}`, { method: 'PUT', body: JSON.stringify(body) })
  }

  async function handleResetPassword() {
    const next = window.prompt(labels.promptPassword)
    if (next === null) return
    if (next.length < MIN_PASSWORD_LENGTH) {
      showToast({ message: labels.errorTooShort, variant: 'error' })
      return
    }
    await send(`/api/admin/users/${user.id}/password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword: next }),
    })
  }

  async function handleDelete() {
    if (!window.confirm(labels.confirmDelete.replace('{username}', user.username))) return
    await send(`/api/admin/users/${user.id}`, { method: 'DELETE' })
  }

  void locale

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 自身行不渲染角色与封禁操作：服务端会拒绝，界面上也不该给出可点的错误路径 */}
      {!isSelf && (
        <>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void patch({ role: user.role === 'admin' ? 'maintainer' : 'admin' })}
          >
            {busy ? labels.working : user.role === 'admin' ? labels.demote : labels.promote}
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void patch({ blocked: !user.blocked })}
          >
            {user.blocked ? labels.unblock : labels.block}
          </Button>
        </>
      )}

      <Button size="sm" variant="outline" disabled={busy} onClick={() => void handleResetPassword()}>
        {labels.resetPassword}
      </Button>

      {!isSelf && (
        <Button size="sm" variant="destructive" disabled={busy} onClick={() => void handleDelete()}>
          {labels.delete}
        </Button>
      )}
    </div>
  )
}
