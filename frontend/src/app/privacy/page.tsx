import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"

export const metadata = {
  title: "隐私政策 - Schale Library",
  description: "夏莱图书馆隐私政策",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-40 right-20 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-40 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <Header />

      <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
        <div className="max-w-3xl mx-auto">
          {/* 页面标题 */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">隐私政策</h1>
            <p className="text-muted-foreground">最后更新：2025年1月</p>
          </div>

          {/* 内容区域 */}
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-4">信息收集</h2>
                <p className="text-muted-foreground leading-relaxed">
                  本网站仅收集必要的访问数据用于改进服务质量，包括但不限于页面访问统计、用户行为分析等。我们不会收集您的个人敏感信息。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-4">Cookie 使用</h2>
                <p className="text-muted-foreground leading-relaxed">
                  本网站使用 Cookie 来改善用户体验。Cookie 是存储在您设备上的小型文本文件，用于记住您的偏好设置和登录状态。您可以在浏览器设置中选择拒绝 Cookie，但这可能会影响部分功能的使用。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-4">数据安全</h2>
                <p className="text-muted-foreground leading-relaxed">
                  我们采取合理的技术和管理措施来保护您的数据安全。但请注意，没有任何互联网传输或电子存储方法是100%安全的。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-4">第三方服务</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  本网站可能使用以下第三方服务：
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• <strong>Cloudinary:</strong> 用于图片和媒体文件存储</li>
                  <li>• <strong>Vercel Analytics:</strong> 用于网站访问统计</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  这些服务可能会收集和处理您的部分数据，具体请参阅各服务商的隐私政策。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-4">政策变更</h2>
                <p className="text-muted-foreground leading-relaxed">
                  我们可能会不定期更新本隐私政策。任何重大变更将在本页面公布，建议您定期查看。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-4">联系我们</h2>
                <p className="text-muted-foreground leading-relaxed">
                  如果您对本隐私政策有任何疑问，请通过{" "}
                  <a href="/contact" className="text-primary hover:underline">
                    联系方式
                  </a>
                  {" "}页面与我们联系。
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
