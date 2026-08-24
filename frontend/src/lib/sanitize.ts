/**
 * HTML 消毒工具
 * 用于防止 XSS 跨站脚本攻击
 *
 * 实现说明：全部调用点都在服务端（RSC），线上跑在 Cloudflare Workers 上。
 * 原先的 isomorphic-dompurify 在服务端依赖 jsdom —— Workers 上跑不起来，
 * 且给产物加约 8MB 撑爆 Worker 体积上限。DOMPurify 在不受支持的环境里会
 * 静默原样返回输入（不报错），换实现时必须实测而非只看类型通过。
 * sanitize-html 走 htmlparser2，不需要 DOM，标签/属性白名单语义与原先一致。
 */

import sanitize from 'sanitize-html';

const TRUSTED_IMAGE_HOSTS = new Set(['i0.hdslb.com', 'i1.hdslb.com', 'i2.hdslb.com', 'res.cloudinary.com']);
import { API_BASE_URL as API_URL } from '@/lib/config';

try {
    const parsedApiUrl = new URL(API_URL);
    TRUSTED_IMAGE_HOSTS.add(parsedApiUrl.hostname);
} catch {
    // Ignore invalid API URL in build-time environments.
}

/**
 * 允许的 HTML 标签白名单
 * 这些标签通常在富文本编辑器中使用，是安全的
 */
const ALLOWED_TAGS = [
    // 文本格式
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins',
    // 标题
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // 列表
    'ul', 'ol', 'li',
    // 链接和媒体
    'a', 'img',
    // 引用和代码
    'blockquote', 'code', 'pre',
    // 表格
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    // 其他
    'hr', 'span', 'div',
];

/**
 * 允许的 HTML 属性白名单
 * style 不在其中：内联样式可承载 XSS 载荷（如 expression / url(javascript:)）
 */
const ALLOWED_ATTR = [
    'href', 'target', 'rel',
    'src', 'alt', 'width', 'height',
    'class',
];

/** 只允许安全的 URL 协议 */
const ALLOWED_SCHEMES = ['http', 'https', 'mailto', 'tel'];

/** img 的 src 必须是可信图床上的 http(s) 资源，否则整个元素丢弃。 */
function isTrustedImageSrc(src: string | undefined): boolean {
    if (!src) return false;

    try {
        const imageUrl = new URL(src, API_URL);
        if (imageUrl.protocol !== 'https:' && imageUrl.protocol !== 'http:') {
            return false;
        }
        return TRUSTED_IMAGE_HOSTS.has(imageUrl.hostname);
    } catch {
        return false;
    }
}

/**
 * 消毒 HTML 内容，移除潜在的恶意脚本
 * @param dirty 未经处理的原始 HTML 字符串
 * @returns 经过消毒的安全 HTML 字符串
 */
export function sanitizeHtml(dirty: string | undefined | null): string {
    if (!dirty) return '';

    return sanitize(dirty, {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: { '*': ALLOWED_ATTR },
        allowedSchemes: ALLOWED_SCHEMES,
        // 相对 URL 交由下面的 img 校验与 a 的协议白名单处理
        allowProtocolRelative: false,
        // script/style 的文本内容一并丢弃，不作为纯文本回显
        nonTextTags: ['script', 'style', 'textarea', 'noscript'],
        transformTags: {
            // target=_blank 必须补 rel，避免被开的新页通过 window.opener 反向操纵本页
            a: (tagName, attribs) => {
                if (attribs.target === '_blank') {
                    return { tagName, attribs: { ...attribs, rel: 'noopener noreferrer' } };
                }
                return { tagName, attribs };
            },
        },
        exclusiveFilter: (frame) => frame.tag === 'img' && !isTrustedImageSrc(frame.attribs.src),
    });
}
