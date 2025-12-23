import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

const locales = ['zh-Hans', 'en', 'ja'] as const
type Locale = (typeof locales)[number]
const defaultLocale: Locale = 'zh-Hans'

export default async function RootPage() {
    const cookieStore = await cookies()
    const savedLocale = cookieStore.get('NEXT_LOCALE')?.value as Locale | undefined
    const locale = savedLocale && locales.includes(savedLocale) ? savedLocale : defaultLocale
    redirect(`/${locale}`)
}
