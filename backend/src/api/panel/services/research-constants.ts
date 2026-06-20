/**
 * 考据档案 · 后端分类法常量（单一维护点）
 *
 * 这些值必须与对应 Strapi schema 的 enumeration 保持一致：
 *  - related_link.relation_type → src/components/research/related-link.json
 *  - revision.revision_type     → src/components/research/revision.json
 *
 * 前端的同一套分类法定义在 frontend/src/lib/research-taxonomy.ts；
 * 跨包无法直接共享 TS，新增/删除枚举值时三处需同步（schema / 本文件 / 前端 taxonomy）。
 */

export const RELATED_LINK_TYPES = [
  'related',
  'prototype',
  'echoes',
  'extends',
  'contradicts',
  'prerequisite',
] as const

export const REVISION_TYPES = [
  'created',
  'updated',
  'confirmed',
  'refuted',
] as const

export const RELATED_LINK_TYPE_SET = new Set<string>(RELATED_LINK_TYPES)
export const REVISION_TYPE_SET = new Set<string>(REVISION_TYPES)
