'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/contexts/toast-context'
import type { Locale } from '@/lib/i18n'

/** 与后端 MIN_PASSWORD_LENGTH 保持一致；前端先挡一道，服务端仍会强制。 */
const MIN_PASSWORD_LENGTH = 12

interface AdminProfileFormProps {
  locale: Locale
  user: {
    username: string
    email: string | null
    role: string
  }
}

const labels: Record<Locale, {
  accountTitle: string
  accountDescription: string
  username: string
  usernameHint: string
  role: string
  email: string
  emailPlaceholder: string
  saveProfile: string
  saving: string
  profileSaved: string
  passwordTitle: string
  passwordDescription: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
  passwordHint: string
  savePassword: string
  passwordSaved: string
  errorMismatch: string
  errorTooShort: string
  errorWrongPassword: string
  errorSame: string
  errorEmail: string
  errorEmailTaken: string
  errorRateLimited: string
  errorDefault: string
}> = {
  'zh-Hans': {
    accountTitle: '账号资料',
    accountDescription: '维护你自己的账号信息。用户名与角色不可自助修改。',
    username: '用户名',
    usernameHint: '用户名创建后不可更改',
    role: '角色',
    email: '邮箱',
    emailPlaceholder: '留空表示不设置邮箱',
    saveProfile: '保存资料',
    saving: '保存中…',
    profileSaved: '资料已更新',
    passwordTitle: '修改密码',
    passwordDescription: '修改密码后，你在其他设备上的登录会被登出，当前设备保持登录。',
    currentPassword: '当前密码',
    newPassword: '新密码',
    confirmPassword: '确认新密码',
    passwordHint: `至少 ${MIN_PASSWORD_LENGTH} 位`,
    savePassword: '修改密码',
    passwordSaved: '密码已修改',
    errorMismatch: '两次输入的新密码不一致',
    errorTooShort: `新密码至少需要 ${MIN_PASSWORD_LENGTH} 位`,
    errorWrongPassword: '当前密码不正确',
    errorSame: '新密码不能与当前密码相同',
    errorEmail: '邮箱格式不正确',
    errorEmailTaken: '该邮箱已被其他账号使用',
    errorRateLimited: '尝试过于频繁，请稍后再试',
    errorDefault: '操作失败，请稍后重试',
  },
  en: {
    accountTitle: 'Account',
    accountDescription: 'Manage your own account details. Username and role cannot be changed here.',
    username: 'Username',
    usernameHint: 'Username cannot be changed after creation',
    role: 'Role',
    email: 'Email',
    emailPlaceholder: 'Leave empty for no email',
    saveProfile: 'Save',
    saving: 'Saving…',
    profileSaved: 'Profile updated',
    passwordTitle: 'Change password',
    passwordDescription: 'Changing your password signs you out on other devices. This device stays signed in.',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    passwordHint: `At least ${MIN_PASSWORD_LENGTH} characters`,
    savePassword: 'Change password',
    passwordSaved: 'Password changed',
    errorMismatch: 'The two new passwords do not match',
    errorTooShort: `New password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    errorWrongPassword: 'Current password is incorrect',
    errorSame: 'New password must differ from the current one',
    errorEmail: 'Invalid email format',
    errorEmailTaken: 'That email is already used by another account',
    errorRateLimited: 'Too many attempts, please try again later',
    errorDefault: 'Something went wrong, please try again',
  },
  ja: {
    accountTitle: 'アカウント',
    accountDescription: '自分のアカウント情報を管理します。ユーザー名とロールはここでは変更できません。',
    username: 'ユーザー名',
    usernameHint: 'ユーザー名は作成後に変更できません',
    role: 'ロール',
    email: 'メールアドレス',
    emailPlaceholder: '空欄の場合は未設定',
    saveProfile: '保存',
    saving: '保存中…',
    profileSaved: 'プロフィールを更新しました',
    passwordTitle: 'パスワード変更',
    passwordDescription: 'パスワードを変更すると他の端末のログインは解除されます。この端末はログインしたままです。',
    currentPassword: '現在のパスワード',
    newPassword: '新しいパスワード',
    confirmPassword: '新しいパスワード（確認）',
    passwordHint: `${MIN_PASSWORD_LENGTH} 文字以上`,
    savePassword: 'パスワードを変更',
    passwordSaved: 'パスワードを変更しました',
    errorMismatch: '新しいパスワードが一致しません',
    errorTooShort: `新しいパスワードは ${MIN_PASSWORD_LENGTH} 文字以上必要です`,
    errorWrongPassword: '現在のパスワードが正しくありません',
    errorSame: '新しいパスワードは現在のものと異なる必要があります',
    errorEmail: 'メールアドレスの形式が正しくありません',
    errorEmailTaken: 'このメールアドレスは既に使用されています',
    errorRateLimited: '試行が多すぎます。しばらくしてからお試しください',
    errorDefault: '処理に失敗しました。もう一度お試しください',
  },
}

/** 后端错误码 → 可读文案；未知错误码回落到通用提示。 */
function messageForCode(code: string, t: (typeof labels)['zh-Hans']): string {
  switch (code) {
    case 'invalid_credentials':
      return t.errorWrongPassword
    case 'password_too_short':
      return t.errorTooShort
    case 'password_unchanged':
      return t.errorSame
    case 'invalid_email':
      return t.errorEmail
    case 'email_taken':
      return t.errorEmailTaken
    case 'rate_limited':
      return t.errorRateLimited
    default:
      return t.errorDefault
  }
}

async function readErrorCode(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as { error?: unknown } | null
  return typeof payload?.error === 'string' ? payload.error : ''
}

export function AdminProfileForm({ locale, user }: AdminProfileFormProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const t = labels[locale] || labels['zh-Hans']

  const [email, setEmail] = useState(user.email ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  async function handleProfileSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSavingProfile(true)
    try {
      const response = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!response.ok) {
        showToast({ message: messageForCode(await readErrorCode(response), t), variant: 'error' })
        return
      }
      showToast({ message: t.profileSaved, variant: 'success' })
      router.refresh()
    } finally {
      setSavingProfile(false)
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault()

    // 先在本地挡掉两类明显错误，省一次往返
    if (newPassword !== confirmPassword) {
      showToast({ message: t.errorMismatch, variant: 'error' })
      return
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      showToast({ message: t.errorTooShort, variant: 'error' })
      return
    }

    setSavingPassword(true)
    try {
      const response = await fetch('/api/admin/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (!response.ok) {
        showToast({ message: messageForCode(await readErrorCode(response), t), variant: 'error' })
        return
      }
      showToast({ message: t.passwordSaved, variant: 'success' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.accountTitle}</CardTitle>
          <p className="pt-2 text-sm text-muted-foreground">{t.accountDescription}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">{t.username}</label>
                <Input value={user.username} disabled readOnly />
                <p className="mt-1 text-xs text-muted-foreground">{t.usernameHint}</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t.role}</label>
                <Input value={user.role} disabled readOnly />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="profile-email">
                {t.email}
              </label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t.emailPlaceholder}
              />
            </div>

            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? t.saving : t.saveProfile}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.passwordTitle}</CardTitle>
          <p className="pt-2 text-sm text-muted-foreground">{t.passwordDescription}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="current-password">
                {t.currentPassword}
              </label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="new-password">
                  {t.newPassword}
                </label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-muted-foreground">{t.passwordHint}</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="confirm-password">
                  {t.confirmPassword}
                </label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={savingPassword}>
              {savingPassword ? t.saving : t.savePassword}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
