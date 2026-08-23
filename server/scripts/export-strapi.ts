#!/usr/bin/env node
/**
 * ETL 第 1 段：Strapi Postgres（Neon）导出为中间 JSON（每域一文件、每 locale 一行）。
 * 本机无 Neon 访问权时不可运行；结构由 test/fixtures/ 固定供 transform/load 测试。
 *
 * 用法：
 *   DATABASE_URL=postgres://… node --experimental-strip-types scripts/export-strapi.ts <输出目录>
 * 输出（<dir>/ 下）：
 *   subscriptions.json  bilibili_subscriptions 全列
 *   works.json          works + students documentId 聚合 + locale 列
 *   students.json       students + school_ref.slug + locale 列
 *   schools.json        schools（locale 行）
 *   online_events.json / offline_events.json
 */
import { mkdir, writeFile } from 'node:fs/promises'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('需要 DATABASE_URL（Neon Postgres 连接串）')
  process.exit(1)
}

const { default: pg } = await import('pg')
const { Client } = pg

const client = new Client({ connectionString: DATABASE_URL })
await client.connect()

/** Strapi v5 i18n：内容行在 <collection>_localizations，locale 在 i18n_locale。 */
const LOCALES_SQL = `
  SELECT l.code AS code
  FROM i18n_locale l
`

async function queryRows(sql: string): Promise<Array<Record<string, unknown>>> {
  const result = await client.query(sql)
  return result.rows as Array<Record<string, unknown>>
}

async function main(outDir: string) {
  await mkdir(outDir, { recursive: true })

  // locale 清单仅用于日志校对；导出按行带 locale 原样输出
  let locales: string[] = []
  try {
    locales = (await queryRows(LOCALES_SQL)).map((r) => String(r.code))
  } catch {
    console.warn('[export] i18n_locale 不可读，跳过 locale 清单')
  }
  console.log(`[export] locales: ${locales.join(', ') || '(unknown)'}`)

  const subscriptions = await queryRows(`
    SELECT uid AS "documentId", up_name, uid, is_active, default_nature,
           auto_publish_keywords, last_sync_at, sync_count, notes,
           created_at, updated_at
    FROM bilibili_subscriptions
    ORDER BY created_at, id
  `)
  await writeFile(
    `${outDir}/subscriptions.json`,
    `${JSON.stringify(subscriptions, null, 2)}\n`,
  )

  const works = await queryRows(`
    SELECT w.document_id AS "documentId",
           l.code AS locale,
           w.title, w.author, w.description,
           w.nature, w.work_type, w.link,
           w.cover_image_url_external AS "coverImageUrl",
           w.is_active, w.is_featured, w.featured_priority, w.featured_reason, w.featured_until,
           w.source_platform, w.source_url, w.source_id,
           w.is_auto_imported, w.imported_at, w.original_publish_date,
           w.created_at, w.updated_at, w.published_at,
           COALESCE(ws.students, '[]'::json) AS students
    FROM works w
    LEFT JOIN works_localizations l ON l.id = w.localization_id
    LEFT JOIN LATERAL (
      SELECT json_agg(s.document_id ORDER BY ws2.sort_order, s.id) AS students
      FROM works_students ws2
      JOIN students s ON s.id = ws2.student_id
      WHERE ws2.work_id = w.id
    ) ws ON TRUE
    ORDER BY w.created_at, w.id
  `)
  await writeFile(`${outDir}/works.json`, `${JSON.stringify(works, null, 2)}`)

  const students = await queryRows(`
    SELECT s.document_id AS "documentId",
           l.code AS locale,
           s.name, s.organization,
           sr.slug AS "schoolRefSlug",
           s.school AS "schoolEnum",
           s.avatar_url AS "avatarUrl",
           s.created_at, s.updated_at, s.published_at
    FROM students s
    LEFT JOIN students_localizations l ON l.id = s.localization_id
    LEFT JOIN schools sr ON sr.id = s.school_id
    ORDER BY s.created_at, s.id
  `)
  await writeFile(`${outDir}/students.json`, `${JSON.stringify(students, null, 2)}`)

  const schools = await queryRows(`
    SELECT sc.document_id AS "documentId",
           l.code AS locale,
           sc.name, sc.description, sc.short_name,
           sc.color, sc.logo_url, sc.sort_order,
           sc.created_at, sc.updated_at
    FROM schools sc
    LEFT JOIN schools_localizations l ON l.id = sc.localization_id
    ORDER BY sc.sort_order, sc.id
  `)
  await writeFile(`${outDir}/schools.json`, `${JSON.stringify(schools, null, 2)}`)

  for (const [file, table] of [
    ['online_events', 'online_events'],
    ['offline_events', 'offline_events'],
  ] as const) {
    const rows = await queryRows(`
      SELECT e.document_id AS "documentId",
             l.code AS locale,
             e.title, e.description, e.nature, e.event_format, e.status_override,
             e.country, e.region, e.city, e.venue, e.address, e.location, e.map_url,
             e.guests, e.start_time, e.end_time, e.link, e.ticket_url, e.ticket_status,
             e.ticket_price_text, e.price_min, e.price_max, e.currency,
             e.organizer, e.organizer_verified, e.tags,
             e.source_platform, e.source_name, e.source_url, e.last_verified_at,
             e.created_at, e.updated_at, e.published_at
      FROM ${table} e
      LEFT JOIN ${table}_localizations l ON l.id = e.localization_id
      ORDER BY e.start_time, e.id
    `)
    await writeFile(`${outDir}/${file}.json`, `${JSON.stringify(rows, null, 2)}`)
  }

  await client.end()
  console.log(`[export] done → ${outDir}`)
}

const outDir = process.argv[2]
if (!outDir) {
  console.error('用法：node scripts/export-strapi.ts <输出目录>')
  process.exit(1)
}
await main(outDir)
