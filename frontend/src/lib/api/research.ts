/**
 * 考据域（Research Archives）：条目、主题、对象、阅读路径、反向链接与引用反查。
 */

import {
  createCollectionQuery,
  fetchAPI,
  fetchLocalizedCollectionWithFallback,
  fetchLocalizedSingleBySlug,
  toStrapiLocale,
} from './core';
import type {
  SpoilerTier,
  StrapiMedia,
  StrapiResponse,
  Student,
} from './types';

// 分类法的值类型与三语标签统一来自 research-taxonomy.ts（单一事实来源）
export type {
  ResearchStance,
  ResearchMediaType,
  CitationSourceType,
  CitationConfidence,
  ResearchRelationType,
  ResearchSubjectType,
  ResearchRevisionType,
  ResearchPathDifficulty,
} from '../research-taxonomy';
export {
  researchStanceLabels,
  researchMediaTypeLabels,
  researchSourceTypeLabels,
  researchConfidenceLabels,
  researchRelationTypeLabels,
  researchSubjectTypeLabels,
  researchRevisionTypeLabels,
  researchPathDifficultyLabels,
  RESEARCH_MEDIA_TYPES,
} from '../research-taxonomy';
import type {
  ResearchStance,
  ResearchMediaType,
  CitationSourceType,
  CitationConfidence,
  ResearchRelationType,
  ResearchSubjectType,
  ResearchRevisionType,
  ResearchPathDifficulty,
} from '../research-taxonomy';

