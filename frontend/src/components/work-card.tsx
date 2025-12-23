'use client'

import { memo } from 'react'
import { Play, Image as ImageIcon, FileText, MoreHorizontal } from 'lucide-react'
import { OptimizedImage } from '@/components/optimized-image'
import { LocaleLink } from '@/components/locale-link'
import { useLocale } from '@/contexts/locale-context'
import type { Work } from '@/lib/api'
import type { Locale } from '@/lib/i18n'

interface WorkCardProps {
    work: Work
}

// 作品类型图标映射
const workTypeIcons = {
    video: Play,
    image: ImageIcon,
    text: FileText,
    other: MoreHorizontal,
}

const labels: Record<Locale, {
    video: string
    image: string
    text: string
    other: string
    official: string
    fanmade: string
}> = {
    'zh-Hans': {
        video: '视频',
        image: '图画',
        text: '文字',
        other: '其他',
        official: '官方',
        fanmade: '同人',
    },
    'en': {
        video: 'Video',
        image: 'Image',
        text: 'Text',
        other: 'Other',
        official: 'Official',
        fanmade: 'Fan-made',
    },
    'ja': {
        video: '動画',
        image: '画像',
        text: 'テキスト',
        other: 'その他',
        official: '公式',
        fanmade: '二次創作',
    },
}

/**
 * 推荐作品卡片组件
 * 使用 memo 优化列表渲染性能
 */
export const WorkCard = memo(function WorkCard({ work }: WorkCardProps) {
    const { locale } = useLocale()
    const t = labels[locale] || labels['zh-Hans']

    const TypeIcon = workTypeIcons[work.workType] || MoreHorizontal
    const typeLabel = t[work.workType as keyof typeof t] || t.other
    const natureLabel = work.nature === 'official' ? t.official : t.fanmade

    // 出场学生（最多显示3个，超过显示+N）
    const students = work.students || []
    const visibleStudents = students.slice(0, 3)
    const overflowCount = students.length - 3

    return (
        <LocaleLink
            href={`/works/${work.id}`}
            className="block group ba-card p-4"
        >
            <div className="ba-card-content">
                {/* 封面图 */}
                <div className="relative aspect-video rounded overflow-hidden bg-muted mb-3">
                    {work.coverImage ? (
                        <OptimizedImage
                            src={work.coverImage.url}
                            alt={work.title}
                            aspectRatio="16/9"
                            className="group-hover:scale-102 transition-transform duration-200"
                        />
                    ) : work.coverImageUrl ? (
                        <img
                            src={`/api/image-proxy?url=${encodeURIComponent(work.coverImageUrl)}`}
                            alt={work.title}
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                        />
                    ) : (
                        <div className="w-full h-full bg-secondary flex items-center justify-center">
                            <TypeIcon className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                    )}

                    {/* 类型标签 */}
                    <span className="absolute top-2 right-2 px-2 py-0.5 text-xs bg-black/60 text-white rounded">
                        {typeLabel}
                    </span>

                    {/* 出场学生头像 */}
                    {students.length > 0 && (
                        <div className="absolute bottom-2 left-2 flex -space-x-2">
                            {visibleStudents.map((student) => (
                                <div
                                    key={student.id}
                                    className="w-7 h-7 rounded-full border-2 border-background overflow-hidden bg-secondary"
                                    title={student.name}
                                >
                                    {student.avatar ? (
                                        <img
                                            src={student.avatar.url}
                                            alt={student.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                                            {student.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {overflowCount > 0 && (
                                <div className="w-7 h-7 rounded-full border-2 border-background bg-black/60 flex items-center justify-center text-xs text-white font-medium">
                                    +{overflowCount}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 内容区 */}
                <div>
                    {/* 标题 */}
                    <h3 className="ba-title line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                        {work.title}
                    </h3>

                    {/* 信息行 */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{natureLabel}</span>
                        {work.author && (
                            <>
                                <span>·</span>
                                <span className="line-clamp-1">{work.author}</span>
                            </>
                        )}
                    </div>

                    {/* 出场学生名字 */}
                    {students.length > 0 && (
                        <div className="mt-1 text-xs text-muted-foreground line-clamp-1">
                            {visibleStudents.map(s => s.name).join('、')}
                            {overflowCount > 0 && ` +${overflowCount}`}
                        </div>
                    )}
                </div>
            </div>
        </LocaleLink>
    )
})
