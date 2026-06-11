/**
 * 全局配置常量：Strapi 地址等
 * NEXT_PUBLIC_API_URL 在客户端与服务端均可用
 */
export const STRAPI_API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083').replace(/\/+$/, '')
