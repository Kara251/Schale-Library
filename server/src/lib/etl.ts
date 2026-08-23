/**
 * ETL 纯转换层（无 IO；Node 24 直接跑、Workers 内亦可测）。
 * 规则来源：docs/working/plan-2026-08-audit-remediation.md「三、创作者优先内容模型」。
 *
 * - 规则 1：locale 行合并为 i18n JSON 列（仅真 localized 字段参与；单 locale CT 行 locale=null）
 * - 规则 2：bilibili_subscriptions.uid → creators(platform='bilibili', platform_uid)；
 *   work.author 字符串精确归并到同名 creator（大小写/首尾空白 normalize 后比对），
 *   无法归并 → 建 needs_review=1 占位创作者；work 的 title/cover/link → representative_works
 * - 规则 3：students 瘦身（name 单列、弃 bio/works、wiki_url=NULL 待编辑者补录、
 *   school 枚举 → school slug 回填）
 * - 规则 4：online/offline_event → events(kind) + event_locations
 * - 规则 6：documentId 全程保持不变（旧外链不破）；新建实体用确定性合成 ID
 */

export const KNOWN_LOCALES = ['zh-Hans', 'en', 'ja'] as const

/** 导出阶段的最小公共形状：一个文档的全部 locale 变体行 */
export interface LocaleVariant {
  locale: string | null
  data: Record<string, unknown>
}
export interface ExportedDoc {
  documentId: string
  variants: LocaleVariant[]
}

export interface Timestamps {
  createdAt: number
  updatedAt: number
  publishedAt: number | null
}

// ---------- 基础取值工具 ----------

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function strOf(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function numOf(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function boolOf(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (value === 1 || value === 'true') return true
  if (value === 0 || value === 'false') return false
  return fallback
}

export function isoToMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const ms = Date.parse(value)
    return Number.isNaN(ms) ? null : ms
  }
  return null
}

function localeRank(locale: string | null): number {
  if (locale === 'zh-Hans') return 0
  if (locale === 'en') return 1
  if (locale === 'ja') return 2
  return 3
}

// ---------- 规则 1：文档分组与 locale 合并 ----------

/** 导出行（每 locale 一行的扁平记录）分组为文档 */
export function groupRows(
  rows: Array<Record<string, unknown>>,
  idKey = 'documentId',
): ExportedDoc[] {
  const byId = new Map<string, ExportedDoc>()
  for (const row of rows) {
    const documentId = strOf(row[idKey])
    if (!documentId) continue
    let doc = byId.get(documentId)
    if (!doc) {
      doc = { documentId, variants: [] }
      byId.set(documentId, doc)
    }
    const data: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(row)) {
      if (k !== idKey && k !== 'locale') data[k] = v
    }
    doc.variants.push({ locale: strOf(row.locale), data })
  }
  return Array.from(byId.values())
}

/** 基准变体：zh-Hans → en → ja → 首个 */
export function pickBase(doc: ExportedDoc): LocaleVariant {
  let best = doc.variants[0]
  for (const variant of doc.variants.slice(1)) {
    if (localeRank(variant.locale) < localeRank(best.locale)) best = variant
  }
  return best
}

/**
 * 合并 localized 字段为 i18n JSON 列文本。
 * 空（null/''）值不进对象；键序 zh-Hans → en → ja → 其余。全空返回 null。
 */
export function mergeI18nField(doc: ExportedDoc, field: string): string | null {
  const ordered = doc.variants.slice().sort((a, b) => localeRank(a.locale) - localeRank(b.locale))
  const merged: Record<string, string> = {}
  for (const variant of ordered) {
    const value = strOf(variant.data[field])
    if (value === null) continue
    const key = variant.locale ?? 'zh-Hans'
    if (merged[key] === undefined) merged[key] = value
  }
  const keys = Object.keys(merged)
  if (keys.length === 0) return null
  const orderedKeys = [
    ...KNOWN_LOCALES.filter((l) => l in merged),
    ...keys.filter((k) => !(KNOWN_LOCALES as readonly string[]).includes(k)),
  ]
  const out: Record<string, string> = {}
  for (const k of orderedKeys) out[k] = merged[k]
  return JSON.stringify(out)
}

/** 标量字段：取基准变体 */
export function scalarField(doc: ExportedDoc, field: string): unknown {
  return pickBase(doc).data[field]
}

