/**
 * 全局配置常量：Strapi 地址等
 * NEXT_PUBLIC_API_URL 在客户端与服务端均可用
 */
export const STRAPI_API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083').replace(/\/+$/, '')

/**
 * 前端站点地址，用于 metadataBase、sitemap、robots 及 OG 图片绝对地址
 * NEXT_PUBLIC_SITE_URL 在客户端与服务端均可用
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '')
