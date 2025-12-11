import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Carousel } from "@/components/carousel"
import { EventList } from "@/components/event-list"
import { getAnnouncements, getOnlineEvents, getOfflineEvents } from "@/lib/api"

export default async function HomePage() {
  // 并行获取数据
  const [announcementsRes, onlineEventsRes, offlineEventsRes] = await Promise.all([
    getAnnouncements().catch(() => ({ data: [] })),
    getOnlineEvents(6).catch(() => ({ data: [] })),
    getOfflineEvents(6).catch(() => ({ data: [] })),
  ]);

  const announcements = announcementsRes.data || [];
  const onlineEvents = onlineEventsRes.data || [];
  const offlineEvents = offlineEventsRes.data || [];

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
        {/* 轮播图区域 */}
        <section className="mb-12">
          <Carousel announcements={announcements} />
        </section>

        {/* 最新活动区域 */}
        <section>
          <EventList
            onlineEvents={onlineEvents}
            offlineEvents={offlineEvents}
            title="最新活动"
          />
        </section>
      </main>

      <Footer />
    </div>
  )
}
