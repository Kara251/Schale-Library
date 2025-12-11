import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { EventsWithFilters } from "@/components/events-with-filters"
import { getOnlineEvents } from "@/lib/api"

export const metadata = {
  title: "线上活动 - Schale Library",
  description: "浏览所有线上活动信息，支持搜索和筛选",
}

export default async function OnlineEventsPage() {
  const eventsRes = await getOnlineEvents(100).catch(() => ({ data: [] }))
  const events = eventsRes.data || []

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
        <EventsWithFilters events={events} type="online" title="线上活动" />
      </main>

      <Footer />
    </div>
  )
}