/** 时间戳：以基准行为准；publishedAt 缺失即草稿（NULL 语义保真） */
export function docTimestamps(doc: ExportedDoc): Timestamps {
  const base = pickBase(doc).data
  return {
    createdAt: isoToMs(base.createdAt) ?? 0,
    updatedAt: isoToMs(base.updatedAt) ?? isoToMs(base.createdAt) ?? 0,
    publishedAt: isoToMs(base.publishedAt),
  }
}

/** 非 localized 标量的安全读取 */
export function strField(doc: ExportedDoc, field: string): string | null {
  return strOf(scalarField(doc, field))
}
export function numField(doc: ExportedDoc, field: string): number | null {
  return numOf(scalarField(doc, field))
}
export function boolField(doc: ExportedDoc, field: string, fallback = false): boolean {
  return boolOf(scalarField(doc, field), fallback)
}

// ---------- 共用工具 ----------

/** S1 渲染校验原则：入库 URL 必须是 http(s) 绝对地址 */
export function validateHttpUrl(value: unknown): string | null {
  const raw = strOf(value)
  if (!raw) return null
  try {
    const parsed = new URL(raw)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null
  } catch {
    return null
  }
}

/** slug 生成：保留 CJK/字母/数字，空白与不安全字符折叠为 '-' */
export function slugify(raw: unknown): string {
  const cleaned = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}._~-]+/gu, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
  return cleaned.length > 0 ? cleaned : 'x'
}

