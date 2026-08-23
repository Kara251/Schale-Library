#!/usr/bin/env node
/**
 * ETL 第 2 段：读中间 JSON → src/lib/etl.ts 纯函数 → D1 载入 JSON。
 * 本地无 Neon 时用 test/fixtures/ 的同名文件复现。
 *
 * 用法：
 *   node --experimental-strip-types scripts/transform.ts <导出目录> <输出目录>
 * 输出：
 *   d1-load.json     —— 全部 INSERT 参数（按表分组，顺序即载入顺序）
 *   redirect-map.json —— redirect_map 行
 *   report.json      —— 行数/归并统计/质检清单（对照第四节「行数校验和」验收）
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const SERVER_DIR = join(SCRIPT_DIR, '..')

import {
  buildCreators,
  buildEvents,
  buildSchools,
  buildStudents,
  buildWorkRows,
  groupRows,
  type CreatorSeed,
  type EventLocationSeed,
  type EventSeed,
  type RepresentativeWorkSeed,
  type SchoolSeed,
  type StudentSeed,
  type WorkRowSeed,
} from '../src/lib/etl'
import { buildRedirectMap, type RedirectRow } from '../src/lib/redirects'

type ExportedRows = Array<Record<string, unknown>>

async function readDomain(dir: string, file: string): Promise<ExportedRows> {
  try {
    const raw = await readFile(join(dir, file), 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    console.warn(`[transform] 缺少 ${file}，按空集处理`)
    return []
  }
}

export interface D1LoadPayload {
  creators: CreatorSeed[]
  representative_works: RepresentativeWorkSeed[]
  creator_students: Array<{ creatorSlug: string; studentDocumentId: string }>
  students: StudentSeed[]
  schools: SchoolSeed[]
  events: EventSeed[]
  event_locations: EventLocationSeed[]
  works: WorkRowSeed[]
  works_students: Array<{ workDocumentId: string; studentDocumentId: string }>
}

export interface TransformReport {
  counts: Record<string, number>
  unmatchedAuthors: string[]
  unknownSchoolEnums: string[]
  skippedRepWorks: number
  draftSkipped: number
  redirectCount: number
}

async function transform(exportDir: string, outDir: string): Promise<TransformReport> {
  const [
    subscriptionRows,
    workRows,
    studentRows,
    schoolRows,
    onlineRows,
    offlineRows,
  ] = await Promise.all([
    readDomain(exportDir, 'subscriptions.json'),
    readDomain(exportDir, 'works.json'),
    readDomain(exportDir, 'students.json'),
    readDomain(exportDir, 'schools.json'),
    readDomain(exportDir, 'online_events.json'),
    readDomain(exportDir, 'offline_events.json'),
  ])

  const subscriptions = groupRows(subscriptionRows)
  const works = groupRows(workRows)
  const studentsDocs = groupRows(studentRows)
  const schoolsDocs = groupRows(schoolRows)
  const onlineDocs = groupRows(onlineRows)
  const offlineDocs = groupRows(offlineRows)

  const creatorResult = buildCreators(subscriptions, works)
  const slimStudents = buildStudents(studentsDocs)
  const schools = buildSchools(schoolsDocs)
  const events = buildEvents(onlineDocs, offlineDocs)
  const legacyWorks = buildWorkRows(works)

  const slugByDocumentId = new Map(slimStudents.students.map((s) => [s.documentId, s.slug]))
  const creatorBySlug = new Map(creatorResult.creators.map((c) => [c.slug, c]))

  // 规则 5：redirect_map（works 全量 + students 双路径）
  const redirectMap: RedirectRow[] = buildRedirectMap(
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

  // 校验：creator_students 引用的学生必须存在（否则丢弃并计数）
  const validCreatorStudents = creatorResult.creatorStudents.filter((link) => {
    const ok = slugByDocumentId.has(link.studentDocumentId) && creatorBySlug.has(link.creatorSlug)
    return ok
  })
  const droppedCreatorStudents = creatorResult.creatorStudents.length - validCreatorStudents.length

  const payload: D1LoadPayload = {
    creators: creatorResult.creators,
    representative_works: creatorResult.representativeWorks.filter((rw) =>
      creatorBySlug.has(rw.creatorSlug),
    ),
    creator_students: validCreatorStudents,
    students: slimStudents.students,
    schools,
    events: events.events,
    event_locations: events.locations,
    works: legacyWorks.rows,
    works_students: legacyWorks.studentLinks,
  }

  const report: TransformReport = {
    counts: Object.fromEntries(
      Object.entries({
        ...payload,
        creator_students: undefined,
        works_students: undefined,
      }).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]),
    ) as Record<string, number>,
    unmatchedAuthors: creatorResult.unmatchedAuthors,
    unknownSchoolEnums: slimStudents.unknownSchoolEnums,
    skippedRepWorks: creatorResult.skippedRepWorks,
    draftSkipped: creatorResult.draftSkipped,
    redirectCount: redirectMap.length,
  }
  report.counts['creator_students'] = validCreatorStudents.length
  report.counts['works_students'] = legacyWorks.studentLinks.length
  report.counts['dropped_creator_students'] = droppedCreatorStudents

  await mkdir(outDir, { recursive: true })
  await writeFile(join(outDir, 'd1-load.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  await writeFile(join(outDir, 'redirect-map.json'), `${JSON.stringify(redirectMap, null, 2)}\n`, 'utf8')
  await writeFile(join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  console.log(`[transform] ${basename(exportDir)} → ${outDir}`)
  console.log(JSON.stringify(report, null, 2))
  return report
}

const [, , exportDir, outDir] = process.argv
if (!exportDir || !outDir) {
  console.error('用法：node scripts/transform.ts <导出目录> <输出目录>')
  process.exit(1)
}
await transform(exportDir, outDir)

void SERVER_DIR
