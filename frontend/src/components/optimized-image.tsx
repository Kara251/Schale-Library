'use client'

import { useState, memo } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { getMediaUrl } from '@/lib/media'

interface OptimizedImageProps {
  src: string
  alt: string
  className?: string
  aspectRatio?: string
  priority?: boolean
}

/**
 * 优化的图片组件 - 基于 Next.js Image，保留轻量级加载占位效果
 */
export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  className,
  aspectRatio = '16/9',
  priority = false,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const imageSrc = getMediaUrl(src)
  const isProxyImage = imageSrc.startsWith('/api/image-proxy?')

  const handleLoad = () => {
    setIsLoaded(true)
  }

  return (
    <div
      className={cn('relative overflow-hidden bg-muted', className)}
      style={{ aspectRatio }}
    >
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}

      {isProxyImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt={alt}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={handleLoad}
        />
      ) : (
        <Image
          src={imageSrc}
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
      )}
    </div>
  )
})
