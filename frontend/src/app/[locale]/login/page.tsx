'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from '@/contexts/auth-context'
import { useLocale } from '@/contexts/locale-context'
import { useLocalePath } from '@/components/locale-link'
import { login, setAuthToken } from '@/lib/auth'
import { Loader2, AlertCircle } from 'lucide-react'
import type { Locale } from '@/lib/i18n'

const content: Record<Locale, {
    title: string
    description: string
    emailLabel: string
    passwordLabel: string
    loginButton: string
    loggingIn: string
    noRegister: string
    errorDefault: string
}> = {
    'zh-Hans': {
        title: '登录',
        description: '登录到夏莱图书馆',
        emailLabel: '邮箱或用户名',
        passwordLabel: '密码',
        loginButton: '登录',
        loggingIn: '登录中...',
        noRegister: '暂不开放注册，如需账号请联系管理员',
        errorDefault: '登录失败，请检查邮箱和密码',
    },
    'en': {
        title: 'Login',
        description: 'Sign in to Schale Library',
        emailLabel: 'Email or username',
        passwordLabel: 'Password',
        loginButton: 'Login',
        loggingIn: 'Signing in...',
        noRegister: 'Registration is not open. Contact admin for an account.',
        errorDefault: 'Login failed. Please check your email and password.',
    },
    'ja': {
        title: 'ログイン',
        description: 'シャーレ図書館にログイン',
        emailLabel: 'メールまたはユーザー名',
        passwordLabel: 'パスワード',
        loginButton: 'ログイン',
        loggingIn: 'ログイン中...',
        noRegister: '新規登録は現在受け付けていません。アカウントが必要な場合は管理者にお問い合わせください。',
        errorDefault: 'ログインに失敗しました。メールアドレスとパスワードを確認してください。',
    },
}

export default function LoginPage() {
    const router = useRouter()
    const { setUser } = useAuth()
    const { locale } = useLocale()
    const getLocalePath = useLocalePath()
    const t = content[locale] || content['zh-Hans']

    const [identifier, setIdentifier] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            const response = await login({ identifier, password })
            setAuthToken(response.jwt)
            setUser(response.user)
            router.push(getLocalePath('/'))
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : t.errorDefault)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
                <div className="content-panel flex items-center justify-center min-h-[60vh]">
                    <div className="w-full max-w-md">
                        {/* 标题区域 */}
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold mb-2">{t.title}</h1>
                            <p className="text-muted-foreground">{t.description}</p>
                        </div>

                        {/* 登录表单 */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label htmlFor="identifier" className="text-sm font-medium">
                                    {t.emailLabel}
                                </label>
                                <Input
                                    id="identifier"
                                    type="text"
                                    placeholder="your@email.com"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="bg-background"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="password" className="text-sm font-medium">
                                    {t.passwordLabel}
                                </label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="bg-background"
                                />
                            </div>

                            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t.loggingIn}
                                    </>
                                ) : (
                                    t.loginButton
                                )}
                            </Button>
                        </form>

                        {/* 注册提示 */}
                        <div className="mt-8 text-center">
                            <p className="text-sm text-muted-foreground">{t.noRegister}</p>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
