import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, Github, Video } from "lucide-react"
import type { Locale } from "@/lib/i18n"

interface ContactPageProps {
    params: Promise<{ locale: string }>
}

const content: Record<Locale, {
    title: string
    subtitle: string
    intro: string
    emailTitle: string
    emailDesc: string
    githubTitle: string
    githubDesc: string
    socialTitle: string
    socialDesc: string
    bilibili: string
    youtube: string
}> = {
    'zh-Hans': {
        title: '联系图书馆',
        subtitle: '或者参与建设图书馆',
        intro: '如果您有任何问题、建议或反馈，欢迎通过以下方式与我们联系。',
        emailTitle: '电子邮件',
        emailDesc: '联系图书馆馆长',
        githubTitle: 'GitHub',
        githubDesc: '在 GitHub 上提交 Issue 或 Pull Request',
        socialTitle: '社交媒体',
        socialDesc: '不是本站附属账号',
        bilibili: 'Bilibili',
        youtube: 'YouTube',
    },
    'en': {
        title: 'Contact the Library',
        subtitle: 'Or help build the library',
        intro: 'If you have any questions, suggestions, or feedback, feel free to contact us through the following channels.',
        emailTitle: 'Email',
        emailDesc: 'Contact the library director',
        githubTitle: 'GitHub',
        githubDesc: 'Submit an Issue or Pull Request on GitHub',
        socialTitle: 'Social Media',
        socialDesc: 'Not affiliated with this site',
        bilibili: 'Bilibili',
        youtube: 'YouTube',
    },
    'ja': {
        title: '図書館へのお問い合わせ',
        subtitle: 'または図書館の構築に参加',
        intro: 'ご質問、ご提案、フィードバックがございましたら、以下の方法でお問い合わせください。',
        emailTitle: 'メール',
        emailDesc: '図書館館長に連絡',
        githubTitle: 'GitHub',
        githubDesc: 'GitHubでIssueまたはPull Requestを提出',
        socialTitle: 'ソーシャルメディア',
        socialDesc: '本サイトの公式アカウントではありません',
        bilibili: 'Bilibili',
        youtube: 'YouTube',
    },
}

export default async function ContactPage({ params }: ContactPageProps) {
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

                        <p className="text-muted-foreground mb-8">{t.intro}</p>

                        <div className="space-y-6">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4">
                                        <Mail className="h-6 w-6 text-primary mt-1" />
                                        <div>
                                            <h2 className="text-xl font-bold mb-2">{t.emailTitle}</h2>
                                            <p className="text-muted-foreground mb-2">{t.emailDesc}</p>
                                            <a href="mailto:kara@bakivo.com" className="text-primary hover:underline">
                                                kara@bakivo.com
                                            </a>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4">
                                        <Github className="h-6 w-6 text-primary mt-1" />
                                        <div>
                                            <h2 className="text-xl font-bold mb-2">{t.githubTitle}</h2>
                                            <p className="text-muted-foreground mb-2">{t.githubDesc}</p>
                                            <a
                                                href="https://github.com/Kara251/Schale-Library"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline"
                                            >
                                                github.com/Kara251/Schale-Library
                                            </a>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4">
                                        <Video className="h-6 w-6 text-primary mt-1" />
                                        <div>
                                            <h2 className="text-xl font-bold mb-2">{t.socialTitle}</h2>
                                            <p className="text-muted-foreground mb-4">{t.socialDesc}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{t.bilibili}:</span>
                                                <a
                                                    href="https://space.bilibili.com/6652330"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline"
                                                >
                                                    @Kara251
                                                </a>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{t.youtube}:</span>
                                                <a
                                                    href="https://www.youtube.com/@Karakara251"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline"
                                                >
                                                    @Karakara251
                                                </a>
                                            </div>
                                        </div>
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
