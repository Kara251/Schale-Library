import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 图片优化配置
  images: {
    // 远程图片域名（仅允许可信来源）
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8083',
        pathname: '/uploads/**',
      },
      {
        // Cloudinary - 生产环境图片托管
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        // B站图片 CDN
        protocol: 'https',
        hostname: 'i0.hdslb.com',
        pathname: '/**',
      },
      {
        // B站图片 CDN
        protocol: 'https',
        hostname: 'i1.hdslb.com',
        pathname: '/**',
      },
      {
        // B站图片 CDN
        protocol: 'https',
        hostname: 'i2.hdslb.com',
        pathname: '/**',
      },
    ],
    // 图片缓存时间（秒）- 7天
    minimumCacheTTL: 604800,
    // 设备尺寸断点
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // 图片尺寸
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 使用静态导出时禁用图片优化
    unoptimized: false,
  },
  // HTTP 头配置
  async headers() {
    return [
      {
        // 全局安全头
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        // 静态资源缓存 1 年
        source: '/img/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Next.js 优化的图片缓存 7 天
        source: '/_next/image/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // 静态文件缓存 1 年
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
