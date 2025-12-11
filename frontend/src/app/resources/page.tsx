import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export const metadata = {
  title: "资源整理 - Schale Library",
  description: "浏览各类蔚蓝档案资源",
}

export default function ResourcesPage() {
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
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">资源整理</h1>
          <p className="text-muted-foreground">各类蔚蓝档案相关资源</p>
        </div>

        {/* 占位内容 */}
        <div className="text-center py-12">
          <p className="text-muted-foreground">资源页面开发中...</p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
