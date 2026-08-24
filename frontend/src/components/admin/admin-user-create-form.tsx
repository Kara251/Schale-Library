'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/contexts/toast-context'
import type { Locale } from '@/lib/i18n'

const MIN_PASSWORD_LENGTH = 12

export interface AdminUserCreateLabels {
  title: string
  description: string
  username: string
  usernameHint: string
  email: string
  emailHint: string
  password: string
  passwordHint: string
  role: string
  roleMaintainer: string
  roleAdmin: string
  submit: string
  submitting: string
  created: string
  errorUsername: string
  errorTooShort: string
  errorTaken: string
  errorEmail: string
  errorDefault: string
}

interface AdminUserCreateFormProps {
  locale: Locale
  labels: AdminUserCreateLabels
}

function messageForCode(code: string, labels: AdminUserCreateLabels): string {
  switch (code) {
    case 'invalid_username':
      return labels.errorUsername
    case 'password_too_short':
      return labels.errorTooShort
    case 'username_or_email_taken':
      return labels.errorTaken
    case 'invalid_email':
      return labels.errorEmail
    default:
      return labels.errorDefault
  }
}

export function AdminUserCreateForm({ locale, labels }: AdminUserCreateFormProps) {
  const router = useRouter()
  const { showToast } = useToast()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('maintainer')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (password.length < MIN_PASSWORD_LENGTH) {
      showToast({ message: labels.errorTooShort, variant: 'error' })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), email: email.trim(), password, role }),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: unknown } | null
        const code = typeof payload?.error === 'string' ? payload.error : ''
        showToast({ message: messageForCode(code, labels), variant: 'error' })
        return
      }
      showToast({ message: labels.created, variant: 'success' })
      setUsername('')
      setEmail('')
      setPassword('')
      setRole('maintainer')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  void locale

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
        <p className="pt-2 text-sm text-muted-foreground">{labels.description}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="new-username">
                {labels.username}
              </label>
              <Input
                id="new-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">{labels.usernameHint}</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="new-email">
                {labels.email}
              </label>
              <Input
                id="new-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">{labels.emailHint}</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="new-password">
                {labels.password}
              </label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">{labels.passwordHint}</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="new-role">
                {labels.role}
              </label>
              <select
                id="new-role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                <option value="maintainer">{labels.roleMaintainer}</option>
                <option value="admin">{labels.roleAdmin}</option>
              </select>
            </div>
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? labels.submitting : labels.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
