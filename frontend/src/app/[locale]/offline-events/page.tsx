import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { EventsWithFilters, type EventSortMode } from "@/components/events-with-filters"
import { getEventLocationRecords, getOfflineEvents, type EventNatureFilter, type EventStatusFilter } from "@/lib/api"
import type { Locale } from "@/lib/i18n"
import { normalizeEventLocationName } from "@/lib/utils/event-location"

export const revalidate = 60;

interface OfflineEventsPageProps {
    params: Promise<{ locale: string }>
    searchParams: Promise<{
        q?: string
        nature?: EventNatureFilter
        status?: EventStatusFilter
        country?: string
        region?: string
        city?: string
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
    const sort = parseValue(filters.sort, eventSorts, 'relevant')
    const country = normalizeEventLocationName(filters.country)
    const region = normalizeEventLocationName(filters.region)
    const city = normalizeEventLocationName(filters.city)

    const [eventsResult, locationRecords] = await Promise.all([
        getOfflineEvents(24, locale, {
            query: filters.q,
            nature,
            status,
            country,
            region,
            city,
            sort,
            page,
            pageSize: 24,
        }).then((response) => ({ response, hasError: false })).catch((error) => {
            console.error('Failed to load offline events:', error)
            return {
                response: { data: [], meta: { pagination: { page, pageSize: 24, pageCount: 1, total: 0 } } },
                hasError: true,
            }
        }),
        getEventLocationRecords(locale, 'offline').catch((error) => {
            console.error('Failed to load offline event location filters:', error)
            return []
        }),
    ])
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
                        initialCountry={country}
                        initialRegion={region}
                        initialCity={city}
                        locationRecords={locationRecords}
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
