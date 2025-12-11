import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"

export const metadata = {
  title: "联系方式 - Schale Library",
  description: "联系夏莱图书馆",
}

export default function ContactPage() {
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
        <div className="max-w-2xl mx-auto">
          {/* 页面标题 */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">联系方式</h1>
            <p className="text-muted-foreground">有问题或建议？欢迎联系我们</p>
          </div>

          {/* 内容区域 */}
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-2">GitHub</h2>
                <p className="text-muted-foreground">
                  访问我们的 GitHub 仓库，提交 Issue 或 Pull Request
                </p>
                <a
                  href="https://github.com/Kara251/Schale-Library"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  GitHub 仓库
                </a>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-2">Email</h2>
                <p className="text-muted-foreground">
                  发送邮件给我们
                </p>
                <p className="text-primary">kara251@bakivo.com</p>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-2">社交媒体</h2>
                <p className="text-muted-foreground mb-2">
                  卡拉的社交媒体账号
                </p>
                
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Bilibili: Kara251</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
