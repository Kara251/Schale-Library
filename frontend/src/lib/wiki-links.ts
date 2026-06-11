/**
 * 正文中的 wiki 式站内链接：[[slug]] 或 [[slug|显示文字]]
 * 在已 sanitize 的 HTML 上做替换（生成的锚点由我们自己控制，安全）。
 */

export interface WikiLinkTarget {
  title: string
  summary?: string
}

const WIKI_LINK_PATTERN = /\[\[([a-zA-Z0-9-_]+)(?:\|([^\]]+))?\]\]/g

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderWikiLinks(
  html: string,
  locale: string,
  resolve: (slug: string) => WikiLinkTarget | undefined
): string {
  return html.replace(WIKI_LINK_PATTERN, (_match, slug: string, text?: string) => {
    const target = resolve(slug)
    const display = escapeHtml(text?.trim() || target?.title || slug)

    if (!target) {
      // 目标不存在：渲染为标注缺失的占位，便于编辑发现
      return `<span class="wiki-link wiki-link-missing" title="${escapeHtml(slug)}">${display}</span>`
    }

    const href = `/${locale}/research-archives/${encodeURIComponent(slug)}`
    const tooltip = target.summary ? ` title="${escapeHtml(target.summary)}"` : ''
    return `<a href="${href}" class="wiki-link"${tooltip}>${display}</a>`
  })
}

/** 提取正文中引用的全部 wiki 链接 slug（用于反向链接等场景） */
export function extractWikiLinkSlugs(body: string | undefined): string[] {
  if (!body) return []
  const slugs = new Set<string>()
  for (const match of body.matchAll(WIKI_LINK_PATTERN)) {
    slugs.add(match[1])
  }
  return Array.from(slugs)
}
