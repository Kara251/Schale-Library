import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { EventsWithFilters } from "@/components/events-with-filters"
import { getOnlineEvents, getOfflineEvents } from "@/lib/api"

export const metadata = {
  title: "搜索 - Schale Library",
  description: "搜索线上和线下活动",
}

export default async function SearchPage() {
  // 并行获取所有活动
  const [onlineEventsRes, offlineEventsRes] = await Promise.all([
    getOnlineEvents(100).catch(() => ({ data: [] })),
    getOfflineEvents(100).catch(() => ({ data: [] })),
  ])

  const allEvents = [
    ...(onlineEventsRes.data || []),
    ...(offlineEventsRes.data || []),
  ]

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
        <EventsWithFilters events={allEvents} type="all" title="搜索活动" />
      </main>

      <Footer />
    </div>
  )
}
