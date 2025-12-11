import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"

export const metadata = {
  title: "关于我们 - Schale Library",
  description: "关于夏莱图书馆",
}

export default function AboutPage() {
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
            <h1 className="text-4xl font-bold mb-2">关于我们</h1>
            <p className="text-muted-foreground">Schale Library - 夏莱图书馆</p>
          </div>

          {/* 内容区域 */}
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-4">项目简介</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  夏莱图书馆是一个专注于收集游戏作品《蔚蓝档案》内容，以及游戏外的各种作品、活动等的资料系统。
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  我们致力于为广大老师们提供最全面、最及时的资讯服务，打造一个开放、共享的蔚蓝档案社区资源中心。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-4">技术栈</h2>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• <strong>前端：</strong>Next.js 16 + React 19 + TypeScript</li>
                  <li>• <strong>UI 库：</strong>Shadcn/UI + Tailwind CSS</li>
                  <li>• <strong>后端：</strong>Strapi 5 CMS</li>
                  <li>• <strong>媒体存储：</strong>Cloudinary</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-4">版权声明</h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    <strong>代码版权：</strong>本项目源代码遵循 MIT License 开源协议。
                  </p>
                  <p>
                    <strong>素材版权：</strong>本项目中使用的所有游戏原始或官方衍生素材（包括但不限于角色立绘、图标、语音、文本、UI设计等）的知识产权均归属于 <strong>Nexon Games</strong>、<strong>Yostar</strong> 及相关版权方所有。
                  </p>
                  <p>
                    本项目尊重{" "}
                    <a
                      href="https://weibo.com/ttarticle/p/show?id=2309404965471018418185"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      《&lt;蔚蓝档案&gt;同人创作指引》
                    </a>
                    {" "}和{" "}
                    <a
                      href="https://bluearchive.jp/fankit/guidelines"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      『二次創作ガイドライン』
                    </a>
                    。
                  </p>
                  <p>
                    <strong>非盈利声明：</strong>本项目为粉丝自制的非盈利性二创项目，旨在整理和展示游戏相关内容，不用于任何商业用途。如果版权方要求下架，本项目将无条件配合。
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-4">联系我们</h2>
                <p className="text-muted-foreground">
                  如有问题或建议，欢迎通过以下方式联系我们：
                </p>
                <ul className="mt-4 space-y-2 text-muted-foreground">
                  <li>• GitHub: <a href="https://github.com" className="text-primary hover:underline">待更新</a></li>
                  <li>• Email: 待更新</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
