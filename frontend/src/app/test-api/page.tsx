import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getAnnouncements, getOnlineEvents, getOfflineEvents } from "@/lib/api"
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react"

export const metadata = {
  title: "API 测试 - Schale Library",
  description: "测试前后端 API 连接",
}

export default async function TestApiPage() {
  // 测试所有 API
  const results = await Promise.allSettled([
    getAnnouncements(),
    getOnlineEvents(10),
    getOfflineEvents(10),
  ])

  const [announcementsResult, onlineEventsResult, offlineEventsResult] = results

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'fulfilled':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'fulfilled':
        return <Badge className="bg-green-500">成功</Badge>
      case 'rejected':
        return <Badge variant="destructive">失败</Badge>
      default:
        return <Badge variant="secondary">未知</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">API 连接测试</h1>
            <p className="text-muted-foreground">
              测试前后端 API 是否正常连接
            </p>
          </div>

          {/* 后端连接状态 */}
          <Card>
            <CardHeader>
              <CardTitle>后端服务状态</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(announcementsResult.status)}
                  <div>
                    <div className="font-medium">公告 API</div>
                    <div className="text-sm text-muted-foreground">
                      GET /api/announcements
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {getStatusBadge(announcementsResult.status)}
                  {announcementsResult.status === 'fulfilled' && (
                    <span className="text-sm text-muted-foreground">
                      {announcementsResult.value.data?.length || 0} 条数据
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(onlineEventsResult.status)}
                  <div>
                    <div className="font-medium">线上活动 API</div>
                    <div className="text-sm text-muted-foreground">
                      GET /api/online-events
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {getStatusBadge(onlineEventsResult.status)}
                  {onlineEventsResult.status === 'fulfilled' && (
                    <span className="text-sm text-muted-foreground">
                      {onlineEventsResult.value.data?.length || 0} 条数据
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(offlineEventsResult.status)}
                  <div>
                    <div className="font-medium">线下活动 API</div>
                    <div className="text-sm text-muted-foreground">
                      GET /api/offline-events
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {getStatusBadge(offlineEventsResult.status)}
                  {offlineEventsResult.status === 'fulfilled' && (
                    <span className="text-sm text-muted-foreground">
                      {offlineEventsResult.value.data?.length || 0} 条数据
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 错误详情 */}
          {results.some(r => r.status === 'rejected') && (
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">错误详情</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {announcementsResult.status === 'rejected' && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="font-medium mb-2">公告 API 错误</div>
                    <pre className="text-xs overflow-auto">
                      {announcementsResult.reason?.message || '未知错误'}
                    </pre>
                  </div>
                )}
                {onlineEventsResult.status === 'rejected' && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="font-medium mb-2">线上活动 API 错误</div>
                    <pre className="text-xs overflow-auto">
                      {onlineEventsResult.reason?.message || '未知错误'}
                    </pre>
                  </div>
                )}
                {offlineEventsResult.status === 'rejected' && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="font-medium mb-2">线下活动 API 错误</div>
                    <pre className="text-xs overflow-auto">
                      {offlineEventsResult.reason?.message || '未知错误'}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 配置检查 */}
          <Card>
            <CardHeader>
              <CardTitle>配置信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">后端 API 地址</span>
                <span className="font-mono text-sm">
                  {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">前端环境</span>
                <span className="font-mono text-sm">
                  {process.env.NODE_ENV}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Next.js 版本</span>
                <span className="font-mono text-sm">16.0.7</span>
              </div>
            </CardContent>
          </Card>

          {/* 建议 */}
          <Card>
            <CardHeader>
              <CardTitle>测试建议</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>✅ 1. 确保后端 Strapi 服务正在运行（端口 8083）</p>
              <p>✅ 2. 确保已在 Strapi 后台配置了 API 权限（Public 角色）</p>
              <p>✅ 3. 确保已添加测试数据并发布</p>
              <p>✅ 4. 检查 .env.local 中的 NEXT_PUBLIC_API_URL 配置</p>
              <p>✅ 5. 如果有跨域问题，检查 Strapi 的 CORS 设置</p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
