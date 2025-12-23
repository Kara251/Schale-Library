import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Loading } from '@/components/loading'

export default function LoadingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
        <div className="content-panel flex items-center justify-center min-h-[60vh]">
          <Loading fullScreen />
        </div>
      </main>
      <Footer />
    </div>
  )
}
