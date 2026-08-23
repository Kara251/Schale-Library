import { notFound, permanentRedirect } from 'next/navigation'
import { getOnlineEventById, getContentEntryPathId } from '@/lib/api'

export const revalidate = 60;

interface PageProps {
    params: Promise<{ id: string; locale: string }>
}

// 线上/线下详情已合并至 /events/[id]：旧链接 308 重定向以保留 SEO 权重。
export default async function OnlineEventDetailPage({ params }: PageProps) {
    const { id, locale } = await params
    const eventRes = await getOnlineEventById(id, locale).catch(() => null)

    if (!eventRes?.data) {
        notFound()
    }

    permanentRedirect(`/${locale}/events/${getContentEntryPathId(eventRes.data)}`)
}
