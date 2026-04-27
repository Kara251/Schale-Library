import type { NextConfig } from "next";

function getApiUploadPattern() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083';

  try {
    const parsed = new URL(apiUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    return {
      protocol: parsed.protocol.replace(':', '') as 'http' | 'https',
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: '/uploads/**',
    };
  } catch {
    return null;
  }
}

const apiUploadPattern = getApiUploadPattern();
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083';

function getSecurityHeaders() {
  const apiOrigin = (() => {
    try {
      return new URL(apiUrl).origin;
    } catch {
      return 'http://localhost:8083';
    }
  })();

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vitals.vercel-insights.com https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms",
    "style-src 'self' 'unsafe-inline' https://fonts.loli.net",
    `img-src 'self' data: blob: ${apiOrigin} http://localhost:8083 https://res.cloudinary.com https://i0.hdslb.com https://i1.hdslb.com https://i2.hdslb.com`,
    `connect-src 'self' ${apiOrigin} https://vitals.vercel-insights.com https://www.google-analytics.com https://region1.google-analytics.com https://www.clarity.ms https://*.clarity.ms`,
    "font-src 'self' data: https://fonts.gstatic.com https://fonts.loli.net",
  ].join('; ');

  const headers = [
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
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=()',
    },
    {
      key: 'Content-Security-Policy',
      value: csp,
    },
  ];

  if (process.env.NODE_ENV === 'production') {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains',
    });
  }

  return headers;
}

const nextConfig: NextConfig = {
  // 图片优化配置
  images: {
    // 远程图片域名（仅允许可信来源）
    remotePatterns: [
      ...(apiUploadPattern ? [apiUploadPattern] : []),
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
        headers: getSecurityHeaders(),
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
    ];
  },
};

export default nextConfig;
