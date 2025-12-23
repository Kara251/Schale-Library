import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { EventsWithFilters } from "@/components/events-with-filters"
import { getOfflineEvents } from "@/lib/api"
import type { Locale } from "@/lib/i18n"

interface OfflineEventsPageProps {
    params: Promise<{ locale: string }>
}

const titles: Record<Locale, string> = {
    'zh-Hans': '线下活动',
    'en': 'Offline Events',
    'ja': 'オフラインイベント',
}

export default async function OfflineEventsPage({ params }: OfflineEventsPageProps) {
    const { locale } = await params
    const title = titles[locale as Locale] || titles['zh-Hans']

    const eventsRes = await getOfflineEvents(100, locale).catch(() => ({ data: [] }))
    const events = eventsRes.data || []

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
                <div className="content-panel">
                    <EventsWithFilters events={events} type="offline" title={title} />
                </div>
            </main>

            <Footer />
        </div>
    )
}
