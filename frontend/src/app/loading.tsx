import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Loading } from '@/components/loading'

export default function LoadingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <Loading fullScreen />
      <Footer />
    </div>
  )
}
