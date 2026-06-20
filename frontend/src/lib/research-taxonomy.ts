/**
 * 考据档案 · 分类法单一事实来源（single source of truth）
 *
 * 每个枚举的「值 + 三语标签」只在此文件定义一次。
 * - 前端渲染标签（`api.ts` 的 researchXxxLabels）从这里派生；
 * - 后台表单选项（`admin-panel.ts` 的 options）也从这里派生。
 *
 * 改一个值/标签只需改这里一处，杜绝以往「4 处各抄一遍、漏一处即 bug」的漂移。
 *
 * 注意：后端 Strapi schema 的 enum 仍是各自独立维护的（跨包无法共享 TS）。
 * 新增/删除枚举值时，务必同步更新对应 schema.json 与后端 research-constants.ts。
 */

import type { Locale } from '@/lib/i18n'

const LOCALES: Locale[] = ['zh-Hans', 'en', 'ja']

export interface TaxonomyTerm<V extends string = string> {
  value: V
  labels: Record<Locale, string>
}

/**
 * 派生「按语言索引的标签表」：Record<locale, Record<value, label>>，供前端渲染用。
 * 外层 key 用 string（而非 Locale 联合），以兼容以 `labels[locale]`（locale 为 string）的调用方。
 */
function toLabelMap<V extends string>(terms: readonly TaxonomyTerm<V>[]): Record<string, Record<V, string>> {
  const out: Record<string, Record<V, string>> = {}
  for (const locale of LOCALES) {
    const row = {} as Record<V, string>
    for (const term of terms) {
      row[term.value] = term.labels[locale]
    }
    out[locale] = row
  }
  return out
}

/** 派生后台表单选项：{ value, label: Record<Locale,string> }[] */
function toOptions<V extends string>(terms: readonly TaxonomyTerm<V>[]): Array<{ value: V; label: Record<Locale, string> }> {
  return terms.map((term) => ({ value: term.value, label: term.labels }))
}

/** 派生纯值列表 */
function toValues<V extends string>(terms: readonly TaxonomyTerm<V>[]): V[] {
  return terms.map((term) => term.value)
}

// ─── 各分类法的权威定义（唯一来源）────────────────────────────────────────────

export const STANCE_TERMS = [
  { value: 'official', labels: { 'zh-Hans': '官方依据', en: 'Official basis', ja: '公式根拠' } },
  { value: 'personal', labels: { 'zh-Hans': '个人推论', en: 'Personal analysis', ja: '個人考察' } },
  { value: 'speculative', labels: { 'zh-Hans': '推测性', en: 'Speculative', ja: '推測的' } },
] as const satisfies readonly TaxonomyTerm[]

export const MEDIA_TYPE_TERMS = [
  { value: 'character', labels: { 'zh-Hans': '角色', en: 'Character', ja: 'キャラクター' } },
  { value: 'story', labels: { 'zh-Hans': '剧情', en: 'Story', ja: 'ストーリー' } },
  { value: 'concept', labels: { 'zh-Hans': '概念', en: 'Concept', ja: '概念' } },
  { value: 'setting', labels: { 'zh-Hans': '设定', en: 'Setting', ja: '設定' } },
  { value: 'organization', labels: { 'zh-Hans': '组织', en: 'Organization', ja: '組織' } },
] as const satisfies readonly TaxonomyTerm[]

export const SOURCE_TYPE_TERMS = [
  { value: 'game_line', labels: { 'zh-Hans': '游戏台词', en: 'Game line', ja: 'ゲーム台詞' } },
  { value: 'interview', labels: { 'zh-Hans': '官方访谈', en: 'Interview', ja: '公式インタビュー' } },
  { value: 'visual', labels: { 'zh-Hans': '视觉证据', en: 'Visual evidence', ja: 'ビジュアル証拠' } },
  { value: 'external', labels: { 'zh-Hans': '外部来源', en: 'External source', ja: '外部ソース' } },
] as const satisfies readonly TaxonomyTerm[]

export const CONFIDENCE_TERMS = [
  { value: 'official', labels: { 'zh-Hans': '官方', en: 'Official', ja: '公式' } },
  { value: 'derived', labels: { 'zh-Hans': '推导', en: 'Derived', ja: '推導' } },
  { value: 'conjecture', labels: { 'zh-Hans': '推测', en: 'Conjecture', ja: '推測' } },
] as const satisfies readonly TaxonomyTerm[]

