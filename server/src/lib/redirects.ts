/**
 * 301/外跳映射表（D1 redirect_map 行构造；ETL 产出随部署加载）。
 * 规则 5：
 *   /works/<documentId> → 定位到 creator 则 /creators/<slug>，否则回 /creators
 *   /students/<旧documentId> 与 /students/<新slug> → wiki_url（http(s) 外跳），缺省 archive
 * 旧 students 页面实际外链是 documentId（getContentEntryPathId），故两种路径都映射。
 */
import { validateHttpUrl } from './etl'

export type RedirectKind = 'creator' | 'external' | 'archive'

export interface RedirectRow {
  from_path: string
  to_kind: RedirectKind
  to_target: string
}

export function buildWorkRedirect(documentId: string, creatorSlug: string | null): RedirectRow {
  return {
    from_path: `/works/${documentId}`,
    to_kind: 'creator',
    to_target: creatorSlug ? `/creators/${creatorSlug}` : '/creators',
  }
}

export function buildStudentRedirect(
  pathId: string,
  wikiUrl: string | null,
): RedirectRow {
  const target = validateHttpUrl(wikiUrl)
  if (target !== null) {
    return { from_path: `/students/${pathId}`, to_kind: 'external', to_target: target }
  }
  // wiki_url 由编辑者后补；先落 archive，后续重跑 ETL 刷新为 external
  return { from_path: `/students/${pathId}`, to_kind: 'archive', to_target: '' }
}

export interface RedirectInputWork {
  documentId: string
  creatorSlug: string | null
}
export interface RedirectInputStudent {
  documentId: string
  slug: string
  wikiUrl: string | null
}

export function buildRedirectMap(
  works: RedirectInputWork[],
  students: RedirectInputStudent[],
): RedirectRow[] {
  const rows: RedirectRow[] = []
  for (const work of works) rows.push(buildWorkRedirect(work.documentId, work.creatorSlug))
  const seenStudents = new Set<string>()
  for (const student of students) {
    for (const pathId of [student.documentId, student.slug]) {
      if (seenStudents.has(pathId)) continue
      seenStudents.add(pathId)
      rows.push(buildStudentRedirect(pathId, student.wikiUrl))
    }
  }
  return rows.sort((a, b) => (a.from_path < b.from_path ? -1 : a.from_path > b.from_path ? 1 : 0))
}
