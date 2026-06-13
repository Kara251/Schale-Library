import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { EventsWithFilters, type EventSortMode } from "@/components/events-with-filters"
import { getOfflineEvents, type EventFormatFilter, type EventNatureFilter, type EventSourcePlatformFilter, type EventStatusFilter } from "@/lib/api"
import type { Locale } from "@/lib/i18n"

export const revalidate = 60;

interface OfflineEventsPageProps {
    params: Promise<{ locale: string }>
    searchParams: Promise<{
        q?: string
        nature?: EventNatureFilter
        status?: EventStatusFilter
        format?: EventFormatFilter
        city?: string
        source?: EventSourcePlatformFilter
        sort?: EventSortMode
        page?: string
    }>
}

const titles: Record<Locale, string> = {
    'zh-Hans': '线下活动',
    'en': 'Offline Events',
    'ja': 'オフラインイベント',
}

const eventNatures: EventNatureFilter[] = ['all', 'official', 'fanmade']
const eventStatuses: EventStatusFilter[] = ['all', 'upcoming', 'ongoing', 'ended']
const eventFormats: EventFormatFilter[] = ['all', 'live_stream', 'live_show', 'only_event', 'collaboration', 'contest', 'campaign', 'exhibition', 'meetup', 'release', 'other']
const eventSources: EventSourcePlatformFilter[] = ['all', 'manual', 'official', 'baonly', 'bilibili', 'x', 'youtube', 'website', 'ticketing', 'other']
const eventSorts: EventSortMode[] = ['relevant', 'startTime', 'endTime']

function parseValue<T extends string>(value: string | undefined, allowed: T[], fallback: T): T {
    return value && allowed.includes(value as T) ? value as T : fallback
}

export default async function OfflineEventsPage({ params, searchParams }: OfflineEventsPageProps) {
    const { locale } = await params
    const filters = await searchParams
    const title = titles[locale as Locale] || titles['zh-Hans']
    const page = Math.max(1, Number(filters.page || '1'))
    const nature = parseValue(filters.nature, eventNatures, 'all')
    const status = parseValue(filters.status, eventStatuses, 'all')
    const format = parseValue(filters.format, eventFormats, 'all')
    const source = parseValue(filters.source, eventSources, 'all')
    const sort = parseValue(filters.sort, eventSorts, 'relevant')

    const eventsResult = await getOfflineEvents(24, locale, {
        query: filters.q,
        nature,
        status,
        format,
        city: filters.city,
        source,
        sort,
        page,
        pageSize: 24,
    }).then((response) => ({ response, hasError: false })).catch((error) => {
        console.error('Failed to load offline events:', error)
        return {
            response: { data: [], meta: { pagination: { page, pageSize: 24, pageCount: 1, total: 0 } } },
            hasError: true,
        }
    })
    const eventsRes = eventsResult.response
    const events = eventsRes.data || []
    const pagination = eventsRes.meta?.pagination || { page, pageCount: 1, total: events.length }

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
                <div className="content-panel">
                    <EventsWithFilters
                        events={events}
                        type="offline"
                        title={title}
                        initialSearchQuery={filters.q || ''}
                        initialNature={nature}
                        initialStatus={status}
                        initialFormat={format}
                        initialCity={filters.city || ''}
                        initialSource={source}
                        initialSort={sort}
                        total={pagination.total}
                        page={pagination.page}
                        pageCount={pagination.pageCount}
                        hasError={eventsResult.hasError}
                    />
                </div>
            </main>

            <Footer />
        </div>
    )
}
