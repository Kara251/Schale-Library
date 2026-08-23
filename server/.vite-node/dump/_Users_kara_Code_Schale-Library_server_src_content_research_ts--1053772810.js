// /Users/kara/Code/Schale-Library/server/src/content/research.ts
const __vite_ssr_import_0__ = await __vite_ssr_import__("hono", {"importedNames":["Hono"]});
const __vite_ssr_import_1__ = await __vite_ssr_import__("/src/lib/i18n.ts", {"importedNames":["pickLocale"]});
const __vite_ssr_import_2__ = await __vite_ssr_import__("/src/lib/respond.ts", {"importedNames":["ok","okPaginated","fail","paginationOf"]});



const researchRoutes = new __vite_ssr_import_0__.Hono();
Object.defineProperty(__vite_ssr_exports__, "researchRoutes", { enumerable: true, configurable: true, get(){ return researchRoutes }});
const PUBLISHED = "published_at IS NOT NULL";
function iso(ms) {
  return ms === null ? "" : new Date(ms).toISOString();
}
function entryJson(row, locale) {
  return {
    id: row.id,
    documentId: row.document_id,
    title: __vite_ssr_import_1__.pickLocale(row.title_json, locale),
    slug: row.slug,
    stance: row.stance,
    summary: row.summary_json === null ? void 0 : __vite_ssr_import_1__.pickLocale(row.summary_json, locale),
    body: row.body_json === null ? void 0 : __vite_ssr_import_1__.pickLocale(row.body_json, locale),
    media_type: row.media_type,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    publishedAt: iso(row.published_at)
  };
}
function themeJson(row, locale) {
  return {
    id: row.id,
    documentId: row.document_id,
    name: __vite_ssr_import_1__.pickLocale(row.title_json, locale),
    slug: row.slug,
    curated_intro: row.curated_intro_json === null ? void 0 : __vite_ssr_import_1__.pickLocale(row.curated_intro_json, locale),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    publishedAt: iso(row.published_at)
  };
}
function subjectJson(row, locale) {
  return {
    id: row.id,
    documentId: row.document_id,
    name: __vite_ssr_import_1__.pickLocale(row.title_json, locale),
    slug: row.slug,
    subject_type: row.subject_type,
    description: row.description_json === null ? void 0 : __vite_ssr_import_1__.pickLocale(row.description_json, locale),
    cover: row.cover_url ? { url: row.cover_url } : void 0,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    publishedAt: iso(row.published_at)
  };
}
function pathJson(row, locale) {
  return {
    id: row.id,
    documentId: row.document_id,
    title: __vite_ssr_import_1__.pickLocale(row.title_json, locale),
    slug: row.slug,
    description: row.description_json === null ? void 0 : __vite_ssr_import_1__.pickLocale(row.description_json, locale),
    difficulty: row.difficulty ?? void 0,
    order: row.sort_order,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    publishedAt: iso(row.published_at)
  };
}
function citationJson(row, locale) {
  return {
    id: row.id,
    documentId: row.document_id,
    claim_short: row.claim_short_json === null ? void 0 : __vite_ssr_import_1__.pickLocale(row.claim_short_json, locale),
    source_type: row.source_type ?? void 0,
    source_ref: row.source_ref ?? void 0,
    source_quote: row.source_quote_json === null ? void 0 : __vite_ssr_import_1__.pickLocale(row.source_quote_json, locale),
    confidence: row.confidence ?? void 0,
    // 契约 consume 有 citations[].source_image：本 schema 无媒体表，恒为 null 占位
    source_image: null,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    publishedAt: iso(row.published_at)
  };
}
async function attachThemes(db, entries, locale) {
  if (entries.length === 0) return;
  const ids = entries.map((e) => e.id);
  const marks = ids.map(() => "?").join(",");
  const rows = await db.prepare(
    `SELECT et.entry_id, t.id, t.document_id, t.slug, t.title_json, t.curated_intro_json,
              t.created_at, t.updated_at, t.published_at
       FROM entry_themes et JOIN research_themes t ON t.id = et.theme_id
       WHERE t.${PUBLISHED} AND et.entry_id IN (${marks}) ORDER BY et.entry_id, t.id`
  ).bind(...ids).all();
  const byEntry = /* @__PURE__ */ new Map();
  for (const r of rows.results ?? []) {
    let list = byEntry.get(r.entry_id);
    if (!list) byEntry.set(r.entry_id, list = []);
    list.push(themeJson(r, locale));
  }
  for (const e of entries) e.themes = byEntry.get(e.id) ?? [];
}
async function attachSubjects(db, entries, locale) {
  if (entries.length === 0) return;
  const ids = entries.map((e) => e.id);
  const marks = ids.map(() => "?").join(",");
  const rows = await db.prepare(
    `SELECT es.entry_id, s.id, s.document_id, s.slug, s.title_json, s.description_json,
              s.subject_type, s.cover_url, s.created_at, s.updated_at, s.published_at
       FROM entry_subjects es JOIN research_subjects s ON s.id = es.subject_id
       WHERE s.${PUBLISHED} AND es.entry_id IN (${marks}) ORDER BY es.entry_id, s.id`
  ).bind(...ids).all();
  const byEntry = /* @__PURE__ */ new Map();
  for (const r of rows.results ?? []) {
    let list = byEntry.get(r.entry_id);
    if (!list) byEntry.set(r.entry_id, list = []);
    list.push(subjectJson(r, locale));
  }
  for (const e of entries) e.subjects = byEntry.get(e.id) ?? [];
}
async function attachSpoilerTiers(db, entries) {
  if (entries.length === 0) return;
  const idsMarks = entries.map(() => "?").join(",");
  const linkRows = await db.prepare(
    `SELECT id, spoiler_tier_id FROM research_entries WHERE ${PUBLISHED} AND id IN (${idsMarks})`
  ).bind(...entries.map((e) => e.id)).all();
  const linked = (linkRows.results ?? []).filter(
    (x) => x.spoiler_tier_id !== null
  );
  if (linked.length === 0) {
    for (const e of entries) e.spoiler_tier = null;
    return;
  }
  const tierIds = [...new Set(linked.map((x) => x.spoiler_tier_id))];
  const tiers = await db.prepare(`SELECT * FROM spoiler_tiers WHERE id IN (${tierIds.map(() => "?").join(",")})`).bind(...tierIds).all();
  const tierById = new Map((tiers.results ?? []).map((t) => [t.id, t]));
  const entryTier = new Map(linked.map((x) => [x.id, x.spoiler_tier_id]));
  for (const e of entries) {
    const tierId = entryTier.get(e.id);
    const row = tierId === void 0 ? void 0 : tierById.get(tierId);
    e.spoiler_tier = row === void 0 ? null : {
      id: row.id,
      documentId: row.document_id,
      name: __vite_ssr_import_1__.pickLocale(row.title_json, "zh-Hans"),
      key: row.key
    };
  }
}
async function attachCitations(db, entry, locale) {
  const rows = await db.prepare(
    `SELECT c.* FROM entry_citations ec JOIN research_citations c ON c.id = ec.citation_id
       WHERE c.${PUBLISHED} AND ec.entry_id = ?1 ORDER BY c.id`
  ).bind(entry.id).all();
  entry.citations = (rows.results ?? []).map((r) => citationJson(r, locale));
}
async function attachRelatedLinks(db, entry) {
  const links = await db.prepare(
    `SELECT id, target_document_id, relation_type, curate_note_json, sort_order
       FROM entry_related_links WHERE entry_id = ?1 ORDER BY sort_order, id`
  ).bind(entry.id).all();
  const targets = [...new Set((links.results ?? []).map((l) => l.target_document_id))];
  const targetByDoc = /* @__PURE__ */ new Map();
  for (const doc of targets) {
    const row = await db.prepare(
      `SELECT id, document_id, slug, title_json FROM research_entries
         WHERE document_id = ?1 AND ${PUBLISHED}`
    ).bind(doc).first();
    if (row) {
      targetByDoc.set(doc, {
        id: row.id,
        documentId: row.document_id,
        title: __vite_ssr_import_1__.pickLocale(row.title_json, "zh-Hans"),
        slug: row.slug,
        locale: "zh-Hans"
      });
    }
  }
  entry.related_links = (links.results ?? []).map((l) => ({
    id: l.id,
    target_entry: targetByDoc.get(l.target_document_id),
    relation_type: l.relation_type,
    curate_note: l.curate_note_json === null ? void 0 : __vite_ssr_import_1__.pickLocale(l.curate_note_json, "zh-Hans"),
    order: l.sort_order
  }));
}
async function attachRevisions(db, entry, locale) {
  const rows = await db.prepare(
    `SELECT id, revised_at, revision_type, note_json FROM entry_revisions
       WHERE entry_id = ?1 ORDER BY sort_order, id`
  ).bind(entry.id).all();
  entry.revisions = (rows.results ?? []).map((r) => ({
    id: r.id,
    date: r.revised_at ?? "",
    revision_type: r.revision_type,
    note: r.note_json === null ? void 0 : __vite_ssr_import_1__.pickLocale(r.note_json, locale)
  }));
}
function parseListParams(url) {
  const ALLOWED = ["zh-Hans", "en", "ja"];
  const rawLocale = url.searchParams.get("locale") || "zh-Hans";
  const pageRaw = Number(url.searchParams.get("pagination[page]") || "1");
  const sizeRaw = Number(url.searchParams.get("pagination[pageSize]") || "24");
  return {
    locale: ALLOWED.includes(rawLocale) ? rawLocale : "zh-Hans",
    page: Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1,
    pageSize: Number.isFinite(sizeRaw) && sizeRaw >= 1 ? Math.min(200, Math.floor(sizeRaw)) : 24
  };
}
async function countEntries(db, where, binds) {
  const row = await db.prepare(`SELECT COUNT(*) AS n FROM research_entries WHERE ${PUBLISHED}${where}`).bind(...binds).first();
  return row?.n ?? 0;
}
async function queryEntries(db, where, binds, params, orderBy = "updated_at DESC") {
  const offset = (params.page - 1) * params.pageSize;
  const rows = await db.prepare(
    `SELECT * FROM research_entries WHERE ${PUBLISHED}${where}
       ORDER BY ${orderBy} LIMIT ?${binds.length + 1} OFFSET ?${binds.length + 2}`
  ).bind(...binds, params.pageSize, offset).all();
  return (rows.results ?? []).map((r) => entryJson(r, params.locale));
}
researchRoutes.get("/research-entries", async (c) => {
  const url = new URL(c.req.url);
  const params = parseListParams(url);
  const db = c.env.DB;
  const slugEq = url.searchParams.get("filters[slug][$eq]");
  const themeSlug = url.searchParams.get("filters[themes][slug][$eq]");
  const subjectSlug = url.searchParams.get("filters[subjects][slug][$eq]");
  const citationIdsIn = url.searchParams.getAll("filters[citations][id][$in]").flatMap((v) => v.split(",")).filter(Boolean);
  let where = "";
  const binds = [];
  if (slugEq !== null) {
    where += " AND slug = ?";
    binds.push(slugEq);
  }
  if (themeSlug !== null) {
    where += ` AND id IN (SELECT et.entry_id FROM entry_themes et
               JOIN research_themes t ON t.id = et.theme_id
               WHERE t.${PUBLISHED} AND t.slug = ?)`;
    binds.push(themeSlug);
  }
  if (subjectSlug !== null) {
    where += ` AND id IN (SELECT es.entry_id FROM entry_subjects es
               JOIN research_subjects s ON s.id = es.subject_id
               WHERE s.${PUBLISHED} AND s.slug = ?)`;
    binds.push(subjectSlug);
  }
  if (citationIdsIn.length > 0) {
    const marks = citationIdsIn.map(() => "?").join(",");
    where += ` AND id IN (SELECT ec.entry_id FROM entry_citations ec
               JOIN research_citations cit ON cit.id = ec.citation_id
               WHERE cit.${PUBLISHED} AND cit.id IN (${marks}))`;
    binds.push(...citationIdsIn.map(Number).filter((n) => !Number.isNaN(n)));
  }
  const total = await countEntries(db, where, binds);
  const data = await queryEntries(db, where, binds, params);
  await attachThemes(db, data, params.locale);
  await attachSubjects(db, data, params.locale);
  await attachSpoilerTiers(db, data);
  return __vite_ssr_import_2__.okPaginated(data, __vite_ssr_import_2__.paginationOf(params.page, params.pageSize, total));
});
researchRoutes.get("/research-entries/:slug", async (c) => {
  const slug = c.req.param("slug");
  if (slug === "backlinks") return __vite_ssr_import_2__.fail(404, "not_found");
  const url = new URL(c.req.url);
  const params = parseListParams(url);
  const db = c.env.DB;
  const row = await db.prepare(`SELECT * FROM research_entries WHERE slug = ?1 AND ${PUBLISHED}`).bind(slug).first();
  if (!row) return __vite_ssr_import_2__.fail(404, "not_found");
  const entry = entryJson(row, params.locale);
  await attachThemes(db, [entry], params.locale);
  await attachSubjects(db, [entry], params.locale);
  await attachSpoilerTiers(db, [entry]);
  await attachCitations(db, entry, params.locale);
  await attachRelatedLinks(db, entry);
  await attachRevisions(db, entry, params.locale);
  return __vite_ssr_import_2__.ok(entry);
});
researchRoutes.get("/research-entries/:documentId/backlinks", async (c) => {
  const documentId = c.req.param("documentId");
  const url = new URL(c.req.url);
  const params = parseListParams(url);
  const db = c.env.DB;
  const self = await db.prepare(`SELECT id, slug FROM research_entries WHERE document_id = ?1`).bind(documentId).first();
  if (!self) return __vite_ssr_import_2__.fail(404, "not_found");
  const likePattern = `%[[${self.slug}%`;
  const rows = await db.prepare(
    `SELECT DISTINCT e.* FROM research_entries e
       WHERE e.${PUBLISHED}
         AND e.slug != ?2
         AND (
           e.id IN (SELECT rl.entry_id FROM entry_related_links rl WHERE rl.target_document_id = ?1)
           OR e.body_json LIKE ?3
         )
       ORDER BY e.updated_at DESC LIMIT 50`
  ).bind(documentId, self.slug, likePattern).all();
  const data = (rows.results ?? []).map((r) => ({ ...entryJson(r, params.locale), body: void 0 }));
  for (const item of data) {
    const linkRows = await db.prepare(
      `SELECT rl.sort_order, te.slug FROM entry_related_links rl
         JOIN research_entries te ON te.document_id = rl.target_document_id AND te.${PUBLISHED}
         WHERE rl.entry_id = ?1 ORDER BY rl.sort_order`
    ).bind(item.id).all();
    item.related_links = (linkRows.results ?? []).map((l) => ({
      target_entry: { slug: l.slug },
      order: l.sort_order
    }));
  }
  return __vite_ssr_import_2__.okPaginated(data, __vite_ssr_import_2__.paginationOf(1, 50, data.length));
});
researchRoutes.get("/research-citations/:documentId/also-cited", async (c) => {
  const documentId = c.req.param("documentId");
  const url = new URL(c.req.url);
  const params = parseListParams(url);
  const db = c.env.DB;
  const citation = await db.prepare(`SELECT id FROM research_citations WHERE document_id = ?1 AND ${PUBLISHED}`).bind(documentId).first();
  if (!citation) return __vite_ssr_import_2__.fail(404, "not_found");
  const excludeSlug = url.searchParams.get("filters[slug][$ne]");
  const rows = await db.prepare(
    `SELECT e.*, ec.entry_id FROM research_entries e
       JOIN entry_citations ec ON ec.entry_id = e.id AND ec.citation_id = ?1
       WHERE e.${PUBLISHED} AND (?2 IS NULL OR e.slug != ?2)
       ORDER BY e.updated_at DESC`
  ).bind(citation.id, excludeSlug).all();
  const data = (rows.results ?? []).map((r) => entryJson(r, params.locale));
  for (const item of data) {
    const own = await db.prepare(`SELECT citation_id FROM entry_citations WHERE entry_id = ?1 ORDER BY citation_id`).bind(item.id).all();
    item.citations = (own.results ?? []).map((r) => ({ id: r.citation_id }));
  }
  return __vite_ssr_import_2__.okPaginated(data, __vite_ssr_import_2__.paginationOf(1, 50, data.length));
});
async function pathStepsFor(db, pathId, locale) {
  const steps = await db.prepare(
    `SELECT ps.id, ps.target_document_id, ps.step_note_json, ps.sort_order
       FROM path_steps ps WHERE ps.path_id = ?1 ORDER BY ps.sort_order, ps.id`
  ).bind(pathId).all();
  const result = [];
  for (const step of steps.results ?? []) {
    const entry = await db.prepare(
      `SELECT id, document_id, slug, title_json, summary_json FROM research_entries
         WHERE document_id = ?1 AND ${PUBLISHED}`
    ).bind(step.target_document_id).first();
    result.push({
      id: step.id,
      entry: entry ? {
        id: entry.id,
        documentId: entry.document_id,
        title: __vite_ssr_import_1__.pickLocale(entry.title_json, locale),
        slug: entry.slug,
        summary: entry.summary_json === null ? void 0 : __vite_ssr_import_1__.pickLocale(entry.summary_json, locale)
      } : void 0,
      step_note: step.step_note_json === null ? void 0 : __vite_ssr_import_1__.pickLocale(step.step_note_json, locale)
    });
  }
  return result;
}
researchRoutes.get("/research-paths", async (c) => {
  const url = new URL(c.req.url);
  const params = parseListParams(url);
  const db = c.env.DB;
  const entrySlug = url.searchParams.get("filters[steps][entry][slug][$eq]");
  let where = "";
  const binds = [];
  if (entrySlug !== null) {
    where = ` AND id IN (
      SELECT ps.path_id FROM path_steps ps
      JOIN research_entries e ON e.document_id = ps.target_document_id AND e.${PUBLISHED}
      WHERE e.slug = ?)`;
    binds.push(entrySlug);
  }
  const totalRow = await db.prepare(`SELECT COUNT(*) AS n FROM research_paths WHERE ${PUBLISHED}${where}`).bind(...binds).first();
  const total = totalRow?.n ?? 0;
  const rows = await db.prepare(
    `SELECT * FROM research_paths WHERE ${PUBLISHED}${where}
       ORDER BY sort_order ASC, updated_at DESC LIMIT ?${binds.length + 1} OFFSET ?${binds.length + 2}`
  ).bind(...binds, params.pageSize, (params.page - 1) * params.pageSize).all();
  const data = (rows.results ?? []).map((r) => pathJson(r, params.locale));
  for (const p of data) {
    ;
    p.steps = await pathStepsFor(db, p.id, params.locale);
  }
  return __vite_ssr_import_2__.okPaginated(data, __vite_ssr_import_2__.paginationOf(params.page, params.pageSize, total));
});
researchRoutes.get("/research-paths/:slug", async (c) => {
  const slug = c.req.param("slug");
  if (slug === "neighbors") return __vite_ssr_import_2__.fail(404, "not_found");
  const url = new URL(c.req.url);
  const params = parseListParams(url);
  const db = c.env.DB;
  const row = await db.prepare(`SELECT * FROM research_paths WHERE slug = ?1 AND ${PUBLISHED}`).bind(slug).first();
  if (!row) return __vite_ssr_import_2__.fail(404, "not_found");
  const path = pathJson(row, params.locale);
  path.steps = await pathStepsFor(db, row.id, params.locale);
  return __vite_ssr_import_2__.ok(path);
});
researchRoutes.get("/research-paths/:slug/neighbors/:entryDocumentId", async (c) => {
  const slug = c.req.param("slug");
  const entryDoc = c.req.param("entryDocumentId");
  const url = new URL(c.req.url);
  const params = parseListParams(url);
  const db = c.env.DB;
  const path = await db.prepare(`SELECT id FROM research_paths WHERE slug = ?1 AND ${PUBLISHED}`).bind(slug).first();
  if (!path) return __vite_ssr_import_2__.fail(404, "path_not_found");
  const steps = await pathStepsFor(db, path.id, params.locale);
  const withEntry = steps.filter((s) => s.entry !== void 0);
  const idx = withEntry.findIndex((s) => s.entry.documentId === entryDoc);
  if (idx === -1) return __vite_ssr_import_2__.fail(404, "entry_not_in_path");
  const prev = idx > 0 ? withEntry[idx - 1].entry : null;
  const next = idx < withEntry.length - 1 ? withEntry[idx + 1].entry : null;
  return __vite_ssr_import_2__.ok({
    path: { slug },
    previous: prev ? { documentId: prev.documentId, slug: prev.slug, title: prev.title } : null,
    next: next ? { documentId: next.documentId, slug: next.slug, title: next.title } : null
  });
});
researchRoutes.get("/research-themes", async (c) => {
  const url = new URL(c.req.url);
  const params = parseListParams(url);
  const db = c.env.DB;
  const totalRow = await db.prepare(`SELECT COUNT(*) AS n FROM research_themes WHERE ${PUBLISHED}`).first();
  const rows = await db.prepare(
    `SELECT * FROM research_themes WHERE ${PUBLISHED}
       ORDER BY title_json ASC, id ASC LIMIT ?1 OFFSET ?2`
  ).bind(params.pageSize, (params.page - 1) * params.pageSize).all();
  return __vite_ssr_import_2__.okPaginated(
    (rows.results ?? []).map((r) => themeJson(r, params.locale)),
    __vite_ssr_import_2__.paginationOf(params.page, params.pageSize, totalRow?.n ?? 0)
  );
});
researchRoutes.get("/research-themes/:slug", async (c) => {
  const slug = c.req.param("slug");
  const url = new URL(c.req.url);
  const params = parseListParams(url);
  const row = await c.env.DB.prepare(`SELECT * FROM research_themes WHERE slug = ?1 AND ${PUBLISHED}`).bind(slug).first();
  if (!row) return __vite_ssr_import_2__.fail(404, "not_found");
  return __vite_ssr_import_2__.ok(themeJson(row, params.locale));
});
researchRoutes.get("/research-subjects", async (c) => {
  const url = new URL(c.req.url);
  const params = parseListParams(url);
  const db = c.env.DB;
  const studentIdEq = url.searchParams.get("filters[$or][0][students][id][$eq]");
  const studentDocEq = url.searchParams.get("filters[$or][1][students][documentId][$eq]");
  let where = "";
  const binds = [];
  if (studentIdEq !== null || studentDocEq !== null) {
    const conds = [];
    if (studentIdEq !== null) {
      conds.push("ss.student_id = ?");
      binds.push(Number(studentIdEq));
    }
    if (studentDocEq !== null) {
      conds.push("st.document_id = ?");
      binds.push(studentDocEq);
    }
    where = ` AND id IN (
      SELECT ss.subject_id FROM subject_students ss
      JOIN students st ON st.id = ss.student_id
      WHERE st.${PUBLISHED} AND (${conds.join(" OR ")}))`;
  }
  const totalRow = await db.prepare(`SELECT COUNT(*) AS n FROM research_subjects WHERE ${PUBLISHED}${where}`).bind(...binds).first();
  const rows = await db.prepare(
    `SELECT * FROM research_subjects WHERE ${PUBLISHED}${where}
       ORDER BY title_json ASC, id ASC LIMIT ?${binds.length + 1} OFFSET ?${binds.length + 2}`
  ).bind(...binds, params.pageSize, (params.page - 1) * params.pageSize).all();
  const data = (rows.results ?? []).map((r) => subjectJson(r, params.locale));
  if (studentIdEq !== null || studentDocEq !== null) {
    for (const s of data) {
      const entries = await db.prepare(
        `SELECT e.id, e.document_id, e.slug, e.title_json FROM entry_subjects es
           JOIN research_entries e ON e.id = es.entry_id AND e.${PUBLISHED}
           WHERE es.subject_id = ?1 ORDER BY e.updated_at DESC`
      ).bind(s.id).all();
      s.entries = (entries.results ?? []).map((e) => ({
        id: e.id,
        documentId: e.document_id,
        title: __vite_ssr_import_1__.pickLocale(e.title_json, params.locale),
        slug: e.slug
      }));
    }
  }
  return __vite_ssr_import_2__.okPaginated(data, __vite_ssr_import_2__.paginationOf(params.page, params.pageSize, totalRow?.n ?? 0));
});
researchRoutes.get("/research-subjects/:slug", async (c) => {
  const slug = c.req.param("slug");
  const url = new URL(c.req.url);
  const params = parseListParams(url);
  const db = c.env.DB;
  const row = await db.prepare(`SELECT * FROM research_subjects WHERE slug = ?1 AND ${PUBLISHED}`).bind(slug).first();
  if (!row) return __vite_ssr_import_2__.fail(404, "not_found");
  const subject = subjectJson(row, params.locale);
  const students = await db.prepare(
    `SELECT st.* FROM subject_students ss
       JOIN students st ON st.id = ss.student_id AND st.${PUBLISHED}
       WHERE ss.subject_id = ?1 ORDER BY st.name ASC`
  ).bind(row.id).all();
  subject.students = (students.results ?? []).map((st) => ({
    id: st.id,
    documentId: st.document_id,
    name: st.name,
    avatar: st.avatar_url ? { url: st.avatar_url } : null,
    organization: st.organization ?? void 0
  }));
  return __vite_ssr_import_2__.ok(subject);
});
researchRoutes.get("/research-graph", async (c) => {
  const url = new URL(c.req.url);
  const params = parseListParams(url);
  const db = c.env.DB;
  const rows = await db.prepare(
    `SELECT * FROM research_entries WHERE ${PUBLISHED} ORDER BY updated_at DESC LIMIT 200`
  ).all();
  const entries = (rows.results ?? []).map((r) => entryJson(r, params.locale));
  await attachThemes(db, entries, params.locale);
  await attachSubjects(db, entries, params.locale);
  const allLinks = await db.prepare(
    `SELECT rl.entry_id, rl.target_document_id, rl.relation_type,
              te.document_id AS target_doc
       FROM entry_related_links rl
       JOIN research_entries te ON te.document_id = rl.target_document_id AND te.${PUBLISHED}
       WHERE rl.entry_id IN (${entries.map(() => "?").join(",") || "NULL"})`
  ).bind(...entries.map((e) => e.id)).all();
  const docIdByInternal = new Map(entries.map((e) => [e.id, e.documentId]));
  const linksByEntry = /* @__PURE__ */ new Map();
  for (const l of allLinks.results ?? []) {
    let list = linksByEntry.get(l.entry_id);
    if (!list) linksByEntry.set(l.entry_id, list = []);
    list.push({ target_doc: l.target_doc, relation_type: l.relation_type });
  }
  const nodes = [];
  const edges = [];
  for (const e of entries) {
    nodes.push({
      id: e.documentId,
      title: e.title,
      slug: e.slug,
      media_type: e.media_type,
      body: e.body,
      themes: (e.themes ?? []).map((t) => ({ name: t.name, slug: t.slug })),
      subjects: (e.subjects ?? []).map((s) => ({ name: s.name, slug: s.slug }))
    });
    for (const l of linksByEntry.get(e.id) ?? []) {
      edges.push({
        source: docIdByInternal.get(e.id) ?? e.documentId,
        target: l.target_doc,
        relation_type: l.relation_type
      });
    }
  }
  return __vite_ssr_import_2__.ok({ nodes, edges });
});

