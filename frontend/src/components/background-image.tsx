'use client'

import Image from 'next/image'

/**
 * 全局背景图组件
 */
export function BackgroundImage() {
    return (
        <div className="fixed inset-0 -z-20 overflow-hidden">
            <Image
                src="/img/ba-sea-night.jpg"
                alt=""
                fill
                priority
                quality={75}
                className="object-cover object-center"
                sizes="100vw"
            />
        </div>
    )
}

