import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Loading } from '@/components/loading'

export default function TestApiLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="relative flex-1 flex items-center justify-center">
        <Loading text="正在测试 API 连接..." />
      </main>
      <Footer />
    </div>
  )
}
