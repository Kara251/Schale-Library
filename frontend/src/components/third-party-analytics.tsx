'use client'

import Script from 'next/script'

interface GoogleAnalyticsProps {
    gaId?: string
}

interface ClarityProps {
    projectId?: string
}

export function GoogleAnalytics({ gaId }: GoogleAnalyticsProps) {
    // 优先使用传入的 ID，否则尝试使用环境变量
    const id = gaId || process.env.NEXT_PUBLIC_GA_ID

    if (!id) return null

    return (
        <>
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
                strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
                {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${id}');
        `}
            </Script>
        </>
    )
}

export function Clarity({ projectId }: ClarityProps) {
    // 优先使用传入的 ID，否则尝试使用环境变量
    const id = projectId || process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID

    if (!id) return null

    return (
        <Script id="microsoft-clarity" strategy="afterInteractive">
            {`
        (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${id}");
      `}
        </Script>
    )
}
