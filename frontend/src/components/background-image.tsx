'use client'

import Image from 'next/image'

/**
 * 全局背景图组件 - 蔚蓝档案风格
 * 包含背景图片 + 网格叠加层
 */
export function BackgroundImage() {
    return (
        <>
            {/* 背景图片 */}
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
            {/* BA 风格网格叠加层 */}
            <div className="fixed inset-0 -z-10 ba-grid-bg pointer-events-none" />
        </>
    )
}
