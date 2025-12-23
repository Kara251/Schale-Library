/**
 * HTML 消毒工具
 * 用于防止 XSS 跨站脚本攻击
 */

import DOMPurify from 'isomorphic-dompurify';

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
 */
const ALLOWED_ATTR = [
    'href', 'target', 'rel',
    'src', 'alt', 'width', 'height',
    'class', 'style',
];

/**
 * 消毒 HTML 内容，移除潜在的恶意脚本
 * @param dirty 未经处理的原始 HTML 字符串
 * @returns 经过消毒的安全 HTML 字符串
 */
export function sanitizeHtml(dirty: string | undefined | null): string {
    if (!dirty) return '';

    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
        // 只允许安全的 URL 协议
        ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    });
}
