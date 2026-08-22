"use client"

import { useLocale } from "@/contexts/locale-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function ResourcesPage() {
    useLocale()

    // 资源库地址
    const driveUrl = "https://drive.bakivo.com"

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="relative flex-1 flex flex-col container mx-auto px-4 py-4">
                <iframe
                    src={driveUrl}
                    className="w-full flex-1 min-h-[480px] border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    title="Schale Library Drive"
                />
            </main>

            <Footer />
        </div>
    )
}
