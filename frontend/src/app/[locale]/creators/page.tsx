import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { CreatorCard } from '@/components/creator-card'
import { getCreators, type Creator } from '@/lib/api'
import type { Locale } from '@/lib/i18n'

export const revalidate = 60

interface CreatorsPageProps {
  params: Promise<{ locale: string }>
}

const dict: Record<Locale, { title: string; description: string; empty: string }> = {
  'zh-Hans': {
    title: '创作者',
    description: '蔚蓝档案同人创作者名录：考据、攻略与二创作品作者。',
    empty: '暂无创作者内容',
  },
  'en': {
    title: 'Creators',
    description: 'A directory of Blue Archive fan creators: researchers, guide writers and fan artists.',
    empty: 'No creators yet',
  },
  'ja': {
    title: 'クリエイター',
    description: 'ブルーアーカイブのファンクリエイター一覧：考察・攻略・二次創作の作者たち。',
    empty: 'クリエイターはまだいません',
  },
}

export async function generateMetadata({ params }: CreatorsPageProps) {
  const { locale } = await params
  const t = dict[locale as Locale] || dict['zh-Hans']
  return {
    title: `${t.title} – Schale Library`,
    description: t.description,
  }
}

export default async function CreatorsPage({ params }: CreatorsPageProps) {
  const { locale } = await params
  const t = dict[locale as Locale] || dict['zh-Hans']

  const creatorsRes = await getCreators(locale).catch(() => ({ data: [] as Creator[] }))
  const creators = creatorsRes.data || []

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
        <div className="content-panel">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">{t.title}</h1>
            <p className="text-muted-foreground">{t.description}</p>
          </div>

          {creators.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">{t.empty}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {creators.map((creator) => (
                <CreatorCard key={creator.documentId || creator.id} creator={creator} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
