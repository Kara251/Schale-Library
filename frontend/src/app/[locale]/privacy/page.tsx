import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import type { Locale } from "@/lib/i18n"

interface PrivacyPageProps {
    params: Promise<{ locale: string }>
}

const content: Record<Locale, {
    title: string
    subtitle: string
    intro: string
    dataCollectionTitle: string
    dataCollectionDesc: string
    cookiesTitle: string
    cookiesDesc: string
    thirdPartyTitle: string
    thirdPartyDesc: string
    changesTitle: string
    changesDesc: string
    contactTitle: string
    contactDesc: string
    lastUpdated: string
}> = {
    'zh-Hans': {
        title: '隐私政策',
        subtitle: 'Schale Library 隐私保护声明',
        intro: '夏莱图书馆重视您的隐私。本政策说明我们如何收集、使用和保护您的信息。',
        dataCollectionTitle: '数据收集',
        dataCollectionDesc: '我们仅收集网站正常运行所必需的最少信息，包括访问日志和用户偏好设置（如语言和主题选择）。',
        cookiesTitle: 'Cookie 使用',
        cookiesDesc: '我们使用 Cookie 来保存您的语言偏好和主题设置。这些 Cookie 仅用于改善您的浏览体验。',
        thirdPartyTitle: '第三方服务',
        thirdPartyDesc: '本站使用 Cloudinary 进行图片托管。访问本站时，您的浏览器可能会向这些第三方服务发送请求。',
        changesTitle: '政策变更',
        changesDesc: '我们可能会不时更新本隐私政策。任何重大变更将在本页面公布。',
        contactTitle: '联系我们',
        contactDesc: '如果您对本隐私政策有任何疑问，请通过联系页面与我们取得联系。',
        lastUpdated: '最后更新：2025年12月14日',
    },
    'en': {
        title: 'Privacy Policy',
        subtitle: 'Schale Library Privacy Statement',
        intro: 'Schale Library values your privacy. This policy explains how we collect, use, and protect your information.',
        dataCollectionTitle: 'Data Collection',
        dataCollectionDesc: 'We only collect the minimum information necessary for the website to function, including access logs and user preferences (such as language and theme settings).',
        cookiesTitle: 'Cookie Usage',
        cookiesDesc: 'We use cookies to save your language preference and theme settings. These cookies are only used to improve your browsing experience.',
        thirdPartyTitle: 'Third-Party Services',
        thirdPartyDesc: 'This site uses Cloudinary for image hosting. When visiting this site, your browser may send requests to these third-party services.',
        changesTitle: 'Policy Changes',
        changesDesc: 'We may update this privacy policy from time to time. Any significant changes will be posted on this page.',
        contactTitle: 'Contact Us',
        contactDesc: 'If you have any questions about this privacy policy, please contact us through the contact page.',
        lastUpdated: 'Last updated: December 14, 2025',
    },
    'ja': {
        title: 'プライバシーポリシー',
        subtitle: 'シャーレ図書館プライバシー保護声明',
        intro: 'シャーレ図書館はお客様のプライバシーを大切にしています。このポリシーでは、情報の収集、使用、保護方法について説明します。',
        dataCollectionTitle: 'データ収集',
        dataCollectionDesc: 'ウェブサイトの正常な動作に必要な最小限の情報のみを収集します。これにはアクセスログとユーザー設定（言語やテーマ設定など）が含まれます。',
        cookiesTitle: 'Cookieの使用',
        cookiesDesc: '言語設定とテーマ設定を保存するためにCookieを使用しています。これらのCookieはブラウジング体験の向上のみに使用されます。',
        thirdPartyTitle: 'サードパーティサービス',
        thirdPartyDesc: '本サイトは画像ホスティングにCloudinaryを使用しています。本サイトにアクセスすると、ブラウザがこれらのサードパーティサービスにリクエストを送信する場合があります。',
        changesTitle: 'ポリシーの変更',
        changesDesc: 'このプライバシーポリシーは随時更新される場合があります。重要な変更がある場合は、このページで公開されます。',
        contactTitle: 'お問い合わせ',
        contactDesc: 'このプライバシーポリシーについてご質問がある場合は、お問い合わせページからご連絡ください。',
        lastUpdated: '最終更新：2025年12月14日',
    },
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
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
                                    <h2 className="text-xl font-bold mb-3">{t.dataCollectionTitle}</h2>
                                    <p className="text-muted-foreground">{t.dataCollectionDesc}</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <h2 className="text-xl font-bold mb-3">{t.cookiesTitle}</h2>
                                    <p className="text-muted-foreground">{t.cookiesDesc}</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <h2 className="text-xl font-bold mb-3">{t.thirdPartyTitle}</h2>
                                    <p className="text-muted-foreground">{t.thirdPartyDesc}</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <h2 className="text-xl font-bold mb-3">{t.changesTitle}</h2>
                                    <p className="text-muted-foreground">{t.changesDesc}</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <h2 className="text-xl font-bold mb-3">{t.contactTitle}</h2>
                                    <p className="text-muted-foreground">{t.contactDesc}</p>
                                </CardContent>
                            </Card>

                            <p className="text-sm text-muted-foreground text-center pt-4">{t.lastUpdated}</p>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
