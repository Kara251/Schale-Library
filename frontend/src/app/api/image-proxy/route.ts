/**
 * 图片代理 API
 * 解决 B站 CDN 防盗链问题
 * 
 * 安全措施：
 * - 白名单验证（只允许 B站 CDN 域名）
 * - Rate Limiting（每 IP 每分钟 100 次）
 * - 图片大小限制（5MB）
 */

import { NextRequest, NextResponse } from 'next/server';

// 简单的内存 Rate Limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // 每分钟最大请求数
const RATE_WINDOW = 60 * 1000; // 1分钟窗口

// 最大图片大小 5MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record || now > record.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
        return true;
    }

    if (record.count >= RATE_LIMIT) {
        return false;
    }

    record.count++;
    return true;
}

export async function GET(request: NextRequest) {
    // Rate Limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // 只允许 B站 CDN 域名
    const allowedHosts = ['i0.hdslb.com', 'i1.hdslb.com', 'i2.hdslb.com'];
    try {
        const urlObj = new URL(url);
        if (!allowedHosts.includes(urlObj.hostname)) {
            return NextResponse.json({ error: 'Invalid host' }, { status: 403 });
        }
    } catch {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    try {
        const response = await fetch(url, {
            headers: {
                'Referer': 'https://www.bilibili.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
        }

        // 检查图片大小
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > MAX_IMAGE_SIZE) {
            return NextResponse.json({ error: 'Image too large' }, { status: 413 });
        }

        const arrayBuffer = await response.arrayBuffer();

        // 二次检查实际大小
        if (arrayBuffer.byteLength > MAX_IMAGE_SIZE) {
            return NextResponse.json({ error: 'Image too large' }, { status: 413 });
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';

        return new NextResponse(arrayBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400', // 缓存 1 天
            },
        });
    } catch (error) {
        console.error('Image proxy error:', error);
        return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
    }
}
