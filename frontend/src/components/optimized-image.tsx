'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface OptimizedImageProps {
  src: string
  alt: string
  className?: string
  aspectRatio?: string
  priority?: boolean
}

/**
 * 优化的图片组件 - 支持懒加载和渐进式加载
 */
export function OptimizedImage({
  src,
  alt,
  className,
  aspectRatio = '16/9',
  priority = false,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(priority)
  const imgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (priority) return

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
        rootMargin: '50px',
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [priority])

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

          {/* 实际图片 */}
          <img
            src={src}
            alt={alt}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-300',
              isLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={() => setIsLoaded(true)}
            loading={priority ? 'eager' : 'lazy'}
          />
        </>
      )}
    </div>
  )
}
