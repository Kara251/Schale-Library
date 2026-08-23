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

interface CloudflareAnalyticsProps {
    token?: string
}

/**
 * Cloudflare Web Analytics。取代迁移前的 Vercel Analytics
 * —— 后者的采集端点只存在于 Vercel，站点搬到 Workers 后不会有任何数据。
 * 未配置 token 时不渲染，本地开发与未接入的环境都不会打无效请求。
 * token 由 Cloudflare Dashboard → Analytics & Logs → Web Analytics 签发。
 */
export function CloudflareAnalytics({ token }: CloudflareAnalyticsProps) {
    const beaconToken = token || process.env.NEXT_PUBLIC_CF_BEACON_TOKEN

    if (!beaconToken) return null

    return (
        <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            strategy="afterInteractive"
            data-cf-beacon={JSON.stringify({ token: beaconToken })}
        />
    )
}
