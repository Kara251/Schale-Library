import { notFound } from 'next/navigation'
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Globe, User, ArrowLeft } from 'lucide-react'
import { getOnlineEventById } from "@/lib/api"
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const eventRes = await getOnlineEventById(Number(id)).catch(() => null)
  
  if (!eventRes || !eventRes.data) {
    return {
      title: '活动未找到 - Schale Library',
    }
  }

  return {
    title: `${eventRes.data.title} - Schale Library`,
    description: eventRes.data.description?.substring(0, 150) || '线上活动详情',
  }
}

export default async function OnlineEventDetailPage({ params }: PageProps) {
  const { id } = await params
  const eventRes = await getOnlineEventById(Number(id)).catch(() => null)

  if (!eventRes || !eventRes.data) {
    notFound()
  }

  const event = eventRes.data

  // 格式化时间
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })
    } catch {
      return dateString
    }
  }

  // 判断活动状态
  const getEventStatus = () => {
    const now = new Date()
    const start = new Date(event.startTime)
    const end = new Date(event.endTime)

    if (now < start) return { label: '未开始', color: 'default' as const }
    if (now > end) return { label: '已结束', color: 'secondary' as const }
    return { label: '进行中', color: 'default' as const }
  }

  const status = getEventStatus()
  const natureLabel = event.nature === 'official' ? '官方' : '同人'

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
        {/* 返回按钮 */}
        <Link href="/online-events" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          返回线上活动列表
        </Link>

        <div className="max-w-4xl mx-auto">
          {/* 封面图 */}
          {event.coverImage && (
            <div className="relative h-64 md:h-96 rounded-lg overflow-hidden mb-8">
              <img
                src={event.coverImage.url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              
              {/* 标签 */}
              <div className="absolute top-4 left-4 flex gap-2">
                <Badge variant={status.color} className="font-bold">
                  {status.label}
                </Badge>
                <Badge
                  variant={event.nature === 'official' ? 'default' : 'secondary'}
                  className="font-bold"
                >
                  {natureLabel}
                </Badge>
              </div>
            </div>
          )}

          {/* 标题和元信息 */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{event.title}</h1>
            
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {/* 时间 */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <div>
                  <div>{formatDate(event.startTime)}</div>
                  <div>至 {formatDate(event.endTime)}</div>
                </div>
              </div>

              {/* 主办方 */}
              {event.organizer && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{event.organizer}</span>
                </div>
              )}

              {/* 性质 */}
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span>{natureLabel}活动</span>
              </div>
            </div>
          </div>

          {/* 活动链接 */}
          {event.link && (
            <div className="mb-8">
              <Button asChild size="lg" className="w-full md:w-auto">
                <a href={event.link} target="_blank" rel="noopener noreferrer">
                  前往活动页面 →
                </a>
              </Button>
            </div>
          )}

          {/* 活动描述 */}
          {event.description && (
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <h2 className="text-2xl font-bold mb-4">活动详情</h2>
              <div
                className="bg-card border rounded-lg p-6"
                dangerouslySetInnerHTML={{ __html: event.description }}
              />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
