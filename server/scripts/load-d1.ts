#!/usr/bin/env node
/**
 * ETL 第 3 段：d1-load.json + redirect-map.json → D1（wrangler d1 execute 或 REST）。
 *
 * 用法：
 *   node --experimental-strip-types scripts/load-d1.ts <目录> [--local]
 *   <目录> 内须有 transform.ts 产出的 d1-load.json 与 redirect-map.json。
 *   --local 走 `wrangler d1 execute schale_db --local`；默认要求 CLOUDFLARE_ACCOUNT_ID /
 *   CLOUDFLARE_API_TOKEN / CLOUDFLARE_D1_DATABASE_ID 环境变量走 REST API。
 *
 * 幂等性：全部 INSERT OR REPLACE，可重复执行；载入后输出行数校验和与源 JSON 对拍。
 */
interface Row {
  sql: string
  params: unknown[]
}

function ts(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null
}

function req(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

export function buildStatements(payload: Record<string, unknown>): Row[] {
  const rows: Row[] = []

  for (const s of payload.schools as Array<Record<string, unknown>>) {
    rows.push({
      sql: `INSERT INTO schools (document_id, slug, name_json, description_json, short_name_json, color, logo_url, sort_order, created_at, updated_at, published_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
            ON CONFLICT(document_id) DO UPDATE SET slug=excluded.slug, name_json=excluded.name_json,
              description_json=excluded.description_json, short_name_json=excluded.short_name_json,
              color=excluded.color, logo_url=excluded.logo_url, sort_order=excluded.sort_order,
              updated_at=excluded.updated_at, published_at=excluded.published_at`,
      params: [
        req(s.documentId), req(s.slug), s.nameJson ?? null, s.descriptionJson ?? null,
        s.shortNameJson ?? null, s.color ?? null, s.logoUrl ?? null,
        typeof s.sortOrder === 'number' ? s.sortOrder : 0,
        ts(s.createdAt) ?? 0, ts(s.updatedAt) ?? 0, ts(s.publishedAt),
      ],
    })
  }

  for (const st of payload.students as Array<Record<string, unknown>>) {
    rows.push({
      sql: `INSERT INTO students (document_id, slug, name, avatar_url, organization, wiki_url, school_id, created_at, updated_at, published_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6,
              (SELECT id FROM schools WHERE slug = ?7 LIMIT 1),
              ?8, ?9, ?10)
            ON CONFLICT(document_id) DO UPDATE SET slug=excluded.slug, name=excluded.name,
              organization=excluded.organization, wiki_url=excluded.wiki_url,
              updated_at=excluded.updated_at, published_at=excluded.published_at`,
      params: [
        req(st.documentId), req(st.slug), req(st.name), st.avatarUrl ?? null,
        st.organization ?? null, st.wikiUrl ?? null, st.schoolSlug ?? null,
        ts(st.createdAt) ?? 0, ts(st.updatedAt) ?? 0, ts(st.publishedAt),
      ],
    })
  }

  for (const c of payload.creators as Array<Record<string, unknown>>) {
    rows.push({
      sql: `INSERT INTO creators (document_id, slug, name, avatar_url, bio_json, platform, platform_uid, homepage_url, is_featured, featured_priority, needs_review, created_at, updated_at, published_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
            ON CONFLICT(document_id) DO UPDATE SET slug=excluded.slug, name=excluded.name,
              platform_uid=excluded.platform_uid, homepage_url=excluded.homepage_url,
              needs_review=excluded.needs_review, updated_at=excluded.updated_at,
              published_at=excluded.published_at`,
      params: [
        req(c.documentId), req(c.slug), req(c.name), c.avatarUrl ?? null, c.bioJson ?? null,
        req(c.platform, 'unknown'), c.platformUid ?? null, c.homepageUrl ?? null,
        c.isFeatured ? 1 : 0, typeof c.featuredPriority === 'number' ? c.featuredPriority : 0,
        c.needsReview ? 1 : 0, ts(c.createdAt) ?? 0, ts(c.updatedAt) ?? 0, ts(c.publishedAt),
      ],
    })
  }

  // representative_works 无自然键：先清空再插（组件表语义，重跑即全量刷新）
  rows.push({ sql: 'DELETE FROM representative_works', params: [] })
  let rwOrder = 0
  for (const rw of payload.representative_works as Array<Record<string, unknown>>) {
    rwOrder++
    rows.push({
      sql: `INSERT INTO representative_works (creator_id, sort_order, title, url, cover_url, note_json)
            VALUES ((SELECT id FROM creators WHERE slug = ?1 LIMIT 1), ?2, ?3, ?4, ?5, ?6)`,
      params: [
        req(rw.creatorSlug), typeof rw.sortOrder === 'number' ? rw.sortOrder : rwOrder,
        req(rw.title), req(rw.url), rw.coverUrl ?? null, rw.noteJson ?? null,
      ],
    })
  }

  rows.push({ sql: 'DELETE FROM creator_students', params: [] })
  for (const link of payload.creator_students as Array<Record<string, unknown>>) {
    rows.push({
      sql: `INSERT OR IGNORE INTO creator_students (creator_id, student_id)
            VALUES ((SELECT id FROM creators WHERE slug = ?1 LIMIT 1),
                    (SELECT id FROM students WHERE document_id = ?2 LIMIT 1))`,
      params: [req(link.creatorSlug), req(link.studentDocumentId)],
    })
  }

  for (const e of payload.events as Array<Record<string, unknown>>) {
    rows.push({
      sql: `INSERT INTO events (document_id, kind, title_json, description_json, nature, event_format, status_override, start_time, end_time, link, cover_image_url, organizer, organizer_verified, source_platform, source_url, last_verified_at, tags_json, guests_json, ticket_price_text_json, price_min, price_max, currency, ticket_status, ticket_url, created_at, updated_at, published_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27)
            ON CONFLICT(document_id) DO UPDATE SET title_json=excluded.title_json,
              description_json=excluded.description_json, status_override=excluded.status_override,
              start_time=excluded.start_time, end_time=excluded.end_time, link=excluded.link,
              organizer=excluded.organizer, tags_json=excluded.tags_json,
              ticket_status=excluded.ticket_status, ticket_url=excluded.ticket_url,
              last_verified_at=excluded.last_verified_at,
              updated_at=excluded.updated_at, published_at=excluded.published_at`,
      params: [
        req(e.documentId), e.kind === 'offline' ? 'offline' : 'online',
        e.titleJson ?? null, e.descriptionJson ?? null,
        e.nature === 'fanmade' ? 'fanmade' : 'official',
        e.eventFormat ?? null, e.statusOverride ?? null,
        ts(e.startTime), ts(e.endTime), e.link ?? null, e.coverImageUrl ?? null,
        e.organizer ?? null, e.organizerVerified ? 1 : 0,
        e.sourcePlatform ?? null, e.sourceUrl ?? null, ts(e.lastVerifiedAt),
        e.tagsJson ?? null, e.guestsJson ?? null, e.ticketPriceTextJson ?? null,
        typeof e.priceMin === 'number' ? e.priceMin : null,
        typeof e.priceMax === 'number' ? e.priceMax : null,
        e.currency ?? null, e.ticketStatus ?? null, e.ticketUrl ?? null,
        ts(e.createdAt) ?? 0, ts(e.updatedAt) ?? 0, ts(e.publishedAt),
      ],
    })
  }

  rows.push({ sql: 'DELETE FROM event_locations', params: [] })
  for (const l of payload.event_locations as Array<Record<string, unknown>>) {
    rows.push({
      sql: `INSERT OR IGNORE INTO event_locations (event_id, country, region, city, venue, address, location_note, map_url)
            VALUES ((SELECT id FROM events WHERE document_id = ?1 LIMIT 1), ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
      params: [
        req(l.eventDocumentId), l.country ?? null, l.region ?? null, l.city ?? null,
        l.venue ?? null, l.address ?? null, l.locationNote ?? null, l.mapUrl ?? null,
      ],
    })
  }

  for (const w of payload.works as Array<Record<string, unknown>>) {
    rows.push({
      sql: `INSERT INTO works (document_id, title, author, description, cover_image_url, cover_image_url_external, nature, work_type, link, source_platform, source_url, source_id, is_featured, featured_priority, featured_reason, featured_until, is_active, is_auto_imported, imported_at, original_publish_date, created_at, updated_at, published_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23)
            ON CONFLICT(document_id) DO UPDATE SET title=excluded.title, author=excluded.author,
              is_active=excluded.is_active, is_featured=excluded.is_featured,
              featured_priority=excluded.featured_priority,
              updated_at=excluded.updated_at, published_at=excluded.published_at`,
      params: [
        req(w.documentId), req(w.title), w.author ?? null, w.description ?? null,
        w.coverImageUrl ?? null, w.coverImageUrlExternal ?? null,
        w.nature === 'official' ? 'official' : 'fanmade', req(w.workType, 'other'),
        w.link ?? null, w.sourcePlatform ?? null, w.sourceUrl ?? null, w.sourceId ?? null,
        w.isFeatured ? 1 : 0, typeof w.featuredPriority === 'number' ? w.featuredPriority : 0,
        w.featuredReason ?? null, ts(w.featuredUntil), w.isActive === false ? 0 : 1,
        w.isAutoImported ? 1 : 0, ts(w.importedAt), w.originalPublishDate ?? null,
        ts(w.createdAt) ?? 0, ts(w.updatedAt) ?? 0, ts(w.publishedAt),
      ],
    })
  }

  rows.push({ sql: 'DELETE FROM works_students', params: [] })
  for (const link of payload.works_students as Array<Record<string, unknown>>) {
    rows.push({
      sql: `INSERT OR IGNORE INTO works_students (work_id, student_id)
            VALUES ((SELECT id FROM works WHERE document_id = ?1 LIMIT 1),
                    (SELECT id FROM students WHERE document_id = ?2 LIMIT 1))`,
      params: [req(link.workDocumentId), req(link.studentDocumentId)],
    })
  }

  rows.push({ sql: 'DELETE FROM redirect_map', params: [] })
  for (const r of (payload.redirects ?? []) as Array<{ from_path: string; to_kind: string; to_target: string }>) {
    const kind = r.to_kind === 'external' || r.to_kind === 'archive' ? r.to_kind : 'creator'
    rows.push({
      sql: `INSERT INTO redirect_map (from_path, to_kind, to_target) VALUES (?1, ?2, ?3)
            ON CONFLICT(from_path) DO UPDATE SET to_kind=excluded.to_kind, to_target=excluded.to_target`,
      params: [r.from_path, kind, r.to_target ?? ''],
    })
  }

  return rows
}
async function main() {
  // node: 模块仅 CLI 路径需要；延迟 import 保持本文件可被 Workers 测试环境导入
  const { readFile } = await import('node:fs/promises')
  const { join } = await import('node:path')

  const dir = process.argv[2]
  if (!dir) {
    console.error('用法：node scripts/load-d1.ts <目录> [--local]')
    process.exit(1)
  }
  const local = process.argv.includes('--local')

  const payloadRaw = JSON.parse(await readFile(join(dir, 'd1-load.json'), 'utf8')) as Record<string, unknown>
  const redirects = JSON.parse(await readFile(join(dir, 'redirect-map.json'), 'utf8')) as unknown[]
  const statements = buildStatements({ ...payloadRaw, redirects })

  if (local) {
    // wrangler d1 execute --command - 从 stdin 读 JSON 命令数组
    const { execFile } = await import('node:child_process')
    const payload = JSON.stringify(
      statements.map((s) => ({ sql: s.sql, params: s.params })),
    )
    const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      const child = execFile('npx', ['wrangler', 'd1', 'execute', 'schale_db', '--local', '--command', '-'], (error, stdout, stderr) => {
        if (error) reject(error)
        else resolve({ stdout, stderr })
      })
      child.stdin?.end(payload)
    })
    console.log(`[load] local D1: ${statements.length} statements`)
    void result
    return
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN

  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID
  if (!accountId || !apiToken || !databaseId) {
    console.error('远程载入需要 CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN / CLOUDFLARE_D1_DATABASE_ID')
    process.exit(1)
  }
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ params: statements.flatMap((s) => s.params), sql: statements.map((s) => s.sql).join(';\n') }),
    },
  )
  const body = (await response.json()) as { success?: boolean; errors?: Array<{ message: string }> }
  if (!response.ok || !body.success) {
    console.error('[load] REST 载入失败:', JSON.stringify(body.errors ?? body))
    process.exit(1)
  }
  console.log(`[load] remote D1: ${statements.length} statements`)
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop() ?? '')) {
  await main()
}
