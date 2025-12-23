'use client'

import { useState, useEffect, useRef, memo } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface OptimizedImageProps {
  src: string
  alt: string
  className?: string
  aspectRatio?: string
  priority?: boolean
}

// 内存缓存已加载的图片 URL
const loadedImages = new Set<string>()

/**
 * 优化的图片组件 - 支持懒加载、渐进式加载和客户端缓存
 */
export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  className,
  aspectRatio = '16/9',
  priority = false,
}: OptimizedImageProps) {
  // 如果图片已经在缓存中，直接显示
  const [isLoaded, setIsLoaded] = useState(loadedImages.has(src))
  const [isInView, setIsInView] = useState(priority || loadedImages.has(src))
  const imgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (priority || loadedImages.has(src)) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '100px',
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [priority, src])

  const handleLoad = () => {
    loadedImages.add(src)
    setIsLoaded(true)
  }

  // 判断是否是外部 URL
  const isExternal = src.startsWith('http://') || src.startsWith('https://')

  return (
    <div
      ref={imgRef}
      className={cn('relative overflow-hidden bg-muted', className)}
      style={{ aspectRatio }}
    >
      {isInView && (
        <>
          {/* 加载占位符 */}
          {!isLoaded && (
            <div className="absolute inset-0 animate-pulse bg-muted" />
          )}

          {/* 使用 Next.js Image 组件获得缓存优化 */}
          {isExternal ? (
            <Image
              src={src}
              alt={alt}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className={cn(
                'object-cover transition-opacity duration-300',
                isLoaded ? 'opacity-100' : 'opacity-0'
              )}
              onLoad={handleLoad}
              priority={priority}
            />
          ) : (
            <img
              src={src}
              alt={alt}
              className={cn(
                'w-full h-full object-cover transition-opacity duration-300',
                isLoaded ? 'opacity-100' : 'opacity-0'
              )}
              onLoad={handleLoad}
              loading={priority ? 'eager' : 'lazy'}
            />
          )}
        </>
      )}
    </div>
  )
})
