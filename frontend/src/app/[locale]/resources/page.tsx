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

            <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
                <div className="content-panel h-[800px] w-full bg-background rounded-lg border shadow-sm overflow-hidden">
                    <iframe
                        src={driveUrl}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        title="Schale Library Drive"
                    />
                </div>
            </main>

            <Footer />
        </div>
    )
}
