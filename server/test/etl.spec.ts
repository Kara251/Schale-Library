/**
 * ETL 测试：fixture → transform（build* 纯函数 + buildStatements）→ D1 载入对拍。
 * 验收点：locale 合并、author 归并（含占位创作者）、redirect map 生成、documentId 不变。
 * D1 侧用 @cloudflare/vitest-pool-workers 本地库，先执行 0001_baseline.sql 建表。
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { env } from 'cloudflare:test'

import { applyBaseline, applyMigration, readFixtures, resetAllContent, type FixtureSet } from './helpers'
import {
  buildCreators,
  buildEvents,
  buildSchools,
  buildStudents,
  buildWorkRows,
  groupRows,
  mergeI18nField,
  slugify,
  validateHttpUrl,
  normalizeAuthorKey,
} from '../src/lib/etl'
import type { CreatorBuildResult, ExportedDoc } from '../src/lib/etl'
import { buildRedirectMap, buildStudentRedirect } from '../src/lib/redirects'
import { buildStatements } from '../scripts/load-d1'

const asDocs = (rows: unknown): ExportedDoc[] => groupRows(rows as Array<Record<string, unknown>>)


let fixtures: FixtureSet

beforeAll(async () => {
  await applyBaseline(env.DB)
  await applyMigration(env.DB, 'migrations/0002_works.sql')
  fixtures = await readFixtures()
})

// ---------- 规则 1：locale 合并 ----------

describe('locale 合并（i18n JSON 列）', () => {
  it('三语合并进一个对象；空值不产生键；键序 zh-Hans→en→ja', () => {
    const schools = asDocs(fixtures.schools)
    const abydos = schools.find((d) => d.documentId === 'sch-doc-abydos')!
    const nameJson = JSON.parse(mergeI18nField(abydos, 'name')!) as Record<string, string>
    expect(nameJson).toEqual({
      'zh-Hans': '阿拜多斯高等学校',
      en: 'Abydos High School',
      ja: 'アビドス高等学校',
    })
    // description: ja 缺失 → 只有两键
    const desc = JSON.parse(mergeI18nField(abydos, 'description')!) as Record<string, string>
    expect(Object.keys(desc).sort()).toEqual(['en', 'zh-Hans'])
  })

  it('非 localized 字段不参与合并：单 locale 行直接取基准标量', () => {
    const works = asDocs(fixtures.works)
    const work = buildWorkRows(works).rows.find((r) => r.documentId === 'wk-aaa111')
    expect(work?.nature).toBe('fanmade')
    expect(work?.workType).toBe('video')
  })

  it('全空字段返回 null（可空 JSON 列语义）', () => {
    const offline = asDocs(fixtures.offline)
    const evt = offline.find((d) => d.documentId === 'evt-off-001')!
    expect(mergeI18nField(evt, '__nonexistent__')).toBeNull()
  })

  it('publishedAt NULL 保真：草稿行 published_at 为 null', () => {
    const works = asDocs(fixtures.works)
    const draft = buildWorkRows(works).rows.find((r) => r.documentId === 'wk-draft666')
    expect(draft?.publishedAt).toBeNull()
    const online = asDocs(fixtures.online)
    const draftEvt = buildEvents(online, []).events.find((e) => e.documentId === 'evt-onl-draft')
    expect(draftEvt?.publishedAt).toBeNull()
  })
})

// ---------- 规则 2：creator 归并 ----------

describe('author 归并（含占位创作者）', () => {
  const result = (() => {
    let cached: CreatorBuildResult | undefined
    return () => {
      if (!cached) cached = buildCreators(asDocs(fixtures.subscriptions), asDocs(fixtures.works))
      return cached
    }
  })()

  it('订阅表生成 platform=bilibili 的 creator，uid 进 platform_uid', () => {
    const creators = result().creators
    const fanDub = creators.find((c) => c.platformUid === '1001')
    expect(fanDub).toBeDefined()
    expect(fanDub?.platform).toBe('bilibili')
    // fixture 里 upName 有首尾空白 → 归并键 normalize，展示名保留原样 trim 后入库
    expect(normalizeAuthorKey(fanDub!.name)).toBe('blue archive fandub')
  })

  it('work.author 与 upName 大小写/空白差异仍归并到同一 creator', () => {
    // wk-bbb222 各 locale author 分别为 " Senseicut " / "SenseiCut" → uid=1002 的 creator
    const creators = result().creators
    const sensei = creators.find((c) => c.platformUid === '1002')
    expect(sensei).toBeDefined()
    expect(result().workAuthorSlugs.get('wk-bbb222')).toBe(sensei!.slug)
  })

  it('无法归并的 author 生成 needs_review=1 占位 creator', () => {
    const creators = result().creators
    const placeholder = creators.find((c) => normalizeAuthorKey(c.name) === 'pixiv画师d')
    expect(placeholder).toBeDefined()
    expect(placeholder?.needsReview).toBe(1)
    expect(result().unmatchedAuthors.length).toBeGreaterThan(0)
    // 大小写变体 "Pixiv画师C"/"pixiv画师D" 是不同人 → 各自占位
    expect(creators.filter((c) => c.needsReview === 1).length).toBe(2)
  })

  it('同一占位 author 的多个作品归并到同一个占位 creator', () => {
    const slugs = [
      result().workAuthorSlugs.get('wk-ddd444'),
      result().workAuthorSlugs.get('wk-ddd555'),
    ]
    expect(slugs[0]).toBeTruthy()
    expect(slugs[0]).toBe(slugs[1])
  })

  it('无 author 的作品无处可去：slug=null，不建占位', () => {
    expect(result().workAuthorSlugs.get('wk-noauth777')).toBeNull()
    expect(result().creators.every((c) => c.name !== '')).toBe(true)
  })

  it('title/link → representative_works；coverUrl 校验 http(s)；草稿与非法 URL 不产出', () => {
    const repWorks = result().representativeWorks
    const aaa = repWorks.find((rw) => rw.title === 'Shiroko MAD')
    expect(aaa).toBeDefined()
    expect(aaa?.url).toBe('https://www.bilibili.com/video/BVaaa')
    expect(aaa?.coverUrl).toBe('https://i0.hdslb.com/bfs/cover/aaa.jpg')

    // javascript: URL 的作品被丢弃
    expect(repWorks.find((rw) => rw.title.includes('同人漫画'))).toBeUndefined()
    // 草稿作品被丢弃
    expect(repWorks.find((rw) => rw.title === '草稿视频')).toBeUndefined()
    expect(result().draftSkipped).toBe(1)
    expect(result().skippedRepWorks).toBe(1)
  })

  it('description 合并为 note_json i18n（多 locale 作品）', () => {
    const repWorks = result().representativeWorks
    const amv = repWorks.find((rw) => rw.url === 'https://www.youtube.com/watch?v=bbb')
    expect(amv).toBeDefined()
    const note = JSON.parse(amv!.noteJson!) as Record<string, string>
    expect(note['zh-Hans']).toBe('中文说明')
    expect(note.en).toBe('English note')
    // ja 描述为 null → 无该键
    expect('ja' in note).toBe(false)
  })

  it('documentId 全程保持不变（旧外链不破）', () => {
    const creators = result().creators
    // 订阅来源的 documentId 由 uid 派生且稳定
    expect(creators.find((c) => c.platformUid === '1001')?.documentId).toBe('cr-bilibili-1001')
    // 占位 creator 同样确定性
    const placeholder = creators.find((c) => c.needsReview === 1)!
    expect(placeholder.documentId.startsWith('cr-placeholder-')).toBe(true)
  })
})

// ---------- 规则 3：students 瘦身 ----------

describe('students 瘦身与 school 回填', () => {
  it('name 单列、bio/works 不出现在输出、wiki_url 为 NULL 待补录', () => {
    const { students } = buildStudents(asDocs(fixtures.students))
    const shiroko = students.find((s) => s.documentId === 'stu-doc-1')!
    expect(shiroko.name).toBe('Shiroko')
    expect(shiroko.wikiUrl).toBeNull()
    expect(Object.keys(shiroko)).not.toContain('bio')
  })

  it('school 枚举 → school slug；school_ref.slug 优先于枚举', () => {
    const { students } = buildStudents(asDocs(fixtures.students))
    expect(students.find((s) => s.documentId === 'stu-doc-1')?.schoolSlug).toBe('abydos')
    expect(students.find((s) => s.documentId === 'stu-doc-3')?.schoolSlug).toBe('gehenna')
  })

  it('未知 school 枚举记入质检清单，schoolSlug=null 不抛错', () => {
    const { students, unknownSchoolEnums } = buildStudents(asDocs(fixtures.students))
    expect(students.find((s) => s.documentId === 'stu-doc-4')?.schoolSlug).toBeNull()
    expect(unknownSchoolEnums).toContain('schrödinger-academy')
  })

  it('缺 name 的行跳过（NOT NULL 列保护）', () => {
    const { students } = buildStudents(asDocs(fixtures.students))
    expect(students.find((s) => s.documentId === 'stu-doc-5')).toBeUndefined()
  })

  it('草稿学生保留但 publishedAt=null', () => {
    const { students } = buildStudents(asDocs(fixtures.students))
    expect(students.find((s) => s.documentId === 'stu-doc-4')?.publishedAt).toBeNull()
  })
})

// ---------- 规则 4：event 合并 ----------

describe('online/offline event 合并', () => {
  it('kind 区分线上/线下；offline 产 event_locations 行', () => {
    const { events, locations } = buildEvents(asDocs(fixtures.online), asDocs(fixtures.offline))
    const online = events.filter((e) => e.kind === 'online')
    const offline = events.filter((e) => e.kind === 'offline')
    expect(online.length).toBe(2)
    expect(offline.length).toBe(1)

    const loc = locations[0]
    expect(loc.eventDocumentId).toBe('evt-off-001')
    expect(loc.city).toBe('上海')
    expect(loc.locationNote).toBe('展馆 A 区')
    expect(loc.mapUrl).toBe('https://map.example.com/venue-a')
  })

  it('localized 字段合并（title/ticketPriceText），时间转 unixepoch ms', () => {
    const { events } = buildEvents(asDocs(fixtures.online), asDocs(fixtures.offline))
    const live = events.find((e) => e.documentId === 'evt-onl-001')!
    const title = JSON.parse(live.titleJson!) as Record<string, string>
    expect(title['zh-Hans']).toBe('三周年纪念直播')
    expect(title.ja).toBe('3周年記念生放送')
    const priceText = JSON.parse(live.ticketPriceTextJson!) as Record<string, string>
    expect(priceText.ja).toBe('無料')
    expect(live.startTime).toBe(Date.parse('2024-02-01T12:00:00.000Z'))
    // tags 文本 → JSON 数组
    expect(JSON.parse(live.tagsJson!)).toContain('周年')
  })

  it('documentId 保持不变', () => {
    const { events } = buildEvents([], asDocs(fixtures.offline))
    expect(events.map((e) => e.documentId)).toEqual(['evt-off-001'])
  })
})

// ---------- 规则 5：redirect_map ----------

describe('redirect map 生成', () => {
  function buildAll() {
    const works = asDocs(fixtures.works)
    const students = buildStudents(asDocs(fixtures.students)).students
    const creators = buildCreators(asDocs(fixtures.subscriptions), works)
    return buildRedirectMap(
      works.map((w) => ({
        documentId: w.documentId,
        creatorSlug: creators.workAuthorSlugs.get(w.documentId) ?? null,
      })),
      students.map((s) => ({ documentId: s.documentId, slug: s.slug, wikiUrl: s.wikiUrl })),
    )
  }

  it('/works/<documentId> → /creators/<slug>；无归并 → /creators', () => {
    const rows = buildAll()
    const aaa = rows.find((r) => r.from_path === '/works/wk-aaa111')
    expect(aaa).toEqual({
      from_path: '/works/wk-aaa111',
      to_kind: 'creator',
      to_target: '/creators/blue-archive-fandub',
    })
    const orphan = rows.find((r) => r.from_path === '/works/wk-noauth777')
    expect(orphan).toEqual({ from_path: '/works/wk-noauth777', to_kind: 'creator', to_target: '/creators' })
  })

  it('/students/<id> 与 /students/<slug> 双路径映射；wiki_url 空 → archive', () => {
    const rows = buildAll()
    const byDoc = rows.find((r) => r.from_path === '/students/stu-doc-1')
    expect(byDoc?.to_kind).toBe('archive')
    expect(byDoc?.to_kind === 'archive' && byDoc.to_target === '').toBe(true)
    // slug 路径同样落 archive（wiki_url 未补录前）
    const bySlug = rows.find((r) => r.from_path === '/students/shiroko')
    expect(bySlug?.to_kind).toBe('archive')
  })

  it('wiki_url 存在时 → external 外跳', () => {
    const row = buildStudentRedirect('stu-x', 'https://kivo.wiki/Shiroko')
    expect(row).toEqual({
      from_path: '/students/stu-x',
      to_kind: 'external',
      to_target: 'https://kivo.wiki/Shiroko',
    })
    // 非 http(s) 的 wiki_url 视为未配置
    expect(buildStudentRedirect('stu-y', 'javascript:void(0)').to_kind).toBe('archive')
  })

  it('from_path 主键唯一：同 slug/documentId 不重复产出', () => {
    const rows = buildAll()
    const paths = rows.map((r) => r.from_path)
    expect(new Set(paths).size).toBe(paths.length)
  })
})

// ---------- D1 载入对拍 ----------

describe('D1 载入（load-d1.buildStatements）', () => {
  it('全量载入后行数一致、关键列保真、redirect_map 就位', async () => {
    const db = env.DB
    await resetAllContent(db)
    const works = asDocs(fixtures.works)
    const subscriptions = asDocs(fixtures.subscriptions)
    const studentsDocs = asDocs(fixtures.students)
    const creatorResult = buildCreators(subscriptions, works)
    const slimStudents = buildStudents(studentsDocs)
    const schools = buildSchools(asDocs(fixtures.schools))
    const events = buildEvents(asDocs(fixtures.online), asDocs(fixtures.offline))
    const legacyWorks = buildWorkRows(works)
    const redirects = buildRedirectMap(
      works.map((w) => ({
        documentId: w.documentId,
        creatorSlug: creatorResult.workAuthorSlugs.get(w.documentId) ?? null,
      })),
      slimStudents.students.map((s) => ({
        documentId: s.documentId,
        slug: s.slug,
        wikiUrl: s.wikiUrl,
      })),
    )

    // buildStatements 来自 load-d1.ts 的静态导出（顶层已 import）
    const payload = {
      creators: creatorResult.creators,
      representative_works: creatorResult.representativeWorks,
      creator_students: creatorResult.creatorStudents,
      students: slimStudents.students,
      schools,
      events: events.events,
      event_locations: events.locations,
      works: legacyWorks.rows,
      works_students: legacyWorks.studentLinks,
      redirects,
    }

    const statements = buildStatements(payload)
    for (const stmt of statements) {
      await db.prepare(stmt.sql).bind(...stmt.params).run()
    }

    // 行数校验和
    const countOf = async (table: string): Promise<number> => {
      const row = await db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{ n: number }>()
      return row?.n ?? 0
    }
    expect(await countOf('creators')).toBe(creatorResult.creators.length)
    expect(await countOf('representative_works')).toBe(creatorResult.representativeWorks.length)
    expect(await countOf('students')).toBe(slimStudents.students.length)
    expect(await countOf('schools')).toBe(schools.length)
    expect(await countOf('events')).toBe(events.events.length)
    expect(await countOf('event_locations')).toBe(events.locations.length)
    expect(await countOf('works')).toBe(legacyWorks.rows.length)
    expect(await countOf('redirect_map')).toBe(redirects.length)

    // 抽样保真：creator 归并与 rep-work
    const fanDub = await db
      .prepare('SELECT * FROM creators WHERE document_id = ?1')
      .bind('cr-bilibili-1001')
      .first<{ id: number; slug: string; platform_uid: string | null; needs_review: number }>()
    expect(fanDub?.platform_uid).toBe('1001')
    const repRow = await db
      .prepare(
        `SELECT rw.title, rw.url, c.slug FROM representative_works rw
         JOIN creators c ON c.id = rw.creator_id WHERE rw.title = 'Shiroko MAD'`,
      )
      .first<{ title: string; url: string; slug: string }>()
    expect(repRow?.url).toBe('https://www.bilibili.com/video/BVaaa')

    // documentId 不变抽查（works/students/events）
    for (const [table, doc] of [
      ['works', 'wk-ddd444'],
      ['students', 'stu-doc-2'],
      ['events', 'evt-off-001'],
    ] as const) {
      const col = table === 'works' || table === 'students' ? 'document_id' : 'document_id'
      const row = await db.prepare(`SELECT ${col} FROM ${table} WHERE ${col} = ?1`).bind(doc).first()
      expect(row).not.toBeNull()
    }

    // redirect_map 内容抽查
    const redirect = await db
      .prepare('SELECT to_kind, to_target FROM redirect_map WHERE from_path = ?1')
      .bind('/works/wk-noauth777')
      .first<{ to_kind: string; to_target: string }>()
    expect(redirect?.to_kind).toBe('creator')
    expect(redirect?.to_target).toBe('/creators')

    // 幂等：重复执行不炸、行数不变
    for (const stmt of statements) {
      await db.prepare(stmt.sql).bind(...stmt.params).run()
    }
    expect(await countOf('representative_works')).toBe(creatorResult.representativeWorks.length)
  })
})

// ---------- 边界工具函数 ----------

describe('工具函数边界', () => {
  it('validateHttpUrl 只放行 http(s)', () => {
    expect(validateHttpUrl('https://a.b/c')).toBe('https://a.b/c')
    expect(validateHttpUrl('http://a.b')).toBe('http://a.b/')
    expect(validateHttpUrl('javascript:alert(1)')).toBeNull()
    expect(validateHttpUrl('ftp://x')).toBeNull()
    expect(validateHttpUrl('not a url')).toBeNull()
    expect(validateHttpUrl(null)).toBeNull()
  })

  it('slugify 处理 CJK、多余符号与空串兜底', () => {
    expect(slugify('Blue Archive FanDub')).toBe('blue-archive-fandub')
    expect(slugify('  ミカ　劇場版!!  ')).toBe('ミカ-劇場版')
    expect(slugify('')).toBe('x')
    expect(slugify('///')).toBe('x')
  })

  it('groupRows 跳过缺 documentId 的行', () => {
    const docs = groupRows([
      { documentId: 'ok', locale: null },
      { locale: null },
      { documentId: '', locale: null },
    ])
    expect(docs.map((d) => d.documentId)).toEqual(['ok'])
  })
})
