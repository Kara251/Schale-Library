import { BookOpen, Search } from 'lucide-react'

import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import type { Locale } from '@/lib/i18n'

interface ResearchArchivesPageProps {
  params: Promise<{ locale: string }>
}

const content: Record<Locale, {
  title: string
  description: string
  status: string
  body: string
  scopeTitle: string
  scopeBody: string
}> = {
  'zh-Hans': {
    title: '考据档案',
    description: '面向 Blue Archive 相关考据工作的资料页。',
    status: '建设中',
    body: '这里将用于整理设定出处、现实原型、文本细节与相关资料。筛选器和文章模板仍在规划中，当前先保留为入口占位。',
    scopeTitle: '预期内容',
    scopeBody: '后续会优先服务考据文章、资料索引和引用来源，而不是与 Wiki 类站点重复建设完整百科。',
  },
  en: {
    title: 'Research Archives',
    description: 'A reference area for Blue Archive research notes.',
    status: 'In preparation',
    body: 'This page will collect source references, real-world inspirations, text details, and related research material. Filters and article templates are still being planned, so this page is currently a placeholder entry.',
    scopeTitle: 'Planned scope',
    scopeBody: 'The section will focus on research essays, source indexes, and citations rather than duplicating full wiki-style encyclopedic coverage.',
  },
  ja: {
    title: '考察アーカイブ',
    description: 'ブルーアーカイブ関連の考察作業向け資料ページです。',
    status: '準備中',
    body: '設定の出典、現実のモチーフ、テキストの細部、関連資料を整理する予定です。フィルターと記事テンプレートはまだ設計中のため、現在は入口のプレースホルダーです。',
    scopeTitle: '想定範囲',
    scopeBody: '今後は考察記事、資料索引、引用元の整理を優先し、Wiki 型サイトと重なる百科的な網羅は目指しません。',
  },
}

export default async function ResearchArchivesPage({ params }: ResearchArchivesPageProps) {
  const { locale } = await params
  const t = content[locale as Locale] || content['zh-Hans']

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
        <div className="content-panel">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">{t.title}</h1>
            <p className="text-muted-foreground">{t.description}</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-lg border bg-card p-6">
              <div className="mb-4 inline-flex items-center gap-2 rounded bg-secondary px-3 py-1 text-sm font-medium text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                {t.status}
              </div>
              <p className="text-sm leading-7 text-muted-foreground">{t.body}</p>
            </section>

            <aside className="rounded-lg border bg-card p-6">
              <div className="mb-3 flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold">{t.scopeTitle}</h2>
              </div>
              <p className="text-sm leading-7 text-muted-foreground">{t.scopeBody}</p>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
