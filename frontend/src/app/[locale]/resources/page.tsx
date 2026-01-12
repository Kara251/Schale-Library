"use client"

import { useLocale } from "@/contexts/locale-context"

export default function ResourcesPage() {
    const { locale } = useLocale()

    // 资源库地址
    const driveUrl = "https://drive.bakivo.com"

    return (
        <div className="w-full h-[calc(100vh-4rem)] bg-background">
            <iframe
                src={driveUrl}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                title="Schale Library Drive"
            />
        </div>
    )
}
