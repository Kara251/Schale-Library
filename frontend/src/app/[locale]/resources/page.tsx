import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import type { Locale } from "@/lib/i18n"

interface ResourcesPageProps {
    params: Promise<{ locale: string }>
}

// OpenList 配置
const OPENLIST_URL = process.env.NEXT_PUBLIC_OPENLIST_URL || "http://localhost:5244"
const OPENLIST_BASE_PATH = "/"

const titles: Record<Locale, { title: string; description: string }> = {
    'zh-Hans': { title: '资源整理', description: '浏览和下载蔚蓝档案相关资源' },
    'en': { title: 'Resources', description: 'Browse and download Blue Archive related resources' },
    'ja': { title: 'リソース', description: 'ブルーアーカイブ関連リソースを閲覧・ダウンロード' },
}

export default async function ResourcesPage({ params }: ResourcesPageProps) {
    const { locale } = await params
    const t = titles[locale as Locale] || titles['zh-Hans']

    // 构建嵌入 URL
    const embedUrl = `${OPENLIST_URL}${OPENLIST_BASE_PATH}`

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
                <div className="content-panel h-full flex flex-col">
                    {/* 页面标题 */}
                    <div className="mb-4">
                        <h1 className="text-4xl font-bold mb-2">{t.title}</h1>
                        <p className="text-muted-foreground">{t.description}</p>
                    </div>

                    {/* OpenList 嵌入区域 */}
                    <div className="flex-1 min-h-[600px] rounded-lg overflow-hidden border">
                        <iframe
                            src={embedUrl}
                            className="w-full h-full min-h-[600px]"
                            style={{ height: 'calc(100vh - 280px)' }}
                            title={t.title}
                            allow="fullscreen"
                            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
                        />
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