export interface ResearchTheme {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  curated_intro?: string;
  locale: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface ResearchCitation {
  id: number;
  documentId: string;
  claim_short: string;
  source_type: CitationSourceType;
  source_ref?: string;
  source_image?: StrapiMedia;
  source_quote?: string;
  confidence: CitationConfidence;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface ResearchRelatedLink {
  id: number;
  target_entry?: Pick<ResearchEntry, 'id' | 'documentId' | 'title' | 'slug'>;
  relation_type?: ResearchRelationType;
  curate_note?: string;
  order: number;
}

export interface ResearchRevision {
  id: number;
  date: string;
  revision_type: ResearchRevisionType;
  note?: string;
}

export interface ResearchSubject {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  subject_type: ResearchSubjectType;
  description?: string;
  cover?: StrapiMedia;
  students?: Student[];
  entries?: ResearchEntry[];
  locale: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface ResearchPath {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  description?: string;
  difficulty?: ResearchPathDifficulty;
  order: number;
  steps?: ResearchPathStep[];
  locale: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface ResearchEntry {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  stance: ResearchStance;
  summary?: string;
  body?: string;
  media_type: ResearchMediaType;
  spoiler_tier?: Pick<SpoilerTier, 'id' | 'documentId' | 'name' | 'key'> | null;
  themes?: ResearchTheme[];
  citations?: ResearchCitation[];
  subjects?: Pick<ResearchSubject, 'id' | 'documentId' | 'name' | 'slug' | 'subject_type'>[];
  related_links?: ResearchRelatedLink[];
  revisions?: ResearchRevision[];
  locale: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface ResearchPathStep {
  id: number;
  entry?: Pick<ResearchEntry, 'id' | 'documentId' | 'title' | 'slug'> & { summary?: string };
  step_note?: string;
}

export interface ResearchCuratorData {
  featured_entry?: ResearchEntry;
  pick_note?: string;
  path_description?: string;
  path_steps?: ResearchPathStep[];
}

const RESEARCH_ENTRY_LIST_POPULATE = {
  'populate[themes]': true,
  'populate[subjects]': true,
  'populate[spoiler_tier]': true,
} as const;

const RESEARCH_ENTRY_DETAIL_POPULATE = {
  'populate[themes]': true,
  'populate[subjects]': true,
  'populate[spoiler_tier]': true,
  'populate[citations][populate][source_image]': true,
  'populate[related_links][populate][target_entry]': true,
  'populate[revisions]': true,
} as const;

export async function getResearchEntries(locale: string = 'zh-Hans') {
  const strapiLocale = toStrapiLocale(locale);
  return fetchAPI<StrapiResponse<ResearchEntry[]>>(
    `/research-entries?${createCollectionQuery({
      locale: strapiLocale,
      sort: 'updatedAt:desc',
      'pagination[pageSize]': 100,
      ...RESEARCH_ENTRY_LIST_POPULATE,
    })}`
  );
}

export async function getResearchEntryBySlug(slug: string, locale: string = 'zh-Hans') {
  const strapiLocale = toStrapiLocale(locale);
  const response = await fetchAPI<StrapiResponse<ResearchEntry[]>>(
    `/research-entries?${createCollectionQuery({
      locale: strapiLocale,
      'filters[slug][$eq]': slug,
      ...RESEARCH_ENTRY_DETAIL_POPULATE,
    })}`
  );
  return {
    data: response.data?.[0] || null,
    meta: {},
  } as { data: ResearchEntry | null; meta: Record<string, never> };
}

export async function getResearchThemes(locale: string = 'zh-Hans') {
  const strapiLocale = toStrapiLocale(locale);
  return fetchAPI<StrapiResponse<ResearchTheme[]>>(
    `/research-themes?${createCollectionQuery({
      locale: strapiLocale,
      sort: 'name:asc',
      'pagination[pageSize]': 100,
    })}`
  );
}

export async function getResearchCurator(locale: string = 'zh-Hans') {
  const strapiLocale = toStrapiLocale(locale);
  try {
    return await fetchAPI<{ data: ResearchCuratorData }>(
      `/research-curator?${createCollectionQuery({
        locale: strapiLocale,
        'populate[featured_entry][populate][themes]': true,
        'populate[path_steps][populate][entry]': true,
      })}`
    );
  } catch {
    return { data: null };
  }
}

export async function getResearchThemeBySlug(slug: string, locale: string = 'zh-Hans') {
  return fetchLocalizedSingleBySlug<ResearchTheme>('research-themes', slug, locale);
}

export async function getResearchEntriesByThemeSlug(themeSlug: string, locale: string = 'zh-Hans') {
  return fetchLocalizedCollectionWithFallback<ResearchEntry>('research-entries', locale, {
      'filters[themes][slug][$eq]': themeSlug,
      sort: 'updatedAt:desc',
      'pagination[pageSize]': 100,
      ...RESEARCH_ENTRY_LIST_POPULATE,
    });
}

export async function getRecentResearchEntries(locale: string = 'zh-Hans', limit = 3) {
  const strapiLocale = toStrapiLocale(locale);
  return fetchAPI<StrapiResponse<ResearchEntry[]>>(
    `/research-entries?${createCollectionQuery({
      locale: strapiLocale,
      sort: 'updatedAt:desc',
      'pagination[pageSize]': limit,
      ...RESEARCH_ENTRY_LIST_POPULATE,
    })}`
  );
}

// ── 考据对象（实体枢纽）──

export async function getResearchSubjects(locale: string = 'zh-Hans') {
  const strapiLocale = toStrapiLocale(locale);
  return fetchAPI<StrapiResponse<ResearchSubject[]>>(
    `/research-subjects?${createCollectionQuery({
      locale: strapiLocale,
      sort: 'name:asc',
      'pagination[pageSize]': 100,
      'populate[cover]': true,
    })}`
  );
}

export async function getResearchSubjectBySlug(slug: string, locale: string = 'zh-Hans') {
  return fetchLocalizedSingleBySlug<ResearchSubject>('research-subjects', slug, locale, {
    'populate[cover]': true,
    'populate[students][populate][avatar]': true,
  });
}

export async function getResearchEntriesBySubjectSlug(subjectSlug: string, locale: string = 'zh-Hans') {
  return fetchLocalizedCollectionWithFallback<ResearchEntry>('research-entries', locale, {
      'filters[subjects][slug][$eq]': subjectSlug,
      sort: 'updatedAt:desc',
      'pagination[pageSize]': 100,
      ...RESEARCH_ENTRY_LIST_POPULATE,
    });
}

/** 学生详情页用：找出关联了该学生的考据对象（及其条目数所需的最小字段） */
export async function getResearchSubjectsByStudent(
  student: Pick<Student, 'id' | 'documentId'>,
  locale: string = 'zh-Hans'
) {
  const strapiLocale = toStrapiLocale(locale);
  return fetchAPI<StrapiResponse<ResearchSubject[]>>(
    `/research-subjects?${createCollectionQuery({
      locale: strapiLocale,
      'filters[$or][0][students][id][$eq]': student.id,
      'filters[$or][1][students][documentId][$eq]': student.documentId,
      sort: 'name:asc',
      'pagination[pageSize]': 50,
      'populate[entries][fields][0]': 'title',
      'populate[entries][fields][1]': 'slug',
    })}`
  );
}

// ── 阅读路径 ──

const RESEARCH_PATH_POPULATE = {
  'populate[steps][populate][entry][fields][0]': 'title',
  'populate[steps][populate][entry][fields][1]': 'slug',
  'populate[steps][populate][entry][fields][2]': 'summary',
} as const;

export async function getResearchPaths(locale: string = 'zh-Hans') {
  const strapiLocale = toStrapiLocale(locale);
  return fetchAPI<StrapiResponse<ResearchPath[]>>(
    `/research-paths?${createCollectionQuery({
      locale: strapiLocale,
      'sort[0]': 'order:asc',
      'sort[1]': 'updatedAt:desc',
      'pagination[pageSize]': 50,
      ...RESEARCH_PATH_POPULATE,
    })}`
  );
}

export async function getResearchPathBySlug(slug: string, locale: string = 'zh-Hans') {
  return fetchLocalizedSingleBySlug<ResearchPath>('research-paths', slug, locale, {
    ...RESEARCH_PATH_POPULATE,
  });
}

/** 条目详情页用：找出包含该条目的所有阅读路径（用于上一篇/下一篇导航） */
export async function getResearchPathsContainingEntry(entrySlug: string, locale: string = 'zh-Hans') {
  const strapiLocale = toStrapiLocale(locale);
  return fetchAPI<StrapiResponse<ResearchPath[]>>(
    `/research-paths?${createCollectionQuery({
      locale: strapiLocale,
      'filters[steps][entry][slug][$eq]': entrySlug,
      'sort[0]': 'order:asc',
      'pagination[pageSize]': 20,
      ...RESEARCH_PATH_POPULATE,
    })}`
  );
}

/** 知识图谱数据：条目（含主题/对象/条目间链接） */
export async function getResearchGraphEntries(locale: string = 'zh-Hans') {
  const strapiLocale = toStrapiLocale(locale);
  return fetchAPI<StrapiResponse<ResearchEntry[]>>(
    `/research-entries?${createCollectionQuery({
      locale: strapiLocale,
      sort: 'updatedAt:desc',
      'pagination[pageSize]': 200,
      'fields[0]': 'title',
      'fields[1]': 'slug',
      'fields[2]': 'media_type',
      'fields[3]': 'body',
      'populate[themes][fields][0]': 'name',
      'populate[themes][fields][1]': 'slug',
      'populate[subjects][fields][0]': 'name',
      'populate[subjects][fields][1]': 'slug',
      'populate[related_links][populate][target_entry][fields][0]': 'slug',
    })}`
  );
}

// ── 反向链接 ──

/**
 * 反向链接：链接到指定条目的其他条目。
 * 同时覆盖结构化的 related_links 与正文中的 [[wiki链接]]。
 */
export async function getResearchBacklinks(entrySlug: string, locale: string = 'zh-Hans') {
  const strapiLocale = toStrapiLocale(locale);
  return fetchAPI<StrapiResponse<ResearchEntry[]>>(
    `/research-entries?${createCollectionQuery({
      locale: strapiLocale,
      'filters[$or][0][related_links][target_entry][slug][$eq]': entrySlug,
      'filters[$or][1][body][$contains]': `[[${entrySlug}`,
      'filters[slug][$ne]': entrySlug,
      sort: 'updatedAt:desc',
      'pagination[pageSize]': 50,
      'populate[related_links][populate][target_entry][fields][0]': 'slug',
    })}`
  );
}

/**
 * 引用源反查：除当前条目外，还有哪些条目引用了这些引证。
 * 返回带最小 citations 字段的条目列表，由调用方按 citation 分组。
 */
export async function getEntriesSharingCitations(
  citationIds: number[],
  excludeEntrySlug: string,
  locale: string = 'zh-Hans'
) {
  if (citationIds.length === 0) {
    return { data: [] as ResearchEntry[], meta: {} };
  }
  const strapiLocale = toStrapiLocale(locale);
  const params: Record<string, string | number | boolean | undefined> = {
    locale: strapiLocale,
    'filters[slug][$ne]': excludeEntrySlug,
    sort: 'updatedAt:desc',
    'pagination[pageSize]': 50,
    'populate[citations][fields][0]': 'id',
  };
  citationIds.forEach((id, index) => {
    params[`filters[citations][id][$in][${index}]`] = id;
  });
  return fetchAPI<StrapiResponse<ResearchEntry[]>>(
    `/research-entries?${createCollectionQuery(params)}`
  );
}
