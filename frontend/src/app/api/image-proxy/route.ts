/**
 * 图片代理 API
 * 解决 B站 CDN 防盗链问题
 * 
 * 安全措施：
 * - 白名单验证（只允许 B站 CDN 域名）
 * - Rate Limiting（Strapi 数据库存储，每 IP 每分钟 100 次）
 * - 图片大小限制（5MB）
 */

import { NextRequest, NextResponse } from 'next/server';

import { checkServerRateLimit, getClientIp } from '@/lib/server/rate-limit';

const RATE_LIMIT = 100; // 每分钟最大请求数
const RATE_WINDOW = 60 * 1000; // 1分钟窗口
const PROXY_TIMEOUT_MS = 10000;

// 最大图片大小 5MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_HOSTS = new Set(['i0.hdslb.com', 'i1.hdslb.com', 'i2.hdslb.com']);

export async function GET(request: NextRequest) {
    // Rate Limiting
    const ip = getClientIp(request);
    const allowed = await checkServerRateLimit({
        scope: 'image-proxy',
        identifier: ip,
        limit: RATE_LIMIT,
        windowMs: RATE_WINDOW,
        failClosed: process.env.NODE_ENV === 'production',
    });
    if (!allowed) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // 只允许 B站 CDN 域名
    let urlObj: URL;
    try {
        urlObj = new URL(url);
        if (urlObj.protocol !== 'https:') {
            return NextResponse.json({ error: 'Invalid protocol' }, { status: 403 });
        }

        if (!ALLOWED_HOSTS.has(urlObj.hostname)) {
            return NextResponse.json({ error: 'Invalid host' }, { status: 403 });
        }
    } catch {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

    try {
        const response = await fetch(urlObj.toString(), {
            signal: controller.signal,
            headers: {
                'Referer': 'https://www.bilibili.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.toLowerCase().startsWith('image/')) {
            return NextResponse.json({ error: 'Invalid content type' }, { status: 415 });
        }

        // 检查图片大小
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_SIZE) {
            return NextResponse.json({ error: 'Image too large' }, { status: 413 });
        }

        const arrayBuffer = await response.arrayBuffer();

        // 二次检查实际大小
        if (arrayBuffer.byteLength > MAX_IMAGE_SIZE) {
            return NextResponse.json({ error: 'Image too large' }, { status: 413 });
        }

        return new NextResponse(arrayBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400', // 缓存 1 天
                'X-Content-Type-Options': 'nosniff',
            },
        });
    } catch (error) {
        console.error('Image proxy error:', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
    } finally {
        clearTimeout(timeoutId);
    }
}