export const RELATION_TYPE_TERMS = [
  { value: 'related', labels: { 'zh-Hans': '相关', en: 'Related', ja: '関連' } },
  { value: 'prototype', labels: { 'zh-Hans': '原型', en: 'Prototype', ja: '原型・モチーフ' } },
  { value: 'echoes', labels: { 'zh-Hans': '呼应', en: 'Echoes', ja: '呼応' } },
  { value: 'extends', labels: { 'zh-Hans': '补充', en: 'Builds on', ja: '補足' } },
  { value: 'contradicts', labels: { 'zh-Hans': '相左', en: 'Contradicts', ja: '対立' } },
  { value: 'prerequisite', labels: { 'zh-Hans': '前置阅读', en: 'Read first', ja: '前提知識' } },
] as const satisfies readonly TaxonomyTerm[]

export const SUBJECT_TYPE_TERMS = [
  { value: 'school', labels: { 'zh-Hans': '学院', en: 'School', ja: '学園' } },
  { value: 'organization', labels: { 'zh-Hans': '组织', en: 'Organization', ja: '組織' } },
  { value: 'club', labels: { 'zh-Hans': '社团', en: 'Club', ja: '部活' } },
  { value: 'character', labels: { 'zh-Hans': '人物', en: 'Character', ja: '人物' } },
  { value: 'location', labels: { 'zh-Hans': '地点', en: 'Location', ja: '場所' } },
  { value: 'concept', labels: { 'zh-Hans': '概念', en: 'Concept', ja: '概念' } },
  { value: 'item', labels: { 'zh-Hans': '物品', en: 'Item', ja: 'アイテム' } },
] as const satisfies readonly TaxonomyTerm[]

export const REVISION_TYPE_TERMS = [
  { value: 'created', labels: { 'zh-Hans': '建立', en: 'Created', ja: '作成' } },
  { value: 'updated', labels: { 'zh-Hans': '更新', en: 'Updated', ja: '更新' } },
  { value: 'confirmed', labels: { 'zh-Hans': '获官方证实', en: 'Confirmed by canon', ja: '公式で確定' } },
  { value: 'refuted', labels: { 'zh-Hans': '被官方推翻', en: 'Refuted by canon', ja: '公式で否定' } },
] as const satisfies readonly TaxonomyTerm[]

export const DIFFICULTY_TERMS = [
  { value: 'intro', labels: { 'zh-Hans': '入门', en: 'Intro', ja: '入門' } },
  { value: 'deep', labels: { 'zh-Hans': '深入', en: 'Deep dive', ja: '深掘り' } },
  { value: 'expert', labels: { 'zh-Hans': '硬核', en: 'Expert', ja: 'エキスパート' } },
] as const satisfies readonly TaxonomyTerm[]

// ─── 派生：值联合类型 ────────────────────────────────────────────────────────

export type ResearchStance = (typeof STANCE_TERMS)[number]['value']
export type ResearchMediaType = (typeof MEDIA_TYPE_TERMS)[number]['value']
export type CitationSourceType = (typeof SOURCE_TYPE_TERMS)[number]['value']
export type CitationConfidence = (typeof CONFIDENCE_TERMS)[number]['value']
export type ResearchRelationType = (typeof RELATION_TYPE_TERMS)[number]['value']
export type ResearchSubjectType = (typeof SUBJECT_TYPE_TERMS)[number]['value']
export type ResearchRevisionType = (typeof REVISION_TYPE_TERMS)[number]['value']
export type ResearchPathDifficulty = (typeof DIFFICULTY_TERMS)[number]['value']

// ─── 派生：前端渲染标签表 ────────────────────────────────────────────────────

export const researchStanceLabels = toLabelMap(STANCE_TERMS)
export const researchMediaTypeLabels = toLabelMap(MEDIA_TYPE_TERMS)
export const researchSourceTypeLabels = toLabelMap(SOURCE_TYPE_TERMS)
export const researchConfidenceLabels = toLabelMap(CONFIDENCE_TERMS)
export const researchRelationTypeLabels = toLabelMap(RELATION_TYPE_TERMS)
export const researchSubjectTypeLabels = toLabelMap(SUBJECT_TYPE_TERMS)
export const researchRevisionTypeLabels = toLabelMap(REVISION_TYPE_TERMS)
export const researchPathDifficultyLabels = toLabelMap(DIFFICULTY_TERMS)

export const RESEARCH_MEDIA_TYPES = toValues(MEDIA_TYPE_TERMS)

// ─── 派生：后台表单选项 ──────────────────────────────────────────────────────

export const stanceOptions = toOptions(STANCE_TERMS)
export const mediaTypeOptions = toOptions(MEDIA_TYPE_TERMS)
export const sourceTypeOptions = toOptions(SOURCE_TYPE_TERMS)
export const confidenceOptions = toOptions(CONFIDENCE_TERMS)
export const relationTypeOptions = toOptions(RELATION_TYPE_TERMS)
export const subjectTypeOptions = toOptions(SUBJECT_TYPE_TERMS)
export const revisionTypeOptions = toOptions(REVISION_TYPE_TERMS)
export const difficultyOptions = toOptions(DIFFICULTY_TERMS)