//# sourceMappingSource=vite-node
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUFFO0FBQUEsTUFDcEUsV0FBVyxFQUFFLFlBQVksQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sTUFBTSxFQUFFLEtBQUssRUFBRTtBQUFBLElBQzFFLENBQUM7QUFDRCxlQUFXLEtBQUssYUFBYSxJQUFJLEVBQUUsRUFBRSxLQUFLLENBQUMsR0FBRztBQUM1QyxZQUFNLEtBQUs7QUFBQSxRQUNULFFBQVEsZ0JBQWdCLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRTtBQUFBLFFBQ3ZDLFFBQVEsRUFBRTtBQUFBLFFBQ1YsZUFBZSxFQUFFO0FBQUEsTUFDbkIsQ0FBQztBQUFBLElBQ0g7QUFBQSxFQUNGO0FBQ0EsU0FBTyx5QkFBRyxFQUFFLE9BQU8sTUFBTSxDQUFDO0FBQzVCLENBQUMiLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbInJlc2VhcmNoLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICog6ICD5o2u5Z+f5YWs5byAIEFQSe+8iFJlc2VhcmNoIEFyY2hpdmVz77yJ44CCXG4gKiDlpZHnuqbmnaXmupDvvJpmcm9udGVuZC90ZXN0cy9jb250cmFjdHMvcmVzZWFyY2gudHMgKyBmcm9udGVuZC9zcmMvbGliL2FwaS9yZXNlYXJjaC50c+OAglxuICpcbiAqIOerr+eCue+8mlxuICogLSBHRVQgL3Jlc2VhcmNoLWVudHJpZXMgICAgICAgICAgICAgICAg5YiX6KGo77yIdGhlbWVzL3N1YmplY3RzL3Nwb2lsZXJfdGllciBwb3B1bGF0Ze+8jGxvY2FsZSDlm57pgIDvvIlcbiAqIC0gR0VUIC9yZXNlYXJjaC1lbnRyaWVzLzpzbHVnICAgICAgICAgIOivpuaDhe+8iGNpdGF0aW9ucy9yZWxhdGVkX2xpbmtzL3JldmlzaW9ucyBwb3B1bGF0Ze+8iVxuICogLSBHRVQgL3Jlc2VhcmNoLWVudHJpZXMvOmRvY3VtZW50SWQvYmFja2xpbmtzICAg5Y+N5ZCR6ZO+5o6l77yIcmVsYXRlZF9saW5rcyDovrkg4oiqIOato+aWhyBbW3NsdWddXe+8iVxuICogLSBHRVQgL3Jlc2VhcmNoLWNpdGF0aW9ucy86ZG9jdW1lbnRJZC9hbHNvLWNpdGVkIOW8leivgeWPjeafpVxuICogLSBHRVQgL3Jlc2VhcmNoLXBhdGhzICAgICAgICAgICAgICAgICAg6ZiF6K+76Lev5b6E5YiX6KGo77yIc3RlcHMg5oyJIHNvcnRfb3JkZXLvvIlcbiAqIC0gR0VUIC9yZXNlYXJjaC1wYXRocy86c2x1ZyAgICAgICAgICAgIOi3r+W+hOivpuaDhVxuICogLSBHRVQgL3Jlc2VhcmNoLXBhdGhzLzpzbHVnL25laWdoYm9ycy86ZW50cnlEb2N1bWVudElkICDmnaHnm67lnKjot6/lvoTkuK3nmoTkuIrkuIvnr4dcbiAqIC0gR0VUIC9yZXNlYXJjaC10aGVtZXMsIC9yZXNlYXJjaC10aGVtZXMvOnNsdWdcbiAqIC0gR0VUIC9yZXNlYXJjaC1zdWJqZWN0cywgL3Jlc2VhcmNoLXN1YmplY3RzLzpzbHVn77yI5ZCr5YWz6IGU5a2m55Sf5Y2h77yJXG4gKiAtIEdFVCAvcmVzZWFyY2gtZ3JhcGggICAgICAgICAgICAgICAgICDlm77osLHogZrlkIjvvIjoioLngrkr6L6577yJXG4gKi9cbmltcG9ydCB7IEhvbm8gfSBmcm9tICdob25vJ1xuaW1wb3J0IHR5cGUgeyBFbnYgfSBmcm9tICcuLi9pbmRleCdcbmltcG9ydCB7IHBpY2tMb2NhbGUgfSBmcm9tICcuLi9saWIvaTE4bidcbmltcG9ydCB7IG9rLCBva1BhZ2luYXRlZCwgZmFpbCwgcGFnaW5hdGlvbk9mIH0gZnJvbSAnLi4vbGliL3Jlc3BvbmQnXG5cbnR5cGUgQmluZGluZ3MgPSB7IEJpbmRpbmdzOiBFbnYgfVxuXG5leHBvcnQgY29uc3QgcmVzZWFyY2hSb3V0ZXMgPSBuZXcgSG9ubzxCaW5kaW5ncz4oKVxuXG4vLyDilIDilIAg6KGM57G75Z6LIOKUgOKUgFxuXG5pbnRlcmZhY2UgRW50cnlSb3cge1xuICBpZDogbnVtYmVyXG4gIGRvY3VtZW50X2lkOiBzdHJpbmdcbiAgc2x1Zzogc3RyaW5nXG4gIHRpdGxlX2pzb246IHN0cmluZ1xuICBzdW1tYXJ5X2pzb246IHN0cmluZyB8IG51bGxcbiAgYm9keV9qc29uOiBzdHJpbmcgfCBudWxsXG4gIHN0YW5jZTogc3RyaW5nXG4gIG1lZGlhX3R5cGU6IHN0cmluZ1xuICBzcG9pbGVyX3RpZXJfaWQ6IG51bWJlciB8IG51bGxcbiAgY3JlYXRlZF9hdDogbnVtYmVyXG4gIHVwZGF0ZWRfYXQ6IG51bWJlclxuICBwdWJsaXNoZWRfYXQ6IG51bWJlciB8IG51bGxcbn1cblxuaW50ZXJmYWNlIFRoZW1lUm93IHtcbiAgaWQ6IG51bWJlclxuICBkb2N1bWVudF9pZDogc3RyaW5nXG4gIHNsdWc6IHN0cmluZ1xuICB0aXRsZV9qc29uOiBzdHJpbmdcbiAgY3VyYXRlZF9pbnRyb19qc29uOiBzdHJpbmcgfCBudWxsXG4gIGNyZWF0ZWRfYXQ6IG51bWJlclxuICB1cGRhdGVkX2F0OiBudW1iZXJcbiAgcHVibGlzaGVkX2F0OiBudW1iZXIgfCBudWxsXG59XG5cbmludGVyZmFjZSBTdWJqZWN0Um93IHtcbiAgaWQ6IG51bWJlclxuICBkb2N1bWVudF9pZDogc3RyaW5nXG4gIHNsdWc6IHN0cmluZ1xuICB0aXRsZV9qc29uOiBzdHJpbmdcbiAgZGVzY3JpcHRpb25fanNvbjogc3RyaW5nIHwgbnVsbFxuICBzdWJqZWN0X3R5cGU6IHN0cmluZ1xuICBjb3Zlcl91cmw6IHN0cmluZyB8IG51bGxcbiAgY3JlYXRlZF9hdDogbnVtYmVyXG4gIHVwZGF0ZWRfYXQ6IG51bWJlclxuICBwdWJsaXNoZWRfYXQ6IG51bWJlciB8IG51bGxcbn1cblxuaW50ZXJmYWNlIFBhdGhSb3cge1xuICBpZDogbnVtYmVyXG4gIGRvY3VtZW50X2lkOiBzdHJpbmdcbiAgc2x1Zzogc3RyaW5nXG4gIHRpdGxlX2pzb246IHN0cmluZ1xuICBkZXNjcmlwdGlvbl9qc29uOiBzdHJpbmcgfCBudWxsXG4gIGRpZmZpY3VsdHk6IHN0cmluZyB8IG51bGxcbiAgc29ydF9vcmRlcjogbnVtYmVyXG4gIGNyZWF0ZWRfYXQ6IG51bWJlclxuICB1cGRhdGVkX2F0OiBudW1iZXJcbiAgcHVibGlzaGVkX2F0OiBudW1iZXIgfCBudWxsXG59XG5cbmludGVyZmFjZSBDaXRhdGlvblJvdyB7XG4gIGlkOiBudW1iZXJcbiAgZG9jdW1lbnRfaWQ6IHN0cmluZ1xuICBjbGFpbV9zaG9ydF9qc29uOiBzdHJpbmcgfCBudWxsXG4gIHNvdXJjZV90eXBlOiBzdHJpbmcgfCBudWxsXG4gIHNvdXJjZV9yZWY6IHN0cmluZyB8IG51bGxcbiAgc291cmNlX3F1b3RlX2pzb246IHN0cmluZyB8IG51bGxcbiAgY29uZmlkZW5jZTogc3RyaW5nIHwgbnVsbFxuICBjcmVhdGVkX2F0OiBudW1iZXJcbiAgdXBkYXRlZF9hdDogbnVtYmVyXG4gIHB1Ymxpc2hlZF9hdDogbnVtYmVyIHwgbnVsbFxufVxuXG5jb25zdCBQVUJMSVNIRUQgPSAncHVibGlzaGVkX2F0IElTIE5PVCBOVUxMJ1xuXG5mdW5jdGlvbiBpc28obXM6IG51bWJlciB8IG51bGwpOiBzdHJpbmcge1xuICByZXR1cm4gbXMgPT09IG51bGwgPyAnJyA6IG5ldyBEYXRlKG1zKS50b0lTT1N0cmluZygpXG59XG5cbi8qKiBTdHJhcGkg6aOO5qC85p2h55uuIOKGkiBKU09O77ya5pWw5a2XIGlkIOWGhemDqOS/neeVme+8jGRvY3VtZW50SWQg5a+55aSW77ybaTE4biDliJfnu48gcGlja0xvY2FsZSDop6PmnpAgKi9cbmV4cG9ydCBpbnRlcmZhY2UgRW50cnlKc29uIHtcbiAgaWQ6IG51bWJlclxuICBkb2N1bWVudElkOiBzdHJpbmdcbiAgdGl0bGU6IHN0cmluZ1xuICBzbHVnOiBzdHJpbmdcbiAgc3RhbmNlOiBzdHJpbmdcbiAgc3VtbWFyeT86IHN0cmluZ1xuICBib2R5Pzogc3RyaW5nXG4gIG1lZGlhX3R5cGU6IHN0cmluZ1xuICBzcG9pbGVyX3RpZXI/OiBTcG9pbGVyVGllckpzb24gfCBudWxsXG4gIHRoZW1lcz86IFRoZW1lSnNvbltdXG4gIHN1YmplY3RzPzogU3ViamVjdEpzb25bXVxuICBjaXRhdGlvbnM/OiB1bmtub3duW11cbiAgcmVsYXRlZF9saW5rcz86IHVua25vd25bXVxuICByZXZpc2lvbnM/OiB1bmtub3duW11cbiAgY3JlYXRlZEF0OiBzdHJpbmdcbiAgdXBkYXRlZEF0OiBzdHJpbmdcbiAgcHVibGlzaGVkQXQ6IHN0cmluZ1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNwb2lsZXJUaWVySnNvbiB7XG4gIGlkOiBudW1iZXJcbiAgZG9jdW1lbnRJZDogc3RyaW5nXG4gIG5hbWU6IHN0cmluZ1xuICBrZXk6IHN0cmluZ1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRoZW1lSnNvbiB7XG4gIGlkOiBudW1iZXJcbiAgZG9jdW1lbnRJZDogc3RyaW5nXG4gIG5hbWU6IHN0cmluZ1xuICBzbHVnOiBzdHJpbmdcbiAgY3VyYXRlZF9pbnRybz86IHN0cmluZ1xuICBjcmVhdGVkQXQ6IHN0cmluZ1xuICB1cGRhdGVkQXQ6IHN0cmluZ1xuICBwdWJsaXNoZWRBdDogc3RyaW5nXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3ViamVjdEpzb24ge1xuICBpZDogbnVtYmVyXG4gIGRvY3VtZW50SWQ6IHN0cmluZ1xuICBuYW1lOiBzdHJpbmdcbiAgc2x1Zzogc3RyaW5nXG4gIHN1YmplY3RfdHlwZTogc3RyaW5nXG4gIGRlc2NyaXB0aW9uPzogc3RyaW5nXG4gIGNvdmVyPzogeyB1cmw6IHN0cmluZyB9XG4gIHN0dWRlbnRzPzogdW5rbm93bltdXG4gIGVudHJpZXM/OiBBcnJheTx7IGlkOiBudW1iZXI7IGRvY3VtZW50SWQ6IHN0cmluZzsgdGl0bGU6IHN0cmluZzsgc2x1Zzogc3RyaW5nIH0+XG4gIGNyZWF0ZWRBdDogc3RyaW5nXG4gIHVwZGF0ZWRBdDogc3RyaW5nXG4gIHB1Ymxpc2hlZEF0OiBzdHJpbmdcbn1cblxuZnVuY3Rpb24gZW50cnlKc29uKHJvdzogRW50cnlSb3csIGxvY2FsZTogc3RyaW5nKTogRW50cnlKc29uIHtcbiAgcmV0dXJuIHtcbiAgICBpZDogcm93LmlkLFxuICAgIGRvY3VtZW50SWQ6IHJvdy5kb2N1bWVudF9pZCxcbiAgICB0aXRsZTogcGlja0xvY2FsZShyb3cudGl0bGVfanNvbiwgbG9jYWxlKSxcbiAgICBzbHVnOiByb3cuc2x1ZyxcbiAgICBzdGFuY2U6IHJvdy5zdGFuY2UsXG4gICAgc3VtbWFyeTogcm93LnN1bW1hcnlfanNvbiA9PT0gbnVsbCA/IHVuZGVmaW5lZCA6IHBpY2tMb2NhbGUocm93LnN1bW1hcnlfanNvbiwgbG9jYWxlKSxcbiAgICBib2R5OiByb3cuYm9keV9qc29uID09PSBudWxsID8gdW5kZWZpbmVkIDogcGlja0xvY2FsZShyb3cuYm9keV9qc29uLCBsb2NhbGUpLFxuICAgIG1lZGlhX3R5cGU6IHJvdy5tZWRpYV90eXBlLFxuICAgIGNyZWF0ZWRBdDogaXNvKHJvdy5jcmVhdGVkX2F0KSxcbiAgICB1cGRhdGVkQXQ6IGlzbyhyb3cudXBkYXRlZF9hdCksXG4gICAgcHVibGlzaGVkQXQ6IGlzbyhyb3cucHVibGlzaGVkX2F0KSxcbiAgfVxufVxuXG5mdW5jdGlvbiB0aGVtZUpzb24ocm93OiBUaGVtZVJvdywgbG9jYWxlOiBzdHJpbmcpOiBUaGVtZUpzb24ge1xuICByZXR1cm4ge1xuICAgIGlkOiByb3cuaWQsXG4gICAgZG9jdW1lbnRJZDogcm93LmRvY3VtZW50X2lkLFxuICAgIG5hbWU6IHBpY2tMb2NhbGUocm93LnRpdGxlX2pzb24sIGxvY2FsZSksXG4gICAgc2x1Zzogcm93LnNsdWcsXG4gICAgY3VyYXRlZF9pbnRybzpcbiAgICAgIHJvdy5jdXJhdGVkX2ludHJvX2pzb24gPT09IG51bGwgPyB1bmRlZmluZWQgOiBwaWNrTG9jYWxlKHJvdy5jdXJhdGVkX2ludHJvX2pzb24sIGxvY2FsZSksXG4gICAgY3JlYXRlZEF0OiBpc28ocm93LmNyZWF0ZWRfYXQpLFxuICAgIHVwZGF0ZWRBdDogaXNvKHJvdy51cGRhdGVkX2F0KSxcbiAgICBwdWJsaXNoZWRBdDogaXNvKHJvdy5wdWJsaXNoZWRfYXQpLFxuICB9XG59XG5cbmZ1bmN0aW9uIHN1YmplY3RKc29uKHJvdzogU3ViamVjdFJvdywgbG9jYWxlOiBzdHJpbmcpOiBTdWJqZWN0SnNvbiB7XG4gIHJldHVybiB7XG4gICAgaWQ6IHJvdy5pZCxcbiAgICBkb2N1bWVudElkOiByb3cuZG9jdW1lbnRfaWQsXG4gICAgbmFtZTogcGlja0xvY2FsZShyb3cudGl0bGVfanNvbiwgbG9jYWxlKSxcbiAgICBzbHVnOiByb3cuc2x1ZyxcbiAgICBzdWJqZWN0X3R5cGU6IHJvdy5zdWJqZWN0X3R5cGUsXG4gICAgZGVzY3JpcHRpb246XG4gICAgICByb3cuZGVzY3JpcHRpb25fanNvbiA9PT0gbnVsbCA/IHVuZGVmaW5lZCA6IHBpY2tMb2NhbGUocm93LmRlc2NyaXB0aW9uX2pzb24sIGxvY2FsZSksXG4gICAgY292ZXI6IHJvdy5jb3Zlcl91cmwgPyB7IHVybDogcm93LmNvdmVyX3VybCB9IDogdW5kZWZpbmVkLFxuICAgIGNyZWF0ZWRBdDogaXNvKHJvdy5jcmVhdGVkX2F0KSxcbiAgICB1cGRhdGVkQXQ6IGlzbyhyb3cudXBkYXRlZF9hdCksXG4gICAgcHVibGlzaGVkQXQ6IGlzbyhyb3cucHVibGlzaGVkX2F0KSxcbiAgfVxufVxuXG5mdW5jdGlvbiBwYXRoSnNvbihyb3c6IFBhdGhSb3csIGxvY2FsZTogc3RyaW5nKSB7XG4gIHJldHVybiB7XG4gICAgaWQ6IHJvdy5pZCxcbiAgICBkb2N1bWVudElkOiByb3cuZG9jdW1lbnRfaWQsXG4gICAgdGl0bGU6IHBpY2tMb2NhbGUocm93LnRpdGxlX2pzb24sIGxvY2FsZSksXG4gICAgc2x1Zzogcm93LnNsdWcsXG4gICAgZGVzY3JpcHRpb246XG4gICAgICByb3cuZGVzY3JpcHRpb25fanNvbiA9PT0gbnVsbCA/IHVuZGVmaW5lZCA6IHBpY2tMb2NhbGUocm93LmRlc2NyaXB0aW9uX2pzb24sIGxvY2FsZSksXG4gICAgZGlmZmljdWx0eTogcm93LmRpZmZpY3VsdHkgPz8gdW5kZWZpbmVkLFxuICAgIG9yZGVyOiByb3cuc29ydF9vcmRlcixcbiAgICBjcmVhdGVkQXQ6IGlzbyhyb3cuY3JlYXRlZF9hdCksXG4gICAgdXBkYXRlZEF0OiBpc28ocm93LnVwZGF0ZWRfYXQpLFxuICAgIHB1Ymxpc2hlZEF0OiBpc28ocm93LnB1Ymxpc2hlZF9hdCksXG4gIH1cbn1cblxuZnVuY3Rpb24gY2l0YXRpb25Kc29uKHJvdzogQ2l0YXRpb25Sb3csIGxvY2FsZTogc3RyaW5nKSB7XG4gIHJldHVybiB7XG4gICAgaWQ6IHJvdy5pZCxcbiAgICBkb2N1bWVudElkOiByb3cuZG9jdW1lbnRfaWQsXG4gICAgY2xhaW1fc2hvcnQ6XG4gICAgICByb3cuY2xhaW1fc2hvcnRfanNvbiA9PT0gbnVsbCA/IHVuZGVmaW5lZCA6IHBpY2tMb2NhbGUocm93LmNsYWltX3Nob3J0X2pzb24sIGxvY2FsZSksXG4gICAgc291cmNlX3R5cGU6IHJvdy5zb3VyY2VfdHlwZSA/PyB1bmRlZmluZWQsXG4gICAgc291cmNlX3JlZjogcm93LnNvdXJjZV9yZWYgPz8gdW5kZWZpbmVkLFxuICAgIHNvdXJjZV9xdW90ZTpcbiAgICAgIHJvdy5zb3VyY2VfcXVvdGVfanNvbiA9PT0gbnVsbCA/IHVuZGVmaW5lZCA6IHBpY2tMb2NhbGUocm93LnNvdXJjZV9xdW90ZV9qc29uLCBsb2NhbGUpLFxuICAgIGNvbmZpZGVuY2U6IHJvdy5jb25maWRlbmNlID8/IHVuZGVmaW5lZCxcbiAgICAvLyDlpZHnuqYgY29uc3VtZSDmnIkgY2l0YXRpb25zW10uc291cmNlX2ltYWdl77ya5pysIHNjaGVtYSDml6DlqpLkvZPooajvvIzmgZLkuLogbnVsbCDljaDkvY1cbiAgICBzb3VyY2VfaW1hZ2U6IG51bGwsXG4gICAgY3JlYXRlZEF0OiBpc28ocm93LmNyZWF0ZWRfYXQpLFxuICAgIHVwZGF0ZWRBdDogaXNvKHJvdy51cGRhdGVkX2F0KSxcbiAgICBwdWJsaXNoZWRBdDogaXNvKHJvdy5wdWJsaXNoZWRfYXQpLFxuICB9XG59XG5cbi8vIOKUgOKUgCBwb3B1bGF0ZSDnu4Too4XvvIjlhbPogZTooajkuKTmrrXlvI8gSU4g5p+l6K+i77yJ4pSA4pSAXG5cbmFzeW5jIGZ1bmN0aW9uIGF0dGFjaFRoZW1lcyhkYjogRDFEYXRhYmFzZSwgZW50cmllczogRW50cnlKc29uW10sIGxvY2FsZTogc3RyaW5nKSB7XG4gIGlmIChlbnRyaWVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG4gIGNvbnN0IGlkcyA9IGVudHJpZXMubWFwKChlKSA9PiBlLmlkKVxuICBjb25zdCBtYXJrcyA9IGlkcy5tYXAoKCkgPT4gJz8nKS5qb2luKCcsJylcbiAgY29uc3Qgcm93cyA9IGF3YWl0IGRiXG4gICAgLnByZXBhcmUoXG4gICAgICBgU0VMRUNUIGV0LmVudHJ5X2lkLCB0LmlkLCB0LmRvY3VtZW50X2lkLCB0LnNsdWcsIHQudGl0bGVfanNvbiwgdC5jdXJhdGVkX2ludHJvX2pzb24sXG4gICAgICAgICAgICAgIHQuY3JlYXRlZF9hdCwgdC51cGRhdGVkX2F0LCB0LnB1Ymxpc2hlZF9hdFxuICAgICAgIEZST00gZW50cnlfdGhlbWVzIGV0IEpPSU4gcmVzZWFyY2hfdGhlbWVzIHQgT04gdC5pZCA9IGV0LnRoZW1lX2lkXG4gICAgICAgV0hFUkUgdC4ke1BVQkxJU0hFRH0gQU5EIGV0LmVudHJ5X2lkIElOICgke21hcmtzfSkgT1JERVIgQlkgZXQuZW50cnlfaWQsIHQuaWRgXG4gICAgKVxuICAgIC5iaW5kKC4uLmlkcylcbiAgICAuYWxsPFRoZW1lUm93ICYgeyBlbnRyeV9pZDogbnVtYmVyIH0+KClcbiAgY29uc3QgYnlFbnRyeSA9IG5ldyBNYXA8bnVtYmVyLCBUaGVtZUpzb25bXT4oKVxuICBmb3IgKGNvbnN0IHIgb2Ygcm93cy5yZXN1bHRzID8/IFtdKSB7XG4gICAgbGV0IGxpc3QgPSBieUVudHJ5LmdldChyLmVudHJ5X2lkKVxuICAgIGlmICghbGlzdCkgYnlFbnRyeS5zZXQoci5lbnRyeV9pZCwgKGxpc3QgPSBbXSkpXG4gICAgbGlzdC5wdXNoKHRoZW1lSnNvbihyIGFzIFRoZW1lUm93LCBsb2NhbGUpKVxuICB9XG4gIGZvciAoY29uc3QgZSBvZiBlbnRyaWVzKSBlLnRoZW1lcyA9IGJ5RW50cnkuZ2V0KGUuaWQpID8/IFtdXG59XG5cbmFzeW5jIGZ1bmN0aW9uIGF0dGFjaFN1YmplY3RzKGRiOiBEMURhdGFiYXNlLCBlbnRyaWVzOiBFbnRyeUpzb25bXSwgbG9jYWxlOiBzdHJpbmcpIHtcbiAgaWYgKGVudHJpZXMubGVuZ3RoID09PSAwKSByZXR1cm5cbiAgY29uc3QgaWRzID0gZW50cmllcy5tYXAoKGUpID0+IGUuaWQpXG4gIGNvbnN0IG1hcmtzID0gaWRzLm1hcCgoKSA9PiAnPycpLmpvaW4oJywnKVxuICBjb25zdCByb3dzID0gYXdhaXQgZGJcbiAgICAucHJlcGFyZShcbiAgICAgIGBTRUxFQ1QgZXMuZW50cnlfaWQsIHMuaWQsIHMuZG9jdW1lbnRfaWQsIHMuc2x1Zywgcy50aXRsZV9qc29uLCBzLmRlc2NyaXB0aW9uX2pzb24sXG4gICAgICAgICAgICAgIHMuc3ViamVjdF90eXBlLCBzLmNvdmVyX3VybCwgcy5jcmVhdGVkX2F0LCBzLnVwZGF0ZWRfYXQsIHMucHVibGlzaGVkX2F0XG4gICAgICAgRlJPTSBlbnRyeV9zdWJqZWN0cyBlcyBKT0lOIHJlc2VhcmNoX3N1YmplY3RzIHMgT04gcy5pZCA9IGVzLnN1YmplY3RfaWRcbiAgICAgICBXSEVSRSBzLiR7UFVCTElTSEVEfSBBTkQgZXMuZW50cnlfaWQgSU4gKCR7bWFya3N9KSBPUkRFUiBCWSBlcy5lbnRyeV9pZCwgcy5pZGBcbiAgICApXG4gICAgLmJpbmQoLi4uaWRzKVxuICAgIC5hbGw8U3ViamVjdFJvdyAmIHsgZW50cnlfaWQ6IG51bWJlciB9PigpXG4gIGNvbnN0IGJ5RW50cnkgPSBuZXcgTWFwPG51bWJlciwgU3ViamVjdEpzb25bXT4oKVxuICBmb3IgKGNvbnN0IHIgb2Ygcm93cy5yZXN1bHRzID8/IFtdKSB7XG4gICAgbGV0IGxpc3QgPSBieUVudHJ5LmdldChyLmVudHJ5X2lkKVxuICAgIGlmICghbGlzdCkgYnlFbnRyeS5zZXQoci5lbnRyeV9pZCwgKGxpc3QgPSBbXSkpXG4gICAgbGlzdC5wdXNoKHN1YmplY3RKc29uKHIgYXMgU3ViamVjdFJvdywgbG9jYWxlKSlcbiAgfVxuICBmb3IgKGNvbnN0IGUgb2YgZW50cmllcykgZS5zdWJqZWN0cyA9IGJ5RW50cnkuZ2V0KGUuaWQpID8/IFtdXG59XG5cbmFzeW5jIGZ1bmN0aW9uIGF0dGFjaFNwb2lsZXJUaWVycyhkYjogRDFEYXRhYmFzZSwgZW50cmllczogRW50cnlKc29uW10pIHtcbiAgaWYgKGVudHJpZXMubGVuZ3RoID09PSAwKSByZXR1cm5cbiAgY29uc3QgaWRzTWFya3MgPSBlbnRyaWVzLm1hcCgoKSA9PiAnPycpLmpvaW4oJywnKVxuICBjb25zdCBsaW5rUm93cyA9IGF3YWl0IGRiXG4gICAgLnByZXBhcmUoXG4gICAgICBgU0VMRUNUIGlkLCBzcG9pbGVyX3RpZXJfaWQgRlJPTSByZXNlYXJjaF9lbnRyaWVzIFdIRVJFICR7UFVCTElTSEVEfSBBTkQgaWQgSU4gKCR7aWRzTWFya3N9KWBcbiAgICApXG4gICAgLmJpbmQoLi4uZW50cmllcy5tYXAoKGUpID0+IGUuaWQpKVxuICAgIC5hbGw8eyBpZDogbnVtYmVyOyBzcG9pbGVyX3RpZXJfaWQ6IG51bWJlciB8IG51bGwgfT4oKVxuICBjb25zdCBsaW5rZWQgPSAobGlua1Jvd3MucmVzdWx0cyA/PyBbXSkuZmlsdGVyKFxuICAgICh4KTogeCBpcyB7IGlkOiBudW1iZXI7IHNwb2lsZXJfdGllcl9pZDogbnVtYmVyIH0gPT4geC5zcG9pbGVyX3RpZXJfaWQgIT09IG51bGxcbiAgKVxuICBpZiAobGlua2VkLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoY29uc3QgZSBvZiBlbnRyaWVzKSBlLnNwb2lsZXJfdGllciA9IG51bGxcbiAgICByZXR1cm5cbiAgfVxuICBjb25zdCB0aWVySWRzID0gWy4uLm5ldyBTZXQobGlua2VkLm1hcCgoeCkgPT4geC5zcG9pbGVyX3RpZXJfaWQpKV1cbiAgY29uc3QgdGllcnMgPSBhd2FpdCBkYlxuICAgIC5wcmVwYXJlKGBTRUxFQ1QgKiBGUk9NIHNwb2lsZXJfdGllcnMgV0hFUkUgaWQgSU4gKCR7dGllcklkcy5tYXAoKCkgPT4gJz8nKS5qb2luKCcsJyl9KWApXG4gICAgLmJpbmQoLi4udGllcklkcylcbiAgICAuYWxsPHsgaWQ6IG51bWJlcjsgZG9jdW1lbnRfaWQ6IHN0cmluZzsga2V5OiBzdHJpbmc7IHRpdGxlX2pzb246IHN0cmluZyB9PigpXG4gIGNvbnN0IHRpZXJCeUlkID0gbmV3IE1hcCgodGllcnMucmVzdWx0cyA/PyBbXSkubWFwKCh0KSA9PiBbdC5pZCwgdF0pKVxuICBjb25zdCBlbnRyeVRpZXIgPSBuZXcgTWFwKGxpbmtlZC5tYXAoKHgpID0+IFt4LmlkLCB4LnNwb2lsZXJfdGllcl9pZF0pKVxuICBmb3IgKGNvbnN0IGUgb2YgZW50cmllcykge1xuICAgIGNvbnN0IHRpZXJJZCA9IGVudHJ5VGllci5nZXQoZS5pZClcbiAgICBjb25zdCByb3cgPSB0aWVySWQgPT09IHVuZGVmaW5lZCA/IHVuZGVmaW5lZCA6IHRpZXJCeUlkLmdldCh0aWVySWQpXG4gICAgZS5zcG9pbGVyX3RpZXIgPVxuICAgICAgcm93ID09PSB1bmRlZmluZWRcbiAgICAgICAgPyBudWxsXG4gICAgICAgIDoge1xuICAgICAgICAgICAgaWQ6IHJvdy5pZCxcbiAgICAgICAgICAgIGRvY3VtZW50SWQ6IHJvdy5kb2N1bWVudF9pZCxcbiAgICAgICAgICAgIG5hbWU6IHBpY2tMb2NhbGUocm93LnRpdGxlX2pzb24sICd6aC1IYW5zJyksXG4gICAgICAgICAgICBrZXk6IHJvdy5rZXksXG4gICAgICAgICAgfVxuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGF0dGFjaENpdGF0aW9ucyhkYjogRDFEYXRhYmFzZSwgZW50cnk6IEVudHJ5SnNvbiwgbG9jYWxlOiBzdHJpbmcpIHtcbiAgY29uc3Qgcm93cyA9IGF3YWl0IGRiXG4gICAgLnByZXBhcmUoXG4gICAgICBgU0VMRUNUIGMuKiBGUk9NIGVudHJ5X2NpdGF0aW9ucyBlYyBKT0lOIHJlc2VhcmNoX2NpdGF0aW9ucyBjIE9OIGMuaWQgPSBlYy5jaXRhdGlvbl9pZFxuICAgICAgIFdIRVJFIGMuJHtQVUJMSVNIRUR9IEFORCBlYy5lbnRyeV9pZCA9ID8xIE9SREVSIEJZIGMuaWRgXG4gICAgKVxuICAgIC5iaW5kKGVudHJ5LmlkKVxuICAgIC5hbGw8Q2l0YXRpb25Sb3c+KClcbiAgZW50cnkuY2l0YXRpb25zID0gKHJvd3MucmVzdWx0cyA/PyBbXSkubWFwKChyKSA9PiBjaXRhdGlvbkpzb24ociwgbG9jYWxlKSlcbn1cblxuYXN5bmMgZnVuY3Rpb24gYXR0YWNoUmVsYXRlZExpbmtzKGRiOiBEMURhdGFiYXNlLCBlbnRyeTogRW50cnlKc29uKSB7XG4gIGNvbnN0IGxpbmtzID0gYXdhaXQgZGJcbiAgICAucHJlcGFyZShcbiAgICAgIGBTRUxFQ1QgaWQsIHRhcmdldF9kb2N1bWVudF9pZCwgcmVsYXRpb25fdHlwZSwgY3VyYXRlX25vdGVfanNvbiwgc29ydF9vcmRlclxuICAgICAgIEZST00gZW50cnlfcmVsYXRlZF9saW5rcyBXSEVSRSBlbnRyeV9pZCA9ID8xIE9SREVSIEJZIHNvcnRfb3JkZXIsIGlkYFxuICAgIClcbiAgICAuYmluZChlbnRyeS5pZClcbiAgICAuYWxsPHtcbiAgICAgIGlkOiBudW1iZXJcbiAgICAgIHRhcmdldF9kb2N1bWVudF9pZDogc3RyaW5nXG4gICAgICByZWxhdGlvbl90eXBlOiBzdHJpbmdcbiAgICAgIGN1cmF0ZV9ub3RlX2pzb246IHN0cmluZyB8IG51bGxcbiAgICAgIHNvcnRfb3JkZXI6IG51bWJlclxuICAgIH0+KClcbiAgY29uc3QgdGFyZ2V0cyA9IFsuLi5uZXcgU2V0KChsaW5rcy5yZXN1bHRzID8/IFtdKS5tYXAoKGwpID0+IGwudGFyZ2V0X2RvY3VtZW50X2lkKSldXG4gIGNvbnN0IHRhcmdldEJ5RG9jID0gbmV3IE1hcDxzdHJpbmcsIHsgaWQ6IG51bWJlcjsgZG9jdW1lbnRJZDogc3RyaW5nOyB0aXRsZTogc3RyaW5nOyBzbHVnOiBzdHJpbmc7IGxvY2FsZTogc3RyaW5nIH0+KClcbiAgZm9yIChjb25zdCBkb2Mgb2YgdGFyZ2V0cykge1xuICAgIGNvbnN0IHJvdyA9IGF3YWl0IGRiXG4gICAgICAucHJlcGFyZShcbiAgICAgICAgYFNFTEVDVCBpZCwgZG9jdW1lbnRfaWQsIHNsdWcsIHRpdGxlX2pzb24gRlJPTSByZXNlYXJjaF9lbnRyaWVzXG4gICAgICAgICBXSEVSRSBkb2N1bWVudF9pZCA9ID8xIEFORCAke1BVQkxJU0hFRH1gXG4gICAgICApXG4gICAgICAuYmluZChkb2MpXG4gICAgICAuZmlyc3Q8RW50cnlSb3c+KClcbiAgICBpZiAocm93KSB7XG4gICAgICB0YXJnZXRCeURvYy5zZXQoZG9jLCB7XG4gICAgICAgIGlkOiByb3cuaWQsXG4gICAgICAgIGRvY3VtZW50SWQ6IHJvdy5kb2N1bWVudF9pZCxcbiAgICAgICAgdGl0bGU6IHBpY2tMb2NhbGUocm93LnRpdGxlX2pzb24sICd6aC1IYW5zJyksXG4gICAgICAgIHNsdWc6IHJvdy5zbHVnLFxuICAgICAgICBsb2NhbGU6ICd6aC1IYW5zJyxcbiAgICAgIH0pXG4gICAgfVxuICB9XG4gIGVudHJ5LnJlbGF0ZWRfbGlua3MgPSAobGlua3MucmVzdWx0cyA/PyBbXSkubWFwKChsKSA9PiAoe1xuICAgIGlkOiBsLmlkLFxuICAgIHRhcmdldF9lbnRyeTogdGFyZ2V0QnlEb2MuZ2V0KGwudGFyZ2V0X2RvY3VtZW50X2lkKSxcbiAgICByZWxhdGlvbl90eXBlOiBsLnJlbGF0aW9uX3R5cGUsXG4gICAgY3VyYXRlX25vdGU6IGwuY3VyYXRlX25vdGVfanNvbiA9PT0gbnVsbCA/IHVuZGVmaW5lZCA6IHBpY2tMb2NhbGUobC5jdXJhdGVfbm90ZV9qc29uLCAnemgtSGFucycpLFxuICAgIG9yZGVyOiBsLnNvcnRfb3JkZXIsXG4gIH0pKVxufVxuXG5hc3luYyBmdW5jdGlvbiBhdHRhY2hSZXZpc2lvbnMoZGI6IEQxRGF0YWJhc2UsIGVudHJ5OiBFbnRyeUpzb24sIGxvY2FsZTogc3RyaW5nKSB7XG4gIGNvbnN0IHJvd3MgPSBhd2FpdCBkYlxuICAgIC5wcmVwYXJlKFxuICAgICAgYFNFTEVDVCBpZCwgcmV2aXNlZF9hdCwgcmV2aXNpb25fdHlwZSwgbm90ZV9qc29uIEZST00gZW50cnlfcmV2aXNpb25zXG4gICAgICAgV0hFUkUgZW50cnlfaWQgPSA/MSBPUkRFUiBCWSBzb3J0X29yZGVyLCBpZGBcbiAgICApXG4gICAgLmJpbmQoZW50cnkuaWQpXG4gICAgLmFsbDx7IGlkOiBudW1iZXI7IHJldmlzZWRfYXQ6IHN0cmluZyB8IG51bGw7IHJldmlzaW9uX3R5cGU6IHN0cmluZzsgbm90ZV9qc29uOiBzdHJpbmcgfCBudWxsIH0+KClcbiAgZW50cnkucmV2aXNpb25zID0gKHJvd3MucmVzdWx0cyA/PyBbXSkubWFwKChyKSA9PiAoe1xuICAgIGlkOiByLmlkLFxuICAgIGRhdGU6IHIucmV2aXNlZF9hdCA/PyAnJyxcbiAgICByZXZpc2lvbl90eXBlOiByLnJldmlzaW9uX3R5cGUsXG4gICAgbm90ZTogci5ub3RlX2pzb24gPT09IG51bGwgPyB1bmRlZmluZWQgOiBwaWNrTG9jYWxlKHIubm90ZV9qc29uLCBsb2NhbGUpLFxuICB9KSlcbn1cblxuLy8g4pSA4pSAIOafpeivouWPguaVsO+8iOW/q+eFp+WunumZheWHuueOsOeahOWtkOmbhu+8ieKUgOKUgFxuXG5pbnRlcmZhY2UgTGlzdFBhcmFtcyB7XG4gIGxvY2FsZTogc3RyaW5nXG4gIHBhZ2U6IG51bWJlclxuICBwYWdlU2l6ZTogbnVtYmVyXG59XG5cbmZ1bmN0aW9uIHBhcnNlTGlzdFBhcmFtcyh1cmw6IFVSTCk6IExpc3RQYXJhbXMge1xuICBjb25zdCBBTExPV0VEID0gWyd6aC1IYW5zJywgJ2VuJywgJ2phJ11cbiAgY29uc3QgcmF3TG9jYWxlID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoJ2xvY2FsZScpIHx8ICd6aC1IYW5zJ1xuICBjb25zdCBwYWdlUmF3ID0gTnVtYmVyKHVybC5zZWFyY2hQYXJhbXMuZ2V0KCdwYWdpbmF0aW9uW3BhZ2VdJykgfHwgJzEnKVxuICBjb25zdCBzaXplUmF3ID0gTnVtYmVyKHVybC5zZWFyY2hQYXJhbXMuZ2V0KCdwYWdpbmF0aW9uW3BhZ2VTaXplXScpIHx8ICcyNCcpXG4gIHJldHVybiB7XG4gICAgbG9jYWxlOiBBTExPV0VELmluY2x1ZGVzKHJhd0xvY2FsZSkgPyByYXdMb2NhbGUgOiAnemgtSGFucycsXG4gICAgcGFnZTogTnVtYmVyLmlzRmluaXRlKHBhZ2VSYXcpICYmIHBhZ2VSYXcgPj0gMSA/IE1hdGguZmxvb3IocGFnZVJhdykgOiAxLFxuICAgIHBhZ2VTaXplOlxuICAgICAgTnVtYmVyLmlzRmluaXRlKHNpemVSYXcpICYmIHNpemVSYXcgPj0gMSA/IE1hdGgubWluKDIwMCwgTWF0aC5mbG9vcihzaXplUmF3KSkgOiAyNCxcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBjb3VudEVudHJpZXMoZGI6IEQxRGF0YWJhc2UsIHdoZXJlOiBzdHJpbmcsIGJpbmRzOiB1bmtub3duW10pOiBQcm9taXNlPG51bWJlcj4ge1xuICBjb25zdCByb3cgPSBhd2FpdCBkYlxuICAgIC5wcmVwYXJlKGBTRUxFQ1QgQ09VTlQoKikgQVMgbiBGUk9NIHJlc2VhcmNoX2VudHJpZXMgV0hFUkUgJHtQVUJMSVNIRUR9JHt3aGVyZX1gKVxuICAgIC5iaW5kKC4uLmJpbmRzKVxuICAgIC5maXJzdDx7IG46IG51bWJlciB9PigpXG4gIHJldHVybiByb3c/Lm4gPz8gMFxufVxuXG5hc3luYyBmdW5jdGlvbiBxdWVyeUVudHJpZXMoXG4gIGRiOiBEMURhdGFiYXNlLFxuICB3aGVyZTogc3RyaW5nLFxuICBiaW5kczogdW5rbm93bltdLFxuICBwYXJhbXM6IExpc3RQYXJhbXMsXG4gIG9yZGVyQnkgPSAndXBkYXRlZF9hdCBERVNDJ1xuKTogUHJvbWlzZTxFbnRyeUpzb25bXT4ge1xuICBjb25zdCBvZmZzZXQgPSAocGFyYW1zLnBhZ2UgLSAxKSAqIHBhcmFtcy5wYWdlU2l6ZVxuICBjb25zdCByb3dzID0gYXdhaXQgZGJcbiAgICAucHJlcGFyZShcbiAgICAgIGBTRUxFQ1QgKiBGUk9NIHJlc2VhcmNoX2VudHJpZXMgV0hFUkUgJHtQVUJMSVNIRUR9JHt3aGVyZX1cbiAgICAgICBPUkRFUiBCWSAke29yZGVyQnl9IExJTUlUID8ke2JpbmRzLmxlbmd0aCArIDF9IE9GRlNFVCA/JHtiaW5kcy5sZW5ndGggKyAyfWBcbiAgICApXG4gICAgLmJpbmQoLi4uYmluZHMsIHBhcmFtcy5wYWdlU2l6ZSwgb2Zmc2V0KVxuICAgIC5hbGw8RW50cnlSb3c+KClcbiAgcmV0dXJuIChyb3dzLnJlc3VsdHMgPz8gW10pLm1hcCgocikgPT4gZW50cnlKc29uKHIsIHBhcmFtcy5sb2NhbGUpKVxufVxuXG4vLyDilIDilIAg5YiX6KGo56uv54K5IOKUgOKUgFxuXG4vLyBHRVQgL3Jlc2VhcmNoLWVudHJpZXM/bG9jYWxlJnNvcnQ9dXBkYXRlZEF0OmRlc2MmcGFnaW5hdGlvbltwYWdlU2l6ZV0mZmlsdGVyc1suLi5dXG5yZXNlYXJjaFJvdXRlcy5nZXQoJy9yZXNlYXJjaC1lbnRyaWVzJywgYXN5bmMgKGMpID0+IHtcbiAgY29uc3QgdXJsID0gbmV3IFVSTChjLnJlcS51cmwpXG4gIGNvbnN0IHBhcmFtcyA9IHBhcnNlTGlzdFBhcmFtcyh1cmwpXG4gIGNvbnN0IGRiID0gYy5lbnYuREJcblxuICBjb25zdCBzbHVnRXEgPSB1cmwuc2VhcmNoUGFyYW1zLmdldCgnZmlsdGVyc1tzbHVnXVskZXFdJylcbiAgY29uc3QgdGhlbWVTbHVnID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoJ2ZpbHRlcnNbdGhlbWVzXVtzbHVnXVskZXFdJylcbiAgY29uc3Qgc3ViamVjdFNsdWcgPSB1cmwuc2VhcmNoUGFyYW1zLmdldCgnZmlsdGVyc1tzdWJqZWN0c11bc2x1Z11bJGVxXScpXG4gIGNvbnN0IGNpdGF0aW9uSWRzSW4gPSB1cmwuc2VhcmNoUGFyYW1zLmdldEFsbCgnZmlsdGVyc1tjaXRhdGlvbnNdW2lkXVskaW5dJykuZmxhdE1hcCgodikgPT4gdi5zcGxpdCgnLCcpKS5maWx0ZXIoQm9vbGVhbilcblxuICBsZXQgd2hlcmUgPSAnJ1xuICBjb25zdCBiaW5kczogdW5rbm93bltdID0gW11cblxuICBpZiAoc2x1Z0VxICE9PSBudWxsKSB7XG4gICAgd2hlcmUgKz0gJyBBTkQgc2x1ZyA9ID8nXG4gICAgYmluZHMucHVzaChzbHVnRXEpXG4gIH1cbiAgaWYgKHRoZW1lU2x1ZyAhPT0gbnVsbCkge1xuICAgIHdoZXJlICs9IGAgQU5EIGlkIElOIChTRUxFQ1QgZXQuZW50cnlfaWQgRlJPTSBlbnRyeV90aGVtZXMgZXRcbiAgICAgICAgICAgICAgIEpPSU4gcmVzZWFyY2hfdGhlbWVzIHQgT04gdC5pZCA9IGV0LnRoZW1lX2lkXG4gICAgICAgICAgICAgICBXSEVSRSB0LiR7UFVCTElTSEVEfSBBTkQgdC5zbHVnID0gPylgXG4gICAgYmluZHMucHVzaCh0aGVtZVNsdWcpXG4gIH1cbiAgaWYgKHN1YmplY3RTbHVnICE9PSBudWxsKSB7XG4gICAgd2hlcmUgKz0gYCBBTkQgaWQgSU4gKFNFTEVDVCBlcy5lbnRyeV9pZCBGUk9NIGVudHJ5X3N1YmplY3RzIGVzXG4gICAgICAgICAgICAgICBKT0lOIHJlc2VhcmNoX3N1YmplY3RzIHMgT04gcy5pZCA9IGVzLnN1YmplY3RfaWRcbiAgICAgICAgICAgICAgIFdIRVJFIHMuJHtQVUJMSVNIRUR9IEFORCBzLnNsdWcgPSA/KWBcbiAgICBiaW5kcy5wdXNoKHN1YmplY3RTbHVnKVxuICB9XG4gIGlmIChjaXRhdGlvbklkc0luLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBtYXJrcyA9IGNpdGF0aW9uSWRzSW4ubWFwKCgpID0+ICc/Jykuam9pbignLCcpXG4gICAgd2hlcmUgKz0gYCBBTkQgaWQgSU4gKFNFTEVDVCBlYy5lbnRyeV9pZCBGUk9NIGVudHJ5X2NpdGF0aW9ucyBlY1xuICAgICAgICAgICAgICAgSk9JTiByZXNlYXJjaF9jaXRhdGlvbnMgY2l0IE9OIGNpdC5pZCA9IGVjLmNpdGF0aW9uX2lkXG4gICAgICAgICAgICAgICBXSEVSRSBjaXQuJHtQVUJMSVNIRUR9IEFORCBjaXQuaWQgSU4gKCR7bWFya3N9KSlgXG4gICAgYmluZHMucHVzaCguLi5jaXRhdGlvbklkc0luLm1hcChOdW1iZXIpLmZpbHRlcigobikgPT4gIU51bWJlci5pc05hTihuKSkpXG4gIH1cblxuICBjb25zdCB0b3RhbCA9IGF3YWl0IGNvdW50RW50cmllcyhkYiwgd2hlcmUsIGJpbmRzKVxuICBjb25zdCBkYXRhID0gYXdhaXQgcXVlcnlFbnRyaWVzKGRiLCB3aGVyZSwgYmluZHMsIHBhcmFtcylcbiAgYXdhaXQgYXR0YWNoVGhlbWVzKGRiLCBkYXRhLCBwYXJhbXMubG9jYWxlKVxuICBhd2FpdCBhdHRhY2hTdWJqZWN0cyhkYiwgZGF0YSwgcGFyYW1zLmxvY2FsZSlcbiAgYXdhaXQgYXR0YWNoU3BvaWxlclRpZXJzKGRiLCBkYXRhKVxuICByZXR1cm4gb2tQYWdpbmF0ZWQoZGF0YSwgcGFnaW5hdGlvbk9mKHBhcmFtcy5wYWdlLCBwYXJhbXMucGFnZVNpemUsIHRvdGFsKSlcbn0pXG5cbi8vIEdFVCAvcmVzZWFyY2gtZW50cmllcy86c2x1ZyDigJQg6K+m5oOF77yIcG9wdWxhdGUgY2l0YXRpb25zL3JlbGF0ZWRfbGlua3MvcmV2aXNpb25zL3RoZW1lcy9zdWJqZWN0cy9zcG9pbGVyX3RpZXLvvIlcbnJlc2VhcmNoUm91dGVzLmdldCgnL3Jlc2VhcmNoLWVudHJpZXMvOnNsdWcnLCBhc3luYyAoYykgPT4ge1xuICBjb25zdCBzbHVnID0gYy5yZXEucGFyYW0oJ3NsdWcnKVxuICBpZiAoc2x1ZyA9PT0gJ2JhY2tsaW5rcycpIHJldHVybiBmYWlsKDQwNCwgJ25vdF9mb3VuZCcpXG4gIGNvbnN0IHVybCA9IG5ldyBVUkwoYy5yZXEudXJsKVxuICBjb25zdCBwYXJhbXMgPSBwYXJzZUxpc3RQYXJhbXModXJsKVxuICBjb25zdCBkYiA9IGMuZW52LkRCXG5cbiAgY29uc3Qgcm93ID0gYXdhaXQgZGJcbiAgICAucHJlcGFyZShgU0VMRUNUICogRlJPTSByZXNlYXJjaF9lbnRyaWVzIFdIRVJFIHNsdWcgPSA/MSBBTkQgJHtQVUJMSVNIRUR9YClcbiAgICAuYmluZChzbHVnKVxuICAgIC5maXJzdDxFbnRyeVJvdz4oKVxuICBpZiAoIXJvdykgcmV0dXJuIGZhaWwoNDA0LCAnbm90X2ZvdW5kJylcblxuICBjb25zdCBlbnRyeSA9IGVudHJ5SnNvbihyb3csIHBhcmFtcy5sb2NhbGUpXG4gIGF3YWl0IGF0dGFjaFRoZW1lcyhkYiwgW2VudHJ5XSwgcGFyYW1zLmxvY2FsZSlcbiAgYXdhaXQgYXR0YWNoU3ViamVjdHMoZGIsIFtlbnRyeV0sIHBhcmFtcy5sb2NhbGUpXG4gIGF3YWl0IGF0dGFjaFNwb2lsZXJUaWVycyhkYiwgW2VudHJ5XSlcbiAgYXdhaXQgYXR0YWNoQ2l0YXRpb25zKGRiLCBlbnRyeSwgcGFyYW1zLmxvY2FsZSlcbiAgYXdhaXQgYXR0YWNoUmVsYXRlZExpbmtzKGRiLCBlbnRyeSlcbiAgYXdhaXQgYXR0YWNoUmV2aXNpb25zKGRiLCBlbnRyeSwgcGFyYW1zLmxvY2FsZSlcbiAgcmV0dXJuIG9rKGVudHJ5KVxufSlcblxuLy8gR0VUIC9yZXNlYXJjaC1lbnRyaWVzLzpkb2N1bWVudElkL2JhY2tsaW5rcyDigJQg5Y+N5ZCR6ZO+5o6l77yaXG4vLyDnu5PmnoTljJbovrkgZW50cnlfcmVsYXRlZF9saW5rcy50YXJnZXRfZG9jdW1lbnRfaWQg4oiqIOato+aWhyBbW3dpa2lTbHVnXV3vvIzmjpLpmaToh6rouqvjgIJcbnJlc2VhcmNoUm91dGVzLmdldCgnL3Jlc2VhcmNoLWVudHJpZXMvOmRvY3VtZW50SWQvYmFja2xpbmtzJywgYXN5bmMgKGMpID0+IHtcbiAgY29uc3QgZG9jdW1lbnRJZCA9IGMucmVxLnBhcmFtKCdkb2N1bWVudElkJylcbiAgY29uc3QgdXJsID0gbmV3IFVSTChjLnJlcS51cmwpXG4gIGNvbnN0IHBhcmFtcyA9IHBhcnNlTGlzdFBhcmFtcyh1cmwpXG4gIGNvbnN0IGRiID0gYy5lbnYuREJcblxuICBjb25zdCBzZWxmID0gYXdhaXQgZGJcbiAgICAucHJlcGFyZShgU0VMRUNUIGlkLCBzbHVnIEZST00gcmVzZWFyY2hfZW50cmllcyBXSEVSRSBkb2N1bWVudF9pZCA9ID8xYClcbiAgICAuYmluZChkb2N1bWVudElkKVxuICAgIC5maXJzdDx7IGlkOiBudW1iZXI7IHNsdWc6IHN0cmluZyB9PigpXG4gIGlmICghc2VsZikgcmV0dXJuIGZhaWwoNDA0LCAnbm90X2ZvdW5kJylcblxuICBjb25zdCBsaWtlUGF0dGVybiA9IGAlW1ske3NlbGYuc2x1Z30lYFxuICBjb25zdCByb3dzID0gYXdhaXQgZGJcbiAgICAucHJlcGFyZShcbiAgICAgIGBTRUxFQ1QgRElTVElOQ1QgZS4qIEZST00gcmVzZWFyY2hfZW50cmllcyBlXG4gICAgICAgV0hFUkUgZS4ke1BVQkxJU0hFRH1cbiAgICAgICAgIEFORCBlLnNsdWcgIT0gPzJcbiAgICAgICAgIEFORCAoXG4gICAgICAgICAgIGUuaWQgSU4gKFNFTEVDVCBybC5lbnRyeV9pZCBGUk9NIGVudHJ5X3JlbGF0ZWRfbGlua3MgcmwgV0hFUkUgcmwudGFyZ2V0X2RvY3VtZW50X2lkID0gPzEpXG4gICAgICAgICAgIE9SIGUuYm9keV9qc29uIExJS0UgPzNcbiAgICAgICAgIClcbiAgICAgICBPUkRFUiBCWSBlLnVwZGF0ZWRfYXQgREVTQyBMSU1JVCA1MGBcbiAgICApXG4gICAgLmJpbmQoZG9jdW1lbnRJZCwgc2VsZi5zbHVnLCBsaWtlUGF0dGVybilcbiAgICAuYWxsPEVudHJ5Um93PigpXG5cbiAgY29uc3QgZGF0YSA9IChyb3dzLnJlc3VsdHMgPz8gW10pXG4gICAgLm1hcCgocikgPT4gKHsgLi4uZW50cnlKc29uKHIsIHBhcmFtcy5sb2NhbGUpLCBib2R5OiB1bmRlZmluZWQgfSkpXG4gIC8vIOWlkee6piBjb25zdW1lIOWPquWPliBpZC90aXRsZS9zbHVn77ybcmVsYXRlZF9saW5rcyDnm67moIcgc2x1ZyDkuIDlubbnu5nlh7rkvpvliY3nq6/liIbnu4RcbiAgZm9yIChjb25zdCBpdGVtIG9mIGRhdGEpIHtcbiAgICBjb25zdCBsaW5rUm93cyA9IGF3YWl0IGRiXG4gICAgICAucHJlcGFyZShcbiAgICAgICAgYFNFTEVDVCBybC5zb3J0X29yZGVyLCB0ZS5zbHVnIEZST00gZW50cnlfcmVsYXRlZF9saW5rcyBybFxuICAgICAgICAgSk9JTiByZXNlYXJjaF9lbnRyaWVzIHRlIE9OIHRlLmRvY3VtZW50X2lkID0gcmwudGFyZ2V0X2RvY3VtZW50X2lkIEFORCB0ZS4ke1BVQkxJU0hFRH1cbiAgICAgICAgIFdIRVJFIHJsLmVudHJ5X2lkID0gPzEgT1JERVIgQlkgcmwuc29ydF9vcmRlcmBcbiAgICAgIClcbiAgICAgIC5iaW5kKGl0ZW0uaWQpXG4gICAgICAuYWxsPHsgc29ydF9vcmRlcjogbnVtYmVyOyBzbHVnOiBzdHJpbmcgfT4oKVxuICAgIDsoaXRlbSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikucmVsYXRlZF9saW5rcyA9IChsaW5rUm93cy5yZXN1bHRzID8/IFtdKS5tYXAoKGwpID0+ICh7XG4gICAgICB0YXJnZXRfZW50cnk6IHsgc2x1ZzogbC5zbHVnIH0sXG4gICAgICBvcmRlcjogbC5zb3J0X29yZGVyLFxuICAgIH0pKVxuICB9XG4gIHJldHVybiBva1BhZ2luYXRlZChkYXRhLCBwYWdpbmF0aW9uT2YoMSwgNTAsIGRhdGEubGVuZ3RoKSlcbn0pXG5cbi8vIEdFVCAvcmVzZWFyY2gtY2l0YXRpb25zLzpkb2N1bWVudElkL2Fsc28tY2l0ZWQg4oCUIOW8leivgeWPjeafpe+8muW8leeUqOWQjOS4gOW8leivgeeahOWFtuS7luadoeebrlxucmVzZWFyY2hSb3V0ZXMuZ2V0KCcvcmVzZWFyY2gtY2l0YXRpb25zLzpkb2N1bWVudElkL2Fsc28tY2l0ZWQnLCBhc3luYyAoYykgPT4ge1xuICBjb25zdCBkb2N1bWVudElkID0gYy5yZXEucGFyYW0oJ2RvY3VtZW50SWQnKVxuICBjb25zdCB1cmwgPSBuZXcgVVJMKGMucmVxLnVybClcbiAgY29uc3QgcGFyYW1zID0gcGFyc2VMaXN0UGFyYW1zKHVybClcbiAgY29uc3QgZGIgPSBjLmVudi5EQlxuXG4gIGNvbnN0IGNpdGF0aW9uID0gYXdhaXQgZGJcbiAgICAucHJlcGFyZShgU0VMRUNUIGlkIEZST00gcmVzZWFyY2hfY2l0YXRpb25zIFdIRVJFIGRvY3VtZW50X2lkID0gPzEgQU5EICR7UFVCTElTSEVEfWApXG4gICAgLmJpbmQoZG9jdW1lbnRJZClcbiAgICAuZmlyc3Q8eyBpZDogbnVtYmVyIH0+KClcbiAgaWYgKCFjaXRhdGlvbikgcmV0dXJuIGZhaWwoNDA0LCAnbm90X2ZvdW5kJylcblxuICBjb25zdCBleGNsdWRlU2x1ZyA9IHVybC5zZWFyY2hQYXJhbXMuZ2V0KCdmaWx0ZXJzW3NsdWddWyRuZV0nKVxuICBjb25zdCByb3dzID0gYXdhaXQgZGJcbiAgICAucHJlcGFyZShcbiAgICAgIGBTRUxFQ1QgZS4qLCBlYy5lbnRyeV9pZCBGUk9NIHJlc2VhcmNoX2VudHJpZXMgZVxuICAgICAgIEpPSU4gZW50cnlfY2l0YXRpb25zIGVjIE9OIGVjLmVudHJ5X2lkID0gZS5pZCBBTkQgZWMuY2l0YXRpb25faWQgPSA/MVxuICAgICAgIFdIRVJFIGUuJHtQVUJMSVNIRUR9IEFORCAoPzIgSVMgTlVMTCBPUiBlLnNsdWcgIT0gPzIpXG4gICAgICAgT1JERVIgQlkgZS51cGRhdGVkX2F0IERFU0NgXG4gICAgKVxuICAgIC5iaW5kKGNpdGF0aW9uLmlkLCBleGNsdWRlU2x1ZylcbiAgICAuYWxsPEVudHJ5Um93PigpXG5cbiAgY29uc3QgZGF0YSA9IChyb3dzLnJlc3VsdHMgPz8gW10pLm1hcCgocikgPT4gZW50cnlKc29uKHIsIHBhcmFtcy5sb2NhbGUpKVxuICAvLyBwb3B1bGF0ZVtjaXRhdGlvbnNdW2ZpZWxkc11bMF09aWTvvJrku4Xlm54gY2l0YXRpb25zIOeahCBpZCDliJfooajvvIjmnIDlsI/lrZfmrrXvvInvvIzkvpvosIPnlKjmlrnmjInlvJXor4HliIbnu4RcbiAgZm9yIChjb25zdCBpdGVtIG9mIGRhdGEpIHtcbiAgICBjb25zdCBvd24gPSBhd2FpdCBkYlxuICAgICAgLnByZXBhcmUoYFNFTEVDVCBjaXRhdGlvbl9pZCBGUk9NIGVudHJ5X2NpdGF0aW9ucyBXSEVSRSBlbnRyeV9pZCA9ID8xIE9SREVSIEJZIGNpdGF0aW9uX2lkYClcbiAgICAgIC5iaW5kKGl0ZW0uaWQpXG4gICAgICAuYWxsPHsgY2l0YXRpb25faWQ6IG51bWJlciB9PigpXG4gICAgaXRlbS5jaXRhdGlvbnMgPSAob3duLnJlc3VsdHMgPz8gW10pLm1hcCgocikgPT4gKHsgaWQ6IHIuY2l0YXRpb25faWQgfSkpXG4gIH1cbiAgcmV0dXJuIG9rUGFnaW5hdGVkKGRhdGEsIHBhZ2luYXRpb25PZigxLCA1MCwgZGF0YS5sZW5ndGgpKVxufSlcblxuLy8g4pSA4pSAIOmYheivu+i3r+W+hCDilIDilIBcblxuYXN5bmMgZnVuY3Rpb24gcGF0aFN0ZXBzRm9yKFxuICBkYjogRDFEYXRhYmFzZSxcbiAgcGF0aElkOiBudW1iZXIsXG4gIGxvY2FsZTogc3RyaW5nXG4pOiBQcm9taXNlPEFycmF5PHsgaWQ6IG51bWJlcjsgZW50cnk/OiB7IGlkOiBudW1iZXI7IGRvY3VtZW50SWQ6IHN0cmluZzsgdGl0bGU6IHN0cmluZzsgc2x1Zzogc3RyaW5nOyBzdW1tYXJ5Pzogc3RyaW5nIH07IHN0ZXBfbm90ZT86IHN0cmluZyB9Pj4ge1xuICBjb25zdCBzdGVwcyA9IGF3YWl0IGRiXG4gICAgLnByZXBhcmUoXG4gICAgICBgU0VMRUNUIHBzLmlkLCBwcy50YXJnZXRfZG9jdW1lbnRfaWQsIHBzLnN0ZXBfbm90ZV9qc29uLCBwcy5zb3J0X29yZGVyXG4gICAgICAgRlJPTSBwYXRoX3N0ZXBzIHBzIFdIRVJFIHBzLnBhdGhfaWQgPSA/MSBPUkRFUiBCWSBwcy5zb3J0X29yZGVyLCBwcy5pZGBcbiAgICApXG4gICAgLmJpbmQocGF0aElkKVxuICAgIC5hbGw8eyBpZDogbnVtYmVyOyB0YXJnZXRfZG9jdW1lbnRfaWQ6IHN0cmluZzsgc3RlcF9ub3RlX2pzb246IHN0cmluZyB8IG51bGw7IHNvcnRfb3JkZXI6IG51bWJlciB9PigpXG4gIGNvbnN0IHJlc3VsdDogQXJyYXk8eyBpZDogbnVtYmVyOyBlbnRyeT86IHsgaWQ6IG51bWJlcjsgZG9jdW1lbnRJZDogc3RyaW5nOyB0aXRsZTogc3RyaW5nOyBzbHVnOiBzdHJpbmc7IHN1bW1hcnk/OiBzdHJpbmcgfTsgc3RlcF9ub3RlPzogc3RyaW5nIH0+ID0gW11cbiAgZm9yIChjb25zdCBzdGVwIG9mIHN0ZXBzLnJlc3VsdHMgPz8gW10pIHtcbiAgICBjb25zdCBlbnRyeSA9IGF3YWl0IGRiXG4gICAgICAucHJlcGFyZShcbiAgICAgICAgYFNFTEVDVCBpZCwgZG9jdW1lbnRfaWQsIHNsdWcsIHRpdGxlX2pzb24sIHN1bW1hcnlfanNvbiBGUk9NIHJlc2VhcmNoX2VudHJpZXNcbiAgICAgICAgIFdIRVJFIGRvY3VtZW50X2lkID0gPzEgQU5EICR7UFVCTElTSEVEfWBcbiAgICAgIClcbiAgICAgIC5iaW5kKHN0ZXAudGFyZ2V0X2RvY3VtZW50X2lkKVxuICAgICAgLmZpcnN0PEVudHJ5Um93PigpXG4gICAgcmVzdWx0LnB1c2goe1xuICAgICAgaWQ6IHN0ZXAuaWQsXG4gICAgICBlbnRyeTogZW50cnlcbiAgICAgICAgPyB7XG4gICAgICAgICAgICBpZDogZW50cnkuaWQsXG4gICAgICAgICAgICBkb2N1bWVudElkOiBlbnRyeS5kb2N1bWVudF9pZCxcbiAgICAgICAgICAgIHRpdGxlOiBwaWNrTG9jYWxlKGVudHJ5LnRpdGxlX2pzb24sIGxvY2FsZSksXG4gICAgICAgICAgICBzbHVnOiBlbnRyeS5zbHVnLFxuICAgICAgICAgICAgc3VtbWFyeTpcbiAgICAgICAgICAgICAgZW50cnkuc3VtbWFyeV9qc29uID09PSBudWxsID8gdW5kZWZpbmVkIDogcGlja0xvY2FsZShlbnRyeS5zdW1tYXJ5X2pzb24sIGxvY2FsZSksXG4gICAgICAgICAgfVxuICAgICAgICA6IHVuZGVmaW5lZCxcbiAgICAgIHN0ZXBfbm90ZTpcbiAgICAgICAgc3RlcC5zdGVwX25vdGVfanNvbiA9PT0gbnVsbCA/IHVuZGVmaW5lZCA6IHBpY2tMb2NhbGUoc3RlcC5zdGVwX25vdGVfanNvbiwgbG9jYWxlKSxcbiAgICB9KVxuICB9XG4gIHJldHVybiByZXN1bHRcbn1cblxuLy8gR0VUIC9yZXNlYXJjaC1wYXRocz9zb3J0WzBdPW9yZGVyOmFzYyZzb3J0WzFdPXVwZGF0ZWRBdDpkZXNjJnBhZ2luYXRpb25bcGFnZVNpemVdPTUwXG5yZXNlYXJjaFJvdXRlcy5nZXQoJy9yZXNlYXJjaC1wYXRocycsIGFzeW5jIChjKSA9PiB7XG4gIGNvbnN0IHVybCA9IG5ldyBVUkwoYy5yZXEudXJsKVxuICBjb25zdCBwYXJhbXMgPSBwYXJzZUxpc3RQYXJhbXModXJsKVxuICBjb25zdCBkYiA9IGMuZW52LkRCXG5cbiAgLy8gZmlsdGVyc1tzdGVwc11bZW50cnldW3NsdWddWyRlcV3vvJrljIXlkKvor6XmnaHnm67nmoTot6/lvoTvvIjkuIrkuIDnr4cv5LiL5LiA56+H5a+86Iiq55So77yJXG4gIGNvbnN0IGVudHJ5U2x1ZyA9IHVybC5zZWFyY2hQYXJhbXMuZ2V0KCdmaWx0ZXJzW3N0ZXBzXVtlbnRyeV1bc2x1Z11bJGVxXScpXG4gIGxldCB3aGVyZSA9ICcnXG4gIGNvbnN0IGJpbmRzOiB1bmtub3duW10gPSBbXVxuICBpZiAoZW50cnlTbHVnICE9PSBudWxsKSB7XG4gICAgd2hlcmUgPSBgIEFORCBpZCBJTiAoXG4gICAgICBTRUxFQ1QgcHMucGF0aF9pZCBGUk9NIHBhdGhfc3RlcHMgcHNcbiAgICAgIEpPSU4gcmVzZWFyY2hfZW50cmllcyBlIE9OIGUuZG9jdW1lbnRfaWQgPSBwcy50YXJnZXRfZG9jdW1lbnRfaWQgQU5EIGUuJHtQVUJMSVNIRUR9XG4gICAgICBXSEVSRSBlLnNsdWcgPSA/KWBcbiAgICBiaW5kcy5wdXNoKGVudHJ5U2x1ZylcbiAgfVxuXG4gIGNvbnN0IHRvdGFsUm93ID0gYXdhaXQgZGJcbiAgICAucHJlcGFyZShgU0VMRUNUIENPVU5UKCopIEFTIG4gRlJPTSByZXNlYXJjaF9wYXRocyBXSEVSRSAke1BVQkxJU0hFRH0ke3doZXJlfWApXG4gICAgLmJpbmQoLi4uYmluZHMpXG4gICAgLmZpcnN0PHsgbjogbnVtYmVyIH0+KClcbiAgY29uc3QgdG90YWwgPSB0b3RhbFJvdz8ubiA/PyAwXG4gIGNvbnN0IHJvd3MgPSBhd2FpdCBkYlxuICAgIC5wcmVwYXJlKFxuICAgICAgYFNFTEVDVCAqIEZST00gcmVzZWFyY2hfcGF0aHMgV0hFUkUgJHtQVUJMSVNIRUR9JHt3aGVyZX1cbiAgICAgICBPUkRFUiBCWSBzb3J0X29yZGVyIEFTQywgdXBkYXRlZF9hdCBERVNDIExJTUlUID8ke2JpbmRzLmxlbmd0aCArIDF9IE9GRlNFVCA/JHtiaW5kcy5sZW5ndGggKyAyfWBcbiAgICApXG4gICAgLmJpbmQoLi4uYmluZHMsIHBhcmFtcy5wYWdlU2l6ZSwgKHBhcmFtcy5wYWdlIC0gMSkgKiBwYXJhbXMucGFnZVNpemUpXG4gICAgLmFsbDxQYXRoUm93PigpXG5cbiAgY29uc3QgZGF0YSA9IChyb3dzLnJlc3VsdHMgPz8gW10pLm1hcCgocikgPT4gcGF0aEpzb24ociwgcGFyYW1zLmxvY2FsZSkpXG4gIGZvciAoY29uc3QgcCBvZiBkYXRhKSB7XG4gICAgOyhwIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KS5zdGVwcyA9IGF3YWl0IHBhdGhTdGVwc0ZvcihkYiwgcC5pZCwgcGFyYW1zLmxvY2FsZSlcbiAgfVxuICByZXR1cm4gb2tQYWdpbmF0ZWQoZGF0YSwgcGFnaW5hdGlvbk9mKHBhcmFtcy5wYWdlLCBwYXJhbXMucGFnZVNpemUsIHRvdGFsKSlcbn0pXG5cbi8vIEdFVCAvcmVzZWFyY2gtcGF0aHMvOnNsdWcg4oCUIOWNleS4qui3r+W+hO+8iGZldGNoTG9jYWxpemVkU2luZ2xlQnlTbHVnIOivreS5ie+8mnNsdWcg5YWo5bGA5ZSv5LiA77yM5pegIGxvY2FsZSDlj5jkvZPvvIlcbnJlc2VhcmNoUm91dGVzLmdldCgnL3Jlc2VhcmNoLXBhdGhzLzpzbHVnJywgYXN5bmMgKGMpID0+IHtcbiAgY29uc3Qgc2x1ZyA9IGMucmVxLnBhcmFtKCdzbHVnJylcbiAgaWYgKHNsdWcgPT09ICduZWlnaGJvcnMnKSByZXR1cm4gZmFpbCg0MDQsICdub3RfZm91bmQnKVxuICBjb25zdCB1cmwgPSBuZXcgVVJMKGMucmVxLnVybClcbiAgY29uc3QgcGFyYW1zID0gcGFyc2VMaXN0UGFyYW1zKHVybClcbiAgY29uc3QgZGIgPSBjLmVudi5EQlxuXG4gIGNvbnN0IHJvdyA9IGF3YWl0IGRiXG4gICAgLnByZXBhcmUoYFNFTEVDVCAqIEZST00gcmVzZWFyY2hfcGF0aHMgV0hFUkUgc2x1ZyA9ID8xIEFORCAke1BVQkxJU0hFRH1gKVxuICAgIC5iaW5kKHNsdWcpXG4gICAgLmZpcnN0PFBhdGhSb3c+KClcbiAgaWYgKCFyb3cpIHJldHVybiBmYWlsKDQwNCwgJ25vdF9mb3VuZCcpXG4gIGNvbnN0IHBhdGggPSBwYXRoSnNvbihyb3csIHBhcmFtcy5sb2NhbGUpXG4gIDsocGF0aCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikuc3RlcHMgPSBhd2FpdCBwYXRoU3RlcHNGb3IoZGIsIHJvdy5pZCwgcGFyYW1zLmxvY2FsZSlcbiAgcmV0dXJuIG9rKHBhdGgpXG59KVxuXG4vLyBHRVQgL3Jlc2VhcmNoLXBhdGhzLzpzbHVnL25laWdoYm9ycy86ZW50cnlEb2N1bWVudElkIOKAlCDmnaHnm67lnKjot6/lvoTkuK3nmoTkuIov5LiL56+HXG5yZXNlYXJjaFJvdXRlcy5nZXQoJy9yZXNlYXJjaC1wYXRocy86c2x1Zy9uZWlnaGJvcnMvOmVudHJ5RG9jdW1lbnRJZCcsIGFzeW5jIChjKSA9PiB7XG4gIGNvbnN0IHNsdWcgPSBjLnJlcS5wYXJhbSgnc2x1ZycpXG4gIGNvbnN0IGVudHJ5RG9jID0gYy5yZXEucGFyYW0oJ2VudHJ5RG9jdW1lbnRJZCcpXG4gIGNvbnN0IHVybCA9IG5ldyBVUkwoYy5yZXEudXJsKVxuICBjb25zdCBwYXJhbXMgPSBwYXJzZUxpc3RQYXJhbXModXJsKVxuICBjb25zdCBkYiA9IGMuZW52LkRCXG5cbiAgY29uc3QgcGF0aCA9IGF3YWl0IGRiXG4gICAgLnByZXBhcmUoYFNFTEVDVCBpZCBGUk9NIHJlc2VhcmNoX3BhdGhzIFdIRVJFIHNsdWcgPSA/MSBBTkQgJHtQVUJMSVNIRUR9YClcbiAgICAuYmluZChzbHVnKVxuICAgIC5maXJzdDx7IGlkOiBudW1iZXIgfT4oKVxuICBpZiAoIXBhdGgpIHJldHVybiBmYWlsKDQwNCwgJ3BhdGhfbm90X2ZvdW5kJylcblxuICBjb25zdCBzdGVwcyA9IGF3YWl0IHBhdGhTdGVwc0ZvcihkYiwgcGF0aC5pZCwgcGFyYW1zLmxvY2FsZSlcbiAgY29uc3Qgd2l0aEVudHJ5ID0gc3RlcHMuZmlsdGVyKChzKSA9PiBzLmVudHJ5ICE9PSB1bmRlZmluZWQpXG4gIGNvbnN0IGlkeCA9IHdpdGhFbnRyeS5maW5kSW5kZXgoKHMpID0+IHMuZW50cnkhLmRvY3VtZW50SWQgPT09IGVudHJ5RG9jKVxuICBpZiAoaWR4ID09PSAtMSkgcmV0dXJuIGZhaWwoNDA0LCAnZW50cnlfbm90X2luX3BhdGgnKVxuXG4gIGNvbnN0IHByZXYgPSBpZHggPiAwID8gd2l0aEVudHJ5W2lkeCAtIDFdLmVudHJ5IDogbnVsbFxuICBjb25zdCBuZXh0ID0gaWR4IDwgd2l0aEVudHJ5Lmxlbmd0aCAtIDEgPyB3aXRoRW50cnlbaWR4ICsgMV0uZW50cnkgOiBudWxsXG4gIHJldHVybiBvayh7XG4gICAgcGF0aDogeyBzbHVnIH0sXG4gICAgcHJldmlvdXM6IHByZXYgPyB7IGRvY3VtZW50SWQ6IHByZXYuZG9jdW1lbnRJZCwgc2x1ZzogcHJldi5zbHVnLCB0aXRsZTogcHJldi50aXRsZSB9IDogbnVsbCxcbiAgICBuZXh0OiBuZXh0ID8geyBkb2N1bWVudElkOiBuZXh0LmRvY3VtZW50SWQsIHNsdWc6IG5leHQuc2x1ZywgdGl0bGU6IG5leHQudGl0bGUgfSA6IG51bGwsXG4gIH0pXG59KVxuXG4vLyDilIDilIAg5Li76aKYIOKUgOKUgFxuXG5yZXNlYXJjaFJvdXRlcy5nZXQoJy9yZXNlYXJjaC10aGVtZXMnLCBhc3luYyAoYykgPT4ge1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKGMucmVxLnVybClcbiAgY29uc3QgcGFyYW1zID0gcGFyc2VMaXN0UGFyYW1zKHVybClcbiAgY29uc3QgZGIgPSBjLmVudi5EQlxuXG4gIGNvbnN0IHRvdGFsUm93ID0gYXdhaXQgZGJcbiAgICAucHJlcGFyZShgU0VMRUNUIENPVU5UKCopIEFTIG4gRlJPTSByZXNlYXJjaF90aGVtZXMgV0hFUkUgJHtQVUJMSVNIRUR9YClcbiAgICAuZmlyc3Q8eyBuOiBudW1iZXIgfT4oKVxuICBjb25zdCByb3dzID0gYXdhaXQgZGJcbiAgICAucHJlcGFyZShcbiAgICAgIGBTRUxFQ1QgKiBGUk9NIHJlc2VhcmNoX3RoZW1lcyBXSEVSRSAke1BVQkxJU0hFRH1cbiAgICAgICBPUkRFUiBCWSB0aXRsZV9qc29uIEFTQywgaWQgQVNDIExJTUlUID8xIE9GRlNFVCA/MmBcbiAgICApXG4gICAgLmJpbmQocGFyYW1zLnBhZ2VTaXplLCAocGFyYW1zLnBhZ2UgLSAxKSAqIHBhcmFtcy5wYWdlU2l6ZSlcbiAgICAuYWxsPFRoZW1lUm93PigpXG4gIHJldHVybiBva1BhZ2luYXRlZChcbiAgICAocm93cy5yZXN1bHRzID8/IFtdKS5tYXAoKHIpID0+IHRoZW1lSnNvbihyLCBwYXJhbXMubG9jYWxlKSksXG4gICAgcGFnaW5hdGlvbk9mKHBhcmFtcy5wYWdlLCBwYXJhbXMucGFnZVNpemUsIHRvdGFsUm93Py5uID8/IDApXG4gIClcbn0pXG5cbnJlc2VhcmNoUm91dGVzLmdldCgnL3Jlc2VhcmNoLXRoZW1lcy86c2x1ZycsIGFzeW5jIChjKSA9PiB7XG4gIGNvbnN0IHNsdWcgPSBjLnJlcS5wYXJhbSgnc2x1ZycpXG4gIGNvbnN0IHVybCA9IG5ldyBVUkwoYy5yZXEudXJsKVxuICBjb25zdCBwYXJhbXMgPSBwYXJzZUxpc3RQYXJhbXModXJsKVxuICBjb25zdCByb3cgPSBhd2FpdCBjLmVudi5EQlxuICAgIC5wcmVwYXJlKGBTRUxFQ1QgKiBGUk9NIHJlc2VhcmNoX3RoZW1lcyBXSEVSRSBzbHVnID0gPzEgQU5EICR7UFVCTElTSEVEfWApXG4gICAgLmJpbmQoc2x1ZylcbiAgICAuZmlyc3Q8VGhlbWVSb3c+KClcbiAgaWYgKCFyb3cpIHJldHVybiBmYWlsKDQwNCwgJ25vdF9mb3VuZCcpXG4gIHJldHVybiBvayh0aGVtZUpzb24ocm93LCBwYXJhbXMubG9jYWxlKSlcbn0pXG5cbi8vIOKUgOKUgCDogIPmja7lr7nosaEg4pSA4pSAXG5cbnJlc2VhcmNoUm91dGVzLmdldCgnL3Jlc2VhcmNoLXN1YmplY3RzJywgYXN5bmMgKGMpID0+IHtcbiAgY29uc3QgdXJsID0gbmV3IFVSTChjLnJlcS51cmwpXG4gIGNvbnN0IHBhcmFtcyA9IHBhcnNlTGlzdFBhcmFtcyh1cmwpXG4gIGNvbnN0IGRiID0gYy5lbnYuREJcblxuICAvLyBmaWx0ZXJzWyRvcl1bMF1bc3R1ZGVudHNdW2lkXVskZXFdIC8gZmlsdGVyc1skb3JdWzFdW3N0dWRlbnRzXVtkb2N1bWVudElkXVskZXFdXG4gIGNvbnN0IHN0dWRlbnRJZEVxID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoJ2ZpbHRlcnNbJG9yXVswXVtzdHVkZW50c11baWRdWyRlcV0nKVxuICBjb25zdCBzdHVkZW50RG9jRXEgPSB1cmwuc2VhcmNoUGFyYW1zLmdldCgnZmlsdGVyc1skb3JdWzFdW3N0dWRlbnRzXVtkb2N1bWVudElkXVskZXFdJylcbiAgbGV0IHdoZXJlID0gJydcbiAgY29uc3QgYmluZHM6IHVua25vd25bXSA9IFtdXG4gIGlmIChzdHVkZW50SWRFcSAhPT0gbnVsbCB8fCBzdHVkZW50RG9jRXEgIT09IG51bGwpIHtcbiAgICBjb25zdCBjb25kczogc3RyaW5nW10gPSBbXVxuICAgIGlmIChzdHVkZW50SWRFcSAhPT0gbnVsbCkge1xuICAgICAgY29uZHMucHVzaCgnc3Muc3R1ZGVudF9pZCA9ID8nKVxuICAgICAgYmluZHMucHVzaChOdW1iZXIoc3R1ZGVudElkRXEpKVxuICAgIH1cbiAgICBpZiAoc3R1ZGVudERvY0VxICE9PSBudWxsKSB7XG4gICAgICBjb25kcy5wdXNoKCdzdC5kb2N1bWVudF9pZCA9ID8nKVxuICAgICAgYmluZHMucHVzaChzdHVkZW50RG9jRXEpXG4gICAgfVxuICAgIHdoZXJlID0gYCBBTkQgaWQgSU4gKFxuICAgICAgU0VMRUNUIHNzLnN1YmplY3RfaWQgRlJPTSBzdWJqZWN0X3N0dWRlbnRzIHNzXG4gICAgICBKT0lOIHN0dWRlbnRzIHN0IE9OIHN0LmlkID0gc3Muc3R1ZGVudF9pZFxuICAgICAgV0hFUkUgc3QuJHtQVUJMSVNIRUR9IEFORCAoJHtjb25kcy5qb2luKCcgT1IgJyl9KSlgXG4gIH1cblxuICBjb25zdCB0b3RhbFJvdyA9IGF3YWl0IGRiXG4gICAgLnByZXBhcmUoYFNFTEVDVCBDT1VOVCgqKSBBUyBuIEZST00gcmVzZWFyY2hfc3ViamVjdHMgV0hFUkUgJHtQVUJMSVNIRUR9JHt3aGVyZX1gKVxuICAgIC5iaW5kKC4uLmJpbmRzKVxuICAgIC5maXJzdDx7IG46IG51bWJlciB9PigpXG4gIGNvbnN0IHJvd3MgPSBhd2FpdCBkYlxuICAgIC5wcmVwYXJlKFxuICAgICAgYFNFTEVDVCAqIEZST00gcmVzZWFyY2hfc3ViamVjdHMgV0hFUkUgJHtQVUJMSVNIRUR9JHt3aGVyZX1cbiAgICAgICBPUkRFUiBCWSB0aXRsZV9qc29uIEFTQywgaWQgQVNDIExJTUlUID8ke2JpbmRzLmxlbmd0aCArIDF9IE9GRlNFVCA/JHtiaW5kcy5sZW5ndGggKyAyfWBcbiAgICApXG4gICAgLmJpbmQoLi4uYmluZHMsIHBhcmFtcy5wYWdlU2l6ZSwgKHBhcmFtcy5wYWdlIC0gMSkgKiBwYXJhbXMucGFnZVNpemUpXG4gICAgLmFsbDxTdWJqZWN0Um93PigpXG5cbiAgY29uc3QgZGF0YSA9IChyb3dzLnJlc3VsdHMgPz8gW10pLm1hcCgocikgPT4gc3ViamVjdEpzb24ociwgcGFyYW1zLmxvY2FsZSkpXG4gIC8vIHBvcHVsYXRlW2VudHJpZXNdW2ZpZWxkc109dGl0bGUsc2x1Z++8muWtpueUn+mhteadoeebruiuoeaVsOaJgOmcgOeahOacgOWwj+Wtl+autVxuICBpZiAoc3R1ZGVudElkRXEgIT09IG51bGwgfHwgc3R1ZGVudERvY0VxICE9PSBudWxsKSB7XG4gICAgZm9yIChjb25zdCBzIG9mIGRhdGEpIHtcbiAgICAgIGNvbnN0IGVudHJpZXMgPSBhd2FpdCBkYlxuICAgICAgICAucHJlcGFyZShcbiAgICAgICAgICBgU0VMRUNUIGUuaWQsIGUuZG9jdW1lbnRfaWQsIGUuc2x1ZywgZS50aXRsZV9qc29uIEZST00gZW50cnlfc3ViamVjdHMgZXNcbiAgICAgICAgICAgSk9JTiByZXNlYXJjaF9lbnRyaWVzIGUgT04gZS5pZCA9IGVzLmVudHJ5X2lkIEFORCBlLiR7UFVCTElTSEVEfVxuICAgICAgICAgICBXSEVSRSBlcy5zdWJqZWN0X2lkID0gPzEgT1JERVIgQlkgZS51cGRhdGVkX2F0IERFU0NgXG4gICAgICAgIClcbiAgICAgICAgLmJpbmQocy5pZClcbiAgICAgICAgLmFsbDxFbnRyeVJvdz4oKVxuICAgICAgcy5lbnRyaWVzID0gKGVudHJpZXMucmVzdWx0cyA/PyBbXSkubWFwKChlKSA9PiAoe1xuICAgICAgICBpZDogZS5pZCxcbiAgICAgICAgZG9jdW1lbnRJZDogZS5kb2N1bWVudF9pZCxcbiAgICAgICAgdGl0bGU6IHBpY2tMb2NhbGUoZS50aXRsZV9qc29uLCBwYXJhbXMubG9jYWxlKSxcbiAgICAgICAgc2x1ZzogZS5zbHVnLFxuICAgICAgfSkpXG4gICAgfVxuICB9XG4gIHJldHVybiBva1BhZ2luYXRlZChkYXRhLCBwYWdpbmF0aW9uT2YocGFyYW1zLnBhZ2UsIHBhcmFtcy5wYWdlU2l6ZSwgdG90YWxSb3c/Lm4gPz8gMCkpXG59KVxuXG5yZXNlYXJjaFJvdXRlcy5nZXQoJy9yZXNlYXJjaC1zdWJqZWN0cy86c2x1ZycsIGFzeW5jIChjKSA9PiB7XG4gIGNvbnN0IHNsdWcgPSBjLnJlcS5wYXJhbSgnc2x1ZycpXG4gIGNvbnN0IHVybCA9IG5ldyBVUkwoYy5yZXEudXJsKVxuICBjb25zdCBwYXJhbXMgPSBwYXJzZUxpc3RQYXJhbXModXJsKVxuICBjb25zdCBkYiA9IGMuZW52LkRCXG5cbiAgY29uc3Qgcm93ID0gYXdhaXQgZGJcbiAgICAucHJlcGFyZShgU0VMRUNUICogRlJPTSByZXNlYXJjaF9zdWJqZWN0cyBXSEVSRSBzbHVnID0gPzEgQU5EICR7UFVCTElTSEVEfWApXG4gICAgLmJpbmQoc2x1ZylcbiAgICAuZmlyc3Q8U3ViamVjdFJvdz4oKVxuICBpZiAoIXJvdykgcmV0dXJuIGZhaWwoNDA0LCAnbm90X2ZvdW5kJylcbiAgY29uc3Qgc3ViamVjdCA9IHN1YmplY3RKc29uKHJvdywgcGFyYW1zLmxvY2FsZSlcblxuICAvLyBwb3B1bGF0ZVtzdHVkZW50c11bcG9wdWxhdGVdW2F2YXRhcl3vvJrlrabnlJ/ljaHvvIhhdmF0YXIg5pysIHNjaGVtYSDml6DlqpLkvZPooajvvIznva4gbnVsbO+8iVxuICBjb25zdCBzdHVkZW50cyA9IGF3YWl0IGRiXG4gICAgLnByZXBhcmUoXG4gICAgICBgU0VMRUNUIHN0LiogRlJPTSBzdWJqZWN0X3N0dWRlbnRzIHNzXG4gICAgICAgSk9JTiBzdHVkZW50cyBzdCBPTiBzdC5pZCA9IHNzLnN0dWRlbnRfaWQgQU5EIHN0LiR7UFVCTElTSEVEfVxuICAgICAgIFdIRVJFIHNzLnN1YmplY3RfaWQgPSA/MSBPUkRFUiBCWSBzdC5uYW1lIEFTQ2BcbiAgICApXG4gICAgLmJpbmQocm93LmlkKVxuICAgIC5hbGw8e1xuICAgICAgaWQ6IG51bWJlclxuICAgICAgZG9jdW1lbnRfaWQ6IHN0cmluZ1xuICAgICAgbmFtZTogc3RyaW5nXG4gICAgICBhdmF0YXJfdXJsOiBzdHJpbmcgfCBudWxsXG4gICAgICBvcmdhbml6YXRpb246IHN0cmluZyB8IG51bGxcbiAgICAgIHdpa2lfdXJsOiBzdHJpbmcgfCBudWxsXG4gICAgfT4oKVxuICBzdWJqZWN0LnN0dWRlbnRzID0gKHN0dWRlbnRzLnJlc3VsdHMgPz8gW10pLm1hcCgoc3QpID0+ICh7XG4gICAgaWQ6IHN0LmlkLFxuICAgIGRvY3VtZW50SWQ6IHN0LmRvY3VtZW50X2lkLFxuICAgIG5hbWU6IHN0Lm5hbWUsXG4gICAgYXZhdGFyOiBzdC5hdmF0YXJfdXJsID8geyB1cmw6IHN0LmF2YXRhcl91cmwgfSA6IG51bGwsXG4gICAgb3JnYW5pemF0aW9uOiBzdC5vcmdhbml6YXRpb24gPz8gdW5kZWZpbmVkLFxuICB9KSlcbiAgcmV0dXJuIG9rKHN1YmplY3QpXG59KVxuXG4vLyDilIDilIAg55+l6K+G5Zu+6LCxIOKUgOKUgFxuXG4vLyBHRVQgL3Jlc2VhcmNoLWdyYXBoIOKAlCDoioLngrnvvIjmnaHnm67vvIkrIOi+ue+8iHJlbGF0ZWRfbGlua3PvvInvvIzkuLvpopgv5a+56LGh5L2c5Li66IqC54K55bGe5oCnXG5yZXNlYXJjaFJvdXRlcy5nZXQoJy9yZXNlYXJjaC1ncmFwaCcsIGFzeW5jIChjKSA9PiB7XG4gIGNvbnN0IHVybCA9IG5ldyBVUkwoYy5yZXEudXJsKVxuICBjb25zdCBwYXJhbXMgPSBwYXJzZUxpc3RQYXJhbXModXJsKVxuICBjb25zdCBkYiA9IGMuZW52LkRCXG5cbiAgdHlwZSBHcmFwaE5vZGUgPSB7XG4gICAgaWQ6IHN0cmluZ1xuICAgIHRpdGxlOiBzdHJpbmdcbiAgICBzbHVnOiBzdHJpbmdcbiAgICBtZWRpYV90eXBlOiBzdHJpbmdcbiAgICBib2R5Pzogc3RyaW5nXG4gICAgdGhlbWVzOiBBcnJheTx7IG5hbWU6IHN0cmluZzsgc2x1Zzogc3RyaW5nIH0+XG4gICAgc3ViamVjdHM6IEFycmF5PHsgbmFtZTogc3RyaW5nOyBzbHVnOiBzdHJpbmcgfT5cbiAgfVxuICB0eXBlIEdyYXBoRWRnZSA9IHsgc291cmNlOiBzdHJpbmc7IHRhcmdldDogc3RyaW5nOyByZWxhdGlvbl90eXBlOiBzdHJpbmcgfVxuXG4gIGNvbnN0IHJvd3MgPSBhd2FpdCBkYlxuICAgIC5wcmVwYXJlKFxuICAgICAgYFNFTEVDVCAqIEZST00gcmVzZWFyY2hfZW50cmllcyBXSEVSRSAke1BVQkxJU0hFRH0gT1JERVIgQlkgdXBkYXRlZF9hdCBERVNDIExJTUlUIDIwMGBcbiAgICApXG4gICAgLmFsbDxFbnRyeVJvdz4oKVxuICBjb25zdCBlbnRyaWVzID0gKHJvd3MucmVzdWx0cyA/PyBbXSkubWFwKChyKSA9PiBlbnRyeUpzb24ociwgcGFyYW1zLmxvY2FsZSkpXG5cbiAgLy8g6IqC54K55bGe5oCn77ya5Li76aKYL+WvueixoeacgOWwj+Wtl+aute+8iG5hbWUvc2x1Z++8ie+8jOS4gOasoSBJTiDmn6Xor6LmjIkgZW50cnkg5YiG57uEXG4gIGF3YWl0IGF0dGFjaFRoZW1lcyhkYiwgZW50cmllcywgcGFyYW1zLmxvY2FsZSlcbiAgYXdhaXQgYXR0YWNoU3ViamVjdHMoZGIsIGVudHJpZXMsIHBhcmFtcy5sb2NhbGUpXG5cbiAgY29uc3QgYWxsTGlua3MgPSBhd2FpdCBkYlxuICAgIC5wcmVwYXJlKFxuICAgICAgYFNFTEVDVCBybC5lbnRyeV9pZCwgcmwudGFyZ2V0X2RvY3VtZW50X2lkLCBybC5yZWxhdGlvbl90eXBlLFxuICAgICAgICAgICAgICB0ZS5kb2N1bWVudF9pZCBBUyB0YXJnZXRfZG9jXG4gICAgICAgRlJPTSBlbnRyeV9yZWxhdGVkX2xpbmtzIHJsXG4gICAgICAgSk9JTiByZXNlYXJjaF9lbnRyaWVzIHRlIE9OIHRlLmRvY3VtZW50X2lkID0gcmwudGFyZ2V0X2RvY3VtZW50X2lkIEFORCB0ZS4ke1BVQkxJU0hFRH1cbiAgICAgICBXSEVSRSBybC5lbnRyeV9pZCBJTiAoJHtlbnRyaWVzLm1hcCgoKSA9PiAnPycpLmpvaW4oJywnKSB8fCAnTlVMTCd9KWBcbiAgICApXG4gICAgLmJpbmQoLi4uZW50cmllcy5tYXAoKGUpID0+IGUuaWQpKVxuICAgIC5hbGw8eyBlbnRyeV9pZDogbnVtYmVyOyB0YXJnZXRfZG9jdW1lbnRfaWQ6IHN0cmluZzsgcmVsYXRpb25fdHlwZTogc3RyaW5nOyB0YXJnZXRfZG9jOiBzdHJpbmcgfT4oKVxuXG4gIGNvbnN0IGRvY0lkQnlJbnRlcm5hbCA9IG5ldyBNYXAoZW50cmllcy5tYXAoKGUpID0+IFtlLmlkLCBlLmRvY3VtZW50SWRdKSlcbiAgY29uc3QgbGlua3NCeUVudHJ5ID0gbmV3IE1hcDxudW1iZXIsIEFycmF5PHsgdGFyZ2V0X2RvYzogc3RyaW5nOyByZWxhdGlvbl90eXBlOiBzdHJpbmcgfT4+KClcbiAgZm9yIChjb25zdCBsIG9mIGFsbExpbmtzLnJlc3VsdHMgPz8gW10pIHtcbiAgICBsZXQgbGlzdCA9IGxpbmtzQnlFbnRyeS5nZXQobC5lbnRyeV9pZClcbiAgICBpZiAoIWxpc3QpIGxpbmtzQnlFbnRyeS5zZXQobC5lbnRyeV9pZCwgKGxpc3QgPSBbXSkpXG4gICAgbGlzdC5wdXNoKHsgdGFyZ2V0X2RvYzogbC50YXJnZXRfZG9jLCByZWxhdGlvbl90eXBlOiBsLnJlbGF0aW9uX3R5cGUgfSlcbiAgfVxuXG4gIGNvbnN0IG5vZGVzOiBHcmFwaE5vZGVbXSA9IFtdXG4gIGNvbnN0IGVkZ2VzOiBHcmFwaEVkZ2VbXSA9IFtdXG4gIGZvciAoY29uc3QgZSBvZiBlbnRyaWVzKSB7XG4gICAgbm9kZXMucHVzaCh7XG4gICAgICBpZDogZS5kb2N1bWVudElkLFxuICAgICAgdGl0bGU6IGUudGl0bGUsXG4gICAgICBzbHVnOiBlLnNsdWcsXG4gICAgICBtZWRpYV90eXBlOiBlLm1lZGlhX3R5cGUsXG4gICAgICBib2R5OiBlLmJvZHksXG4gICAgICB0aGVtZXM6IChlLnRoZW1lcyA/PyBbXSkubWFwKCh0KSA9PiAoeyBuYW1lOiB0Lm5hbWUsIHNsdWc6IHQuc2x1ZyB9KSksXG4gICAgICBzdWJqZWN0czogKGUuc3ViamVjdHMgPz8gW10pLm1hcCgocykgPT4gKHsgbmFtZTogcy5uYW1lLCBzbHVnOiBzLnNsdWcgfSkpLFxuICAgIH0pXG4gICAgZm9yIChjb25zdCBsIG9mIGxpbmtzQnlFbnRyeS5nZXQoZS5pZCkgPz8gW10pIHtcbiAgICAgIGVkZ2VzLnB1c2goe1xuICAgICAgICBzb3VyY2U6IGRvY0lkQnlJbnRlcm5hbC5nZXQoZS5pZCkgPz8gZS5kb2N1bWVudElkLFxuICAgICAgICB0YXJnZXQ6IGwudGFyZ2V0X2RvYyxcbiAgICAgICAgcmVsYXRpb25fdHlwZTogbC5yZWxhdGlvbl90eXBlLFxuICAgICAgfSlcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG9rKHsgbm9kZXMsIGVkZ2VzIH0pXG59KVxuIl0sImZpbGUiOiIvVXNlcnMva2FyYS9Db2RlL1NjaGFsZS1MaWJyYXJ5L3NlcnZlci9zcmMvY29udGVudC9yZXNlYXJjaC50cyJ9
