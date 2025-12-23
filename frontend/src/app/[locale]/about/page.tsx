import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import type { Locale } from "@/lib/i18n"

interface AboutPageProps {
    params: Promise<{ locale: string }>
}

const content: Record<Locale, {
    title: string
    subtitle: string
    projectTitle: string
    projectDesc1: string
    projectDesc2: string
    copyrightTitle: string
    codeNote: string
    assetNote: string
    guidelinesNote: string
    nonprofitNote: string
    fontNote: string
    fontLinkText: string
    fontLinkUrl: string
}> = {
    'zh-Hans': {
        title: '关于图书馆',
        subtitle: 'Schale Library',
        projectTitle: '项目简介',
        projectDesc1: '夏莱图书馆是一个专注于收集《蔚蓝档案》内容，以及游戏外的各种作品、活动等的资料系统。',
        projectDesc2: '我们致力于为广大老师们提供最全面的资源与资讯，打造一个开放、共享的《蔚蓝档案》资源中心。',
        copyrightTitle: '版权声明',
        codeNote: '代码版权：本项目源代码遵循 MIT License 开源协议。',
        assetNote: '素材版权：本项目中使用的所有游戏原始或官方衍生素材的知识产权均归属于 Nexon Games、Yostar 及相关版权方所有。',
        guidelinesNote: '本项目尊重官方二次创作指引。',
        nonprofitNote: '非盈利声明：本项目为粉丝自制的非盈利性二创项目，不用于任何商业用途。',
        fontNote: '字体声明：本站使用 BlueakaBeta2GBK 字体（中英文），日文使用 Noto Sans JP。',
        fontLinkText: '字体来源：基沃托斯古书馆',
        fontLinkUrl: 'https://kivo.wiki',
    },
    'en': {
        title: 'About the Library',
        subtitle: 'Schale Library',
        projectTitle: 'About the Project',
        projectDesc1: 'Schale Library is a resource center dedicated to collecting Blue Archive content, including fan works, events, and various materials beyond the game.',
        projectDesc2: 'We aim to provide the most comprehensive resources and information for fellow Senseis, creating an open and shared Blue Archive resource center.',
        copyrightTitle: 'Copyright Notice',
        codeNote: 'Code License: The source code is licensed under MIT License.',
        assetNote: 'Asset Copyright: All game assets and official derivative materials belong to Nexon Games, Yostar, and respective copyright holders.',
        guidelinesNote: 'This project respects official fan creation guidelines.',
        nonprofitNote: 'Non-profit: This is a fan-made, non-commercial project and is not used for any commercial purposes.',
        fontNote: 'Font: BlueakaBeta2GBK (Chinese/English) and Noto Sans JP (Japanese).',
        fontLinkText: 'Font source: Kivotos Archive',
        fontLinkUrl: 'https://kivo.wiki',
    },
    'ja': {
        title: '図書館について',
        subtitle: 'シャーレ図書館',
        projectTitle: 'プロジェクト概要',
        projectDesc1: 'シャーレ図書館は、「ブルーアーカイブ」のコンテンツ、およびゲーム外の様々な作品やイベントなどを収集する資料システムです。',
        projectDesc2: '先生たちに最も包括的なリソースと情報を提供し、オープンで共有可能な「ブルーアーカイブ」リソースセンターを目指しています。',
        copyrightTitle: '著作権表示',
        codeNote: 'コードライセンス：ソースコードはMITライセンスの下で公開されています。',
        assetNote: '素材の著作権：本プロジェクトで使用されるすべてのゲーム素材および公式派生素材の知的財産権はNexon Games、Yostar、および関連する著作権者に帰属します。',
        guidelinesNote: '本プロジェクトは公式の二次創作ガイドラインを尊重しています。',
        nonprofitNote: '非営利宣言：本プロジェクトはファンメイドの非営利二次創作であり、商業目的では使用されません。',
        fontNote: 'フォント：BlueakaBeta2GBK（中国語/英語）と Noto Sans JP（日本語）を使用しています。',
        fontLinkText: 'フォント提供：キヴォトス古書館',
        fontLinkUrl: 'https://kivo.wiki',
    },
}

export default async function AboutPage({ params }: AboutPageProps) {
    const { locale } = await params
    const t = content[locale as Locale] || content['zh-Hans']

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
                <div className="content-panel">
                    <div className="max-w-3xl mx-auto">
                        <div className="mb-8">
                            <h1 className="text-4xl font-bold mb-2">{t.title}</h1>
                            <p className="text-muted-foreground">{t.subtitle}</p>
                        </div>

                        <div className="space-y-6">
                            <Card>
                                <CardContent className="pt-6">
                                    <h2 className="text-2xl font-semibold mb-4">{t.projectTitle}</h2>
                                    <p className="text-muted-foreground leading-relaxed mb-4">{t.projectDesc1}</p>
                                    <p className="text-muted-foreground leading-relaxed">{t.projectDesc2}</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <h2 className="text-2xl font-semibold mb-4">{t.copyrightTitle}</h2>
                                    <div className="space-y-4 text-muted-foreground">
                                        <p>{t.codeNote}</p>
                                        <p>{t.assetNote}</p>
                                        <p>{t.guidelinesNote}</p>
                                        <p>{t.nonprofitNote}</p>
                                        <p>
                                            {t.fontNote}{' '}
                                            <a href={t.fontLinkUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                                {t.fontLinkText}
                                            </a>
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