/** author 归并键：首尾空白去除 + 内部空白折叠 + 小写（Main 已批准的 normalize 口径） */
export function normalizeAuthorKey(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

class SlugRegistry {
  private readonly taken = new Set<string>()
  unique(base: string): string {
    const root = slugify(base)
    if (!this.taken.has(root)) {
      this.taken.add(root)
      return root
    }
    for (let n = 2; ; n++) {
      const candidate = `${root}-${n}`
      if (!this.taken.has(candidate)) {
        this.taken.add(candidate)
        return candidate
      }
    }
  }
}

// ---------- 规则 2：creators + representative_works ----------

export interface CreatorSeed {
  documentId: string
  slug: string
  name: string
  avatarUrl: string | null
  bioJson: string | null
  platform: string
  platformUid: string | null
  homepageUrl: string | null
  isFeatured: 0 | 1
  featuredPriority: number
  needsReview: 0 | 1
  createdAt: number
  updatedAt: number
  publishedAt: number | null
}

export interface RepresentativeWorkSeed {
  creatorSlug: string
  sortOrder: number
  title: string
  url: string
  coverUrl: string | null
  noteJson: string | null
}

export interface CreatorStudentLink {
  creatorSlug: string
  studentDocumentId: string
}

export interface CreatorBuildResult {
  creators: CreatorSeed[]
  representativeWorks: RepresentativeWorkSeed[]
  creatorStudents: CreatorStudentLink[]
  /** 每个 work 的归并去向：documentId → creator slug；null = 无处可去（redirect 回 /creators） */
  workAuthorSlugs: Map<string, string | null>
  /** 无法归并且确实有 author 的名字清单（质检可见） */
  unmatchedAuthors: string[]
  /** 有归并对象但 link/sourceUrl 均非 http(s)，rep-work 行被丢弃的个数 */
  skippedRepWorks: number
  /** 未发布 work 不产出 rep-work 的个数 */
  draftSkipped: number
}

export function buildCreators(
  subscriptions: ExportedDoc[],
  works: ExportedDoc[],
): CreatorBuildResult {
  const registry = new SlugRegistry()
  const creators: CreatorSeed[] = []
  const byKey = new Map<string, CreatorSeed>()

  for (const sub of subscriptions) {
    const uid = strField(sub, 'uid')
    if (!uid) continue
    const name = (strField(sub, 'upName') ?? uid).trim()
    const ts = docTimestamps(sub)
    const creator: CreatorSeed = {
      documentId: `cr-bilibili-${uid}`,
      slug: registry.unique(name),
      name,
      avatarUrl: null,
      bioJson: null,
      platform: 'bilibili',
      platformUid: uid,
      homepageUrl: `https://space.bilibili.com/${encodeURIComponent(uid)}`,
      isFeatured: 0,
      featuredPriority: 0,
      needsReview: 0,
      createdAt: ts.createdAt,
      updatedAt: ts.updatedAt,
      publishedAt: ts.updatedAt,
    }
    creators.push(creator)
    byKey.set(normalizeAuthorKey(name), creator)
  }

  const representativeWorks: RepresentativeWorkSeed[] = []
  const creatorStudents: CreatorStudentLink[] = []
  const linkedStudents = new Set<string>()
  const workAuthorSlugs = new Map<string, string | null>()
  const unmatchedAuthors: string[] = []
  const placeholderByName = new Map<string, CreatorSeed>()
  let skippedRepWorks = 0
  let draftSkipped = 0

  for (const work of works) {
    // author 是 localized 字段，但语义上是同一人：收集所有变体的归并候选
    const candidates: string[] = []
    for (const variant of work.variants) {
      const key = normalizeAuthorKey(variant.data.author)
      if (key !== '' && !candidates.includes(key)) candidates.push(key)
    }

    let creator: CreatorSeed | undefined
    for (const key of candidates) {
      creator = byKey.get(key)
      if (creator) break
    }

    if (!creator && candidates.length > 0) {
      const displayName = (strOf(work.variants.map((v) => v.data.author).find((a) => strOf(a))) ?? '').trim()
      const cached = placeholderByName.get(candidates[0])
      if (cached) {
        creator = cached
      } else {
        const ts = docTimestamps(work)
        creator = {
          documentId: `cr-placeholder-${registry.unique(displayName)}`,
          slug: registry.unique(displayName),
          name: displayName,
          avatarUrl: null,
          bioJson: null,
          platform: 'unknown',
          platformUid: null,
          homepageUrl: null,
          isFeatured: 0,
          featuredPriority: 0,
          needsReview: 1,
          createdAt: ts.createdAt,
          updatedAt: ts.updatedAt,
          publishedAt: ts.updatedAt,
        }
        creators.push(creator)
        byKey.set(candidates[0], creator)
        placeholderByName.set(candidates[0], creator)
        unmatchedAuthors.push(displayName)
      }
    }

    workAuthorSlugs.set(work.documentId, creator ? creator.slug : null)
    if (!creator) continue

    const ts = docTimestamps(work)
    const isDraft = ts.publishedAt === null
    const url = validateHttpUrl(strField(work, 'link')) ?? validateHttpUrl(strField(work, 'sourceUrl'))
    if (isDraft || url === null) {
      if (isDraft) draftSkipped++
      else skippedRepWorks++
    } else {
      const title =
        strField(work, 'title') ??
        strOf(work.variants.map((v) => v.data.title).find((t) => strOf(t)))
      if (title !== null) {
        representativeWorks.push({
          creatorSlug: creator.slug,
          sortOrder: representativeWorks.length,
          title,
          url,
          coverUrl: validateHttpUrl(strField(work, 'coverImageUrl')),
          noteJson: mergeI18nField(work, 'description'),
        })
      }
    }

    const studentRefs = scalarField(work, 'students')
    if (Array.isArray(studentRefs)) {
      for (const ref of studentRefs) {
        const studentDocumentId = strOf(ref)
        if (!studentDocumentId || linkedStudents.has(`${creator.slug}:${studentDocumentId}`)) continue
        linkedStudents.add(`${creator.slug}:${studentDocumentId}`)
        creatorStudents.push({ creatorSlug: creator.slug, studentDocumentId })
      }
    }
  }

  return {
    creators,
    representativeWorks,
    creatorStudents,
    workAuthorSlugs,
    unmatchedAuthors,
    skippedRepWorks,
    draftSkipped,
  }
}

// ---------- 规则 3：students 瘦身 + schools 平移 ----------

/** 旧 school 枚举 → schools.slug（与 backend/src/index.ts SCHOOL_SEEDS 对齐；现值恒等） */
export const SCHOOL_ENUM_TO_SLUG: Readonly<Record<string, string>> = {
  abydos: 'abydos',
  gehenna: 'gehenna',
  millennium: 'millennium',
  trinity: 'trinity',
  hyakkiyako: 'hyakkiyako',
  shanhaijing: 'shanhaijing',
  redwinter: 'redwinter',
  valkyrie: 'valkyrie',
  arius: 'arius',
  srt: 'srt',
  tokiwadai: 'tokiwadai',
  kronos: 'kronos',
  other: 'other',
}

export interface StudentSeed {
  documentId: string
  slug: string
  name: string
  avatarUrl: string | null
  organization: string | null
  wikiUrl: string | null
  schoolSlug: string | null
  createdAt: number
  updatedAt: number
  publishedAt: number | null
}

export function buildStudents(
  students: ExportedDoc[],
): { students: StudentSeed[]; unknownSchoolEnums: string[] } {
  const registry = new SlugRegistry()
  const out: StudentSeed[] = []
  const unknownSchoolEnums: string[] = []
  for (const doc of students) {
    const name = strField(doc, 'name')
    if (name === null) continue
    const enumValue = strField(doc, 'schoolEnum') ?? strField(doc, 'school')
    const refSlug = strField(doc, 'schoolRefSlug')
    let schoolSlug: string | null = null
    if (refSlug !== null) {
      schoolSlug = refSlug
    } else if (enumValue !== null) {
      schoolSlug = SCHOOL_ENUM_TO_SLUG[enumValue] ?? null
      if (schoolSlug === null) unknownSchoolEnums.push(enumValue)
    }
    const ts = docTimestamps(doc)
    out.push({
      documentId: doc.documentId,
      slug: registry.unique(name),
      name,
      avatarUrl: null,
      organization: strField(doc, 'organization'),
      wikiUrl: null,
      schoolSlug,
      createdAt: ts.createdAt,
      updatedAt: ts.updatedAt,
      publishedAt: ts.publishedAt,
    })
  }
  return { students: out, unknownSchoolEnums }
}

export interface SchoolSeed {
  documentId: string
  slug: string
  nameJson: string | null
  descriptionJson: string | null
  shortNameJson: string | null
  color: string | null
  logoUrl: string | null
  sortOrder: number
  createdAt: number
  updatedAt: number
  publishedAt: number | null
}

export function buildSchools(schools: ExportedDoc[]): SchoolSeed[] {
  const out: SchoolSeed[] = []
  for (const doc of schools) {
    const ts = docTimestamps(doc)
    out.push({
      documentId: doc.documentId,
      slug: strField(doc, 'slug') ?? slugify(strField(doc, 'name')),
      nameJson: mergeI18nField(doc, 'name'),
      descriptionJson: mergeI18nField(doc, 'description'),
      shortNameJson: mergeI18nField(doc, 'short_name') ?? mergeI18nField(doc, 'shortName'),
      color: strField(doc, 'color'),
      logoUrl: null,
      sortOrder: numField(doc, 'order') ?? numField(doc, 'sort_order') ?? numField(doc, 'sortOrder') ?? 0,
      // draftAndPublish:false 的 CT 无 publishedAt 列 → 以更新时间作为已发布时间
      createdAt: ts.createdAt,
      updatedAt: ts.updatedAt,
      publishedAt: ts.publishedAt ?? ts.updatedAt,
    })
  }
  return out
}

// ---------- 规则 4：online/offline_event → events(kind) + event_locations ----------

export interface EventSeed {
  documentId: string
  kind: 'online' | 'offline'
  titleJson: string | null
  descriptionJson: string | null
  nature: 'official' | 'fanmade'
  eventFormat: string | null
  statusOverride: string | null
  startTime: number | null
  endTime: number | null
  link: string | null
  coverImageUrl: string | null
  organizer: string | null
  organizerVerified: 0 | 1
  sourcePlatform: string | null
  sourceUrl: string | null
  lastVerifiedAt: number | null
  tagsJson: string | null
  guestsJson: string | null
  ticketPriceTextJson: string | null
  priceMin: number | null
  priceMax: number | null
  currency: string | null
  ticketStatus: string | null
  ticketUrl: string | null
  createdAt: number
  updatedAt: number
  publishedAt: number | null
}

export interface EventLocationSeed {
  eventDocumentId: string
  country: string | null
  region: string | null
  city: string | null
  venue: string | null
  address: string | null
  locationNote: string | null
  mapUrl: string | null
}

function splitTags(value: string | null): string | null {
  if (value === null) return null
  const tags = value
    .split(/[,，、\n]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
  return tags.length > 0 ? JSON.stringify(tags) : null
}

function buildEvent(doc: ExportedDoc, kind: 'online' | 'offline'): EventSeed {
  const ts = docTimestamps(doc)
  const nature = strField(doc, 'nature')
  return {
    documentId: doc.documentId,
    kind,
    titleJson: mergeI18nField(doc, 'title'),
    descriptionJson: mergeI18nField(doc, 'description'),
    nature: nature === 'fanmade' ? 'fanmade' : 'official',
    eventFormat: strField(doc, 'eventFormat'),
    statusOverride: strField(doc, 'statusOverride'),
    startTime: isoToMs(scalarField(doc, 'startTime')),
    endTime: isoToMs(scalarField(doc, 'endTime')),
    link: validateHttpUrl(strField(doc, 'link')),
    coverImageUrl: null,
    organizer: strField(doc, 'organizer'),
    organizerVerified: boolField(doc, 'organizerVerified') ? 1 : 0,
    sourcePlatform: strField(doc, 'sourcePlatform'),
    sourceUrl: validateHttpUrl(strField(doc, 'sourceUrl')),
    lastVerifiedAt: isoToMs(scalarField(doc, 'lastVerifiedAt')),
    tagsJson: splitTags(strField(doc, 'tags')),
    guestsJson: splitTags(strField(doc, 'guests')),
    ticketPriceTextJson: mergeI18nField(doc, 'ticketPriceText'),
    priceMin: numField(doc, 'priceMin'),
    priceMax: numField(doc, 'priceMax'),
    currency: strField(doc, 'currency'),
    ticketStatus: strField(doc, 'ticketStatus'),
    ticketUrl: validateHttpUrl(strField(doc, 'ticketUrl')),
    createdAt: ts.createdAt,
    updatedAt: ts.updatedAt,
    publishedAt: ts.publishedAt,
  }
}

export function buildEvents(
  online: ExportedDoc[],
  offline: ExportedDoc[],
): { events: EventSeed[]; locations: EventLocationSeed[] } {
  const events = [
    ...online.map((doc) => buildEvent(doc, 'online')),
    ...offline.map((doc) => buildEvent(doc, 'offline')),
  ]
  const locations = offline.map((doc): EventLocationSeed => ({
    eventDocumentId: doc.documentId,
    country: strField(doc, 'country'),
    region: strField(doc, 'region'),
    city: strField(doc, 'city'),
    venue: strField(doc, 'venue'),
    address: strField(doc, 'address'),
    locationNote: strField(doc, 'location'),
    mapUrl: validateHttpUrl(strField(doc, 'mapUrl')),
  }))
  return { events, locations }
}

// ---------- 旧 works 平移（0002_works.sql，W5 切换日前仍在服役）----------

export interface WorkRowSeed {
  documentId: string
  title: string | null
  author: string | null
  description: string | null
  coverImageUrl: string | null
  coverImageUrlExternal: string | null
  nature: 'official' | 'fanmade'
  workType: string
  link: string | null
  sourcePlatform: string | null
  sourceUrl: string | null
  sourceId: string | null
  isFeatured: boolean
  featuredPriority: number
  featuredReason: string | null
  featuredUntil: number | null
  isActive: boolean
  isAutoImported: boolean
  importedAt: number | null
  originalPublishDate: string | null
  createdAt: number
  updatedAt: number
  publishedAt: number | null
}

export function buildWorkRows(
  works: ExportedDoc[],
): {
  rows: WorkRowSeed[]
  studentLinks: Array<{ workDocumentId: string; studentDocumentId: string }>
} {
  const rows: WorkRowSeed[] = []
  const studentLinks: Array<{ workDocumentId: string; studentDocumentId: string }> = []
  for (const doc of works) {
    const ts = docTimestamps(doc)
    const title = strField(doc, 'title')
    if (title === null) continue
    const nature = strField(doc, 'nature')
    const workType = strField(doc, 'workType')
    rows.push({
      documentId: doc.documentId,
      title,
      author: strField(doc, 'author'),
      description: strField(doc, 'description'),
      // Cloudinary 封面媒体随 D4/R2 迁移另行处理；此处仅保留外链封面
      coverImageUrl: null,
      coverImageUrlExternal: validateHttpUrl(strField(doc, 'coverImageUrl')),
      nature: nature === 'official' ? 'official' : 'fanmade',
      workType: workType ?? 'other',
      link: strField(doc, 'link'),
      sourcePlatform: strField(doc, 'sourcePlatform'),
      sourceUrl: strField(doc, 'sourceUrl'),
      sourceId: strField(doc, 'sourceId'),
      isFeatured: boolField(doc, 'isFeatured'),
      featuredPriority: numField(doc, 'featuredPriority') ?? 0,
      featuredReason: strField(doc, 'featuredReason'),
      featuredUntil: isoToMs(scalarField(doc, 'featuredUntil')),
      isActive: boolField(doc, 'isActive', true),
      isAutoImported: boolField(doc, 'isAutoImported'),
      importedAt: isoToMs(scalarField(doc, 'importedAt')),
      originalPublishDate: strField(doc, 'originalPublishDate'),
      createdAt: ts.createdAt,
      updatedAt: ts.updatedAt,
      publishedAt: ts.publishedAt,
    })
    const refs = scalarField(doc, 'students')
    if (Array.isArray(refs)) {
      for (const ref of refs) {
        const studentDocumentId = strOf(ref)
        if (studentDocumentId) studentLinks.push({ workDocumentId: doc.documentId, studentDocumentId })
      }
    }
  }
  return { rows, studentLinks }
}
