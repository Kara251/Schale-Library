// /Users/kara/Code/Schale-Library/server/src/content/events.ts
const __vite_ssr_import_0__ = await __vite_ssr_import__("hono", {"importedNames":["Hono"]});
const __vite_ssr_import_1__ = await __vite_ssr_import__("/src/lib/i18n.ts", {"importedNames":["pickLocale","parseJsonArray"]});
const __vite_ssr_import_2__ = await __vite_ssr_import__("/src/lib/respond.ts", {"importedNames":["ok","okPaginated","fail","paginationOf"]});
const __vite_ssr_import_3__ = await __vite_ssr_import__("/src/content/sql.ts", {"importedNames":["cond","andAll","orAny","limitOffset","camelToSnake"]});
const __vite_ssr_import_4__ = await __vite_ssr_import__("/src/content/query.ts", {"importedNames":["parseContentQuery"]});





const EVENTS_SELECT = `SELECT e.*, l.country, l.region, l.city, l.venue, l.address, l.location_note, l.map_url
FROM events e LEFT JOIN event_locations l ON l.event_id = e.id`;
function toIso(ms) {
  return ms === null ? null : new Date(ms).toISOString();
}
function eventToJson(row, locale) {
  const base = {
    id: row.id,
    documentId: row.document_id,
    title: __vite_ssr_import_1__.pickLocale(row.title_json, locale),
    nature: row.nature,
    eventFormat: row.event_format,
    statusOverride: row.status_override,
    country: row.country ?? void 0,
    region: row.region ?? void 0,
    startTime: toIso(row.start_time),
    endTime: toIso(row.end_time),
    link: row.link ?? void 0,
    ticketUrl: row.ticket_url ?? void 0,
    ticketStatus: row.ticket_status,
    ticketPriceText: __vite_ssr_import_1__.pickLocale(row.ticket_price_text_json, locale) || void 0,
    priceMin: row.price_min,
    priceMax: row.price_max,
    currency: row.currency ?? void 0,
    coverImage: row.cover_image_url ? { url: row.cover_image_url } : void 0,
    organizer: row.organizer ?? void 0,
    organizerVerified: row.organizer_verified === 1,
    tags: __vite_ssr_import_1__.parseJsonArray(row.tags_json).join(","),
    guests: __vite_ssr_import_1__.parseJsonArray(row.guests_json).join(","),
    sourcePlatform: row.source_platform,
    sourceName: row.source_platform ? row.source_platform : void 0,
    sourceUrl: row.source_url ?? void 0,
    lastVerifiedAt: toIso(row.last_verified_at),
    description: __vite_ssr_import_1__.pickLocale(row.description_json, locale) || void 0,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    publishedAt: toIso(row.published_at),
    locale
  };
  if (row.kind === "offline") {
    const location = [row.venue, row.address, row.city].filter(Boolean).join(" ");
    return { ...base, kind: "offline", location, venue: row.venue ?? void 0, address: row.address ?? void 0, city: row.city ?? void 0, mapUrl: row.map_url ?? void 0 };
  }
  return { ...base, kind: "online", platform: row.source_platform ?? void 0 };
}
const EVENT_SORT_COLUMNS = {
  start_time: "e.start_time",
  end_time: "e.end_time",
  published_at: "e.published_at",
  created_at: "e.created_at"
};
function orderByOf(sorts) {
  if (sorts.length === 0) return "e.start_time DESC";
  const parts = sorts.map((s) => {
    const col = EVENT_SORT_COLUMNS[s.field] ?? (s.field.startsWith("e.") || s.field.includes(".") ? s.field : null);
    if (!col) return null;
    return `${col} ${s.dir.toUpperCase()}`;
  }).filter((p) => p !== null);
  return parts.length > 0 ? parts.join(", ") : "e.start_time DESC";
}
function buildEventWhere(q, kind, nowMs) {
  const conds = [
    { sql: "e.kind = ?", params: [kind] },
    { sql: "e.published_at IS NOT NULL", params: [] }
  ];
  for (const leaf of q.leaves) {
    const [head, rel] = leaf.path;
    if (head === "id" && leaf.op === "ne") {
      conds.push(__vite_ssr_import_3__.cond("e.id", "ne", parseInt(leaf.value, 10)));
      continue;
    }
    if (head === "end_time" && (leaf.op === "gte" || leaf.op === "gt")) {
      conds.push(__vite_ssr_import_3__.cond("e.end_time", "gte", Date.parse(leaf.value)));
      continue;
    }
    if (head === "start_time" && (leaf.op === "gt" || leaf.op === "lte")) {
      conds.push(__vite_ssr_import_3__.cond("e.start_time", leaf.op, Date.parse(leaf.value)));
      continue;
    }
    if (head === "nature" && leaf.op === "eq") {
      conds.push(__vite_ssr_import_3__.cond("e.nature", "eq", leaf.value));
      continue;
    }
    if ((head === "country" || head === "region" || head === "city") && leaf.op === "containsi") {
      if (head === "city" && kind === "online") continue;
      conds.push(__vite_ssr_import_3__.cond(`l.${__vite_ssr_import_3__.camelToSnake(head)}`, "containsi", leaf.value));
      continue;
    }
    void rel;
  }
  for (const group of q.orGroups) {
    const ors = [];
    for (const leaf of group) {
      const field = leaf.path[leaf.path.length - 1];
      if (field === "title") ors.push(__vite_ssr_import_3__.cond("LOWER(e.title_json)", "containsi", leaf.value));
      else if (field === "organizer") ors.push(__vite_ssr_import_3__.cond("e.organizer", "containsi", leaf.value));
      else if (field === "description") ors.push(__vite_ssr_import_3__.cond("LOWER(e.description_json)", "containsi", leaf.value));
      else if (field === "platform" && kind === "online") ors.push(__vite_ssr_import_3__.cond("e.source_platform", "containsi", leaf.value));
      else if (field === "location" && kind === "offline")
        ors.push(
          __vite_ssr_import_3__.orAny([
            __vite_ssr_import_3__.cond("l.venue", "containsi", leaf.value),
            __vite_ssr_import_3__.cond("l.address", "containsi", leaf.value),
            __vite_ssr_import_3__.cond("l.location_note", "containsi", leaf.value)
          ])
        );
      else if (field === "guests" && kind === "offline") ors.push(__vite_ssr_import_3__.cond("e.guests_json", "containsi", leaf.value));
      else if (field === "tags") ors.push(__vite_ssr_import_3__.cond("e.tags_json", "containsi", leaf.value));
      else if (field === "ticket_price_text") ors.push(__vite_ssr_import_3__.cond("e.ticket_price_text_json", "containsi", leaf.value));
      else if (field === "source_name") ors.push(__vite_ssr_import_3__.cond("e.source_platform", "containsi", leaf.value));
      else if (field === "country" || field === "region" || field === "city") {
        if (field === "city" && kind === "online") continue;
        ors.push(__vite_ssr_import_3__.cond(`l.${__vite_ssr_import_3__.camelToSnake(field)}`, "containsi", leaf.value));
      }
    }
    conds.push(__vite_ssr_import_3__.orAny(ors));
  }
  return __vite_ssr_import_3__.andAll(conds);
}
const eventsRoutes = new __vite_ssr_import_0__.Hono();
Object.defineProperty(__vite_ssr_exports__, "eventsRoutes", { enumerable: true, configurable: true, get(){ return eventsRoutes }});
async function fetchRows(db, whereSql, orderSql, limOff) {
  const stmt = db.prepare(`${EVENTS_SELECT} WHERE ${whereSql.sql} ORDER BY ${orderSql} ${limOff.sql}`);
  const out = await stmt.bind([...whereSql.params, ...limOff.params]).all();
  return out.results ?? [];
}
async function countRows(db, whereSql) {
  const stmt = db.prepare(`SELECT COUNT(*) AS n FROM events e LEFT JOIN event_locations l ON l.event_id = e.id WHERE ${whereSql.sql}`);
  const row = await stmt.bind(...whereSql.params).first();
  return row?.n ?? 0;
}
for (const kind of ["online", "offline"]) {
  const path = kind === "online" ? "/online-events" : "/offline-events";
  eventsRoutes.get(path, async (c) => {
    const q = __vite_ssr_import_4__.parseContentQuery(new URL(c.req.url));
    const sortMode = q.sorts[0]?.field;
    const nowMs = Date.now();
    let rows;
    let total;
    if (!q.limit && !q.start && sortMode === void 0) {
      const activeWhere = __vite_ssr_import_3__.andAll([buildBaseWhere(kind), __vite_ssr_import_3__.cond("e.end_time", "gte", nowMs)]);
      const endedWhere = __vite_ssr_import_3__.andAll([buildBaseWhere(kind), __vite_ssr_import_3__.cond("e.end_time", "lt", nowMs)]);
      const pageSize = q.pageSize;
      const [active, ended, activeCount, endedCount] = await Promise.all([
        fetchRows(c.env.DB, activeWhere, "e.start_time ASC", __vite_ssr_import_3__.limitOffset(pageSize, 0)),
        fetchRows(c.env.DB, endedWhere, "e.end_time DESC", __vite_ssr_import_3__.limitOffset(Math.max(0, pageSize), 0)),
        countRows(c.env.DB, activeWhere),
        countRows(c.env.DB, endedWhere)
      ]);
      rows = [...active, ...ended].slice(0, pageSize);
      total = activeCount + endedCount;
    } else {
      const where = buildEventWhere(q, kind, nowMs);
      const offset = q.start ?? (q.page - 1) * q.pageSize;
      const size = q.limit ?? q.pageSize;
      [rows, total] = await Promise.all([
        fetchRows(c.env.DB, where, orderByOf(q.sorts.length > 0 ? q.sorts : [{ field: "start_time", dir: "desc" }]), __vite_ssr_import_3__.limitOffset(size, offset)),
        countRows(c.env.DB, where)
      ]);
    }
    const data = rows.map((r) => eventToJson(r, q.locale));
    if (q.limit !== null || q.start !== null) {
      return __vite_ssr_import_2__.okPaginated(data, __vite_ssr_import_2__.paginationOf(q.page, q.pageSize, total));
    }
    return __vite_ssr_import_2__.okPaginated(data, __vite_ssr_import_2__.paginationOf(q.page, q.pageSize, total));
  });
  eventsRoutes.get(`${path}/:key`, async (c) => {
    const key = c.req.param("key").trim();
    const q = __vite_ssr_import_4__.parseContentQuery(new URL(c.req.url));
    const numeric = /^\d+$/.test(key);
    const where = __vite_ssr_import_3__.andAll([
      { sql: "e.kind = ?", params: [kind] },
      { sql: "e.published_at IS NOT NULL", params: [] },
      numeric ? __vite_ssr_import_3__.cond("e.id", "eq", parseInt(key, 10)) : __vite_ssr_import_3__.cond("e.document_id", "eq", key)
    ]);
    const rows = await fetchRows(c.env.DB, where, "e.start_time DESC", __vite_ssr_import_3__.limitOffset(1, 0));
    if (rows.length === 0) return __vite_ssr_import_2__.fail(404, "not_found");
    return __vite_ssr_import_2__.ok(eventToJson(rows[0], q.locale));
  });
}
function buildBaseWhere(kind) {
  return __vite_ssr_import_3__.andAll([
    { sql: "e.kind = ?", params: [kind] },
    { sql: "e.published_at IS NOT NULL", params: [] }
  ]);
}
eventsRoutes.get("/events-bundle", async (c) => {
  const url = new URL(c.req.url);
  const q = __vite_ssr_import_4__.parseContentQuery(url);
  const page = Number(url.searchParams.get("page") || "1") || 1;
  const pageSizeRaw = Number(url.searchParams.get("pageSize") || url.searchParams.get("limit") || "24");
  const pageSize = Math.min(100, Math.max(1, pageSizeRaw));
  const online = await fetchRows(c.env.DB, buildBaseWhere("online"), "e.start_time DESC", __vite_ssr_import_3__.limitOffset(500, 0));
  const offline = await fetchRows(c.env.DB, buildBaseWhere("offline"), "e.start_time DESC", __vite_ssr_import_3__.limitOffset(500, 0));
  const seen = /* @__PURE__ */ new Set();
  const locationRecords = [];
  const collect = (rows, kind) => {
    for (const r of rows) {
      const country = (r.country ?? "").trim();
      const region = (r.region ?? "").trim();
      const city = kind === "offline" ? (r.city ?? "").trim() : "";
      if (!country && !region && !city) continue;
      const key = `${kind}|${country}|${region}|${city}`;
      if (seen.has(key)) continue;
      seen.add(key);
      locationRecords.push({ kind, country, region, city });
    }
  };
  collect(online, "online");
  collect(offline, "offline");
  const merged = [
    ...online.map((r) => ({ event: eventToJson(r, q.locale), type: "online" })),
    ...offline.map((r) => ({ event: eventToJson(r, q.locale), type: "offline" }))
  ];
  merged.sort((a, b) => {
    const ea = a.event;
    const eb = b.event;
    return String(eb.startTime ?? "").localeCompare(String(ea.startTime ?? ""));
  });
  const start = (Math.max(1, page) - 1) * pageSize;
  const paged = merged.slice(start, start + pageSize);
  const pagination = __vite_ssr_import_2__.paginationOf(page, pageSize, merged.length);
  return Response.json({ data: paged, meta: { pagination }, locationRecords });
});

//# sourceMappingSource=vite-node
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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SSxJQUFJO0FBQ2hELFVBQUksS0FBSyxJQUFJLEdBQUcsRUFBRztBQUNuQixXQUFLLElBQUksR0FBRztBQUNaLHNCQUFnQixLQUFLLEVBQUUsTUFBTSxTQUFTLFFBQVEsS0FBSyxDQUFDO0FBQUEsSUFDdEQ7QUFBQSxFQUNGO0FBQ0EsVUFBUSxRQUFRLFFBQVE7QUFDeEIsVUFBUSxTQUFTLFNBQVM7QUFFMUIsUUFBTSxTQUF3QztBQUFBLElBQzVDLEdBQUcsT0FBTyxJQUFJLENBQUMsT0FBTyxFQUFFLE9BQU8sWUFBWSxHQUFHLEVBQUUsTUFBTSxHQUFHLE1BQU0sU0FBUyxFQUFFO0FBQUEsSUFDMUUsR0FBRyxRQUFRLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxZQUFZLEdBQUcsRUFBRSxNQUFNLEdBQUcsTUFBTSxVQUFVLEVBQUU7QUFBQSxFQUM5RTtBQUNBLFNBQU8sS0FBSyxDQUFDLEdBQUcsTUFBTTtBQUNwQixVQUFNLEtBQUssRUFBRTtBQUNiLFVBQU0sS0FBSyxFQUFFO0FBQ2IsV0FBTyxPQUFPLEdBQUcsYUFBYSxFQUFFLEVBQUUsY0FBYyxPQUFPLEdBQUcsYUFBYSxFQUFFLENBQUM7QUFBQSxFQUM1RSxDQUFDO0FBRUQsUUFBTSxTQUFTLEtBQUssSUFBSSxHQUFHLElBQUksSUFBSSxLQUFLO0FBQ3hDLFFBQU0sUUFBUSxPQUFPLE1BQU0sT0FBTyxRQUFRLFFBQVE7QUFDbEQsUUFBTSxhQUErQixtQ0FBYSxNQUFNLFVBQVUsT0FBTyxNQUFNO0FBQy9FLFNBQU8sU0FBUyxLQUFLLEVBQUUsTUFBTSxPQUFPLE1BQU0sRUFBRSxXQUFXLEdBQUcsZ0JBQWdCLENBQUM7QUFDN0UsQ0FBQyIsIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiZXZlbnRzLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICog5YWs5byA5YaF5a65IEFQSSDigJQgZXZlbnRzIOWfn+OAglxuICog56uv54K577yI5a+55ouNIGZyb250ZW5kL3Rlc3RzL2NvbnRyYWN0cy9ldmVudHMudHMgKyBmcm9udGVuZC9zcmMvbGliL2FwaS9ldmVudHMudHPvvInvvJpcbiAqIC0gR0VUIC9vbmxpbmUtZXZlbnRz44CBL29mZmxpbmUtZXZlbnRz77ya5YiX6KGo77yIcmVsZXZhbnQg5Y+M5q615o6S5bqPIC8gc3RhcnRUaW1lIC8gZW5kVGltZSDmqKHlvI/vvIlcbiAqIC0gR0VUIC9vbmxpbmUtZXZlbnRzLzppZE9yRG9jSWTjgIEvb2ZmbGluZS1ldmVudHMvOmlkT3JEb2NJZO+8muivpuaDhe+8iOaVsOWtlyDihpIgaWTvvIzlkKbliJkgZG9jdW1lbnRJZO+8iVxuICogLSBHRVQgL2V2ZW50cy1idW5kbGXvvJrkuIDmrKHlhajph4/miavmj4/lkIzml7bkuqflh7rlkIjlubbliIbpobXliJfooaggKyDljrvph43lnLDljLrnrZvpgInpoblcbiAqXG4gKiDlk43lupTlvaLnirblr7npvZDliY3nq6/mtojotLnlrZfmrrXvvJp0aXRsZS9uYXR1cmUvZXZlbnRGb3JtYXQvc3RhcnRUaW1lL+KApi9jb3ZlckltYWdlLnVybO+8m1xuICogaTE4biDliJfvvIgqX2pzb27vvInnu48gcGlja0xvY2FsZSDovpPlh7rljZXlrZfnrKbkuLLjgILojYnnqL/vvIhwdWJsaXNoZWRfYXQgSVMgTlVMTO+8ieawuOS4jeWHuueOsOWcqOWFrOW8gCBBUEnjgIJcbiAqL1xuaW1wb3J0IHsgSG9ubyB9IGZyb20gJ2hvbm8nXG5pbXBvcnQgdHlwZSB7IEVudiB9IGZyb20gJy4uL2luZGV4J1xuaW1wb3J0IHsgcGlja0xvY2FsZSwgcGFyc2VKc29uQXJyYXkgfSBmcm9tICcuLi9saWIvaTE4bidcbmltcG9ydCB7IG9rLCBva1BhZ2luYXRlZCwgZmFpbCwgcGFnaW5hdGlvbk9mIH0gZnJvbSAnLi4vbGliL3Jlc3BvbmQnXG5pbXBvcnQgdHlwZSB7IFN0cmFwaVBhZ2luYXRpb24gfSBmcm9tICcuLi9saWIvcmVzcG9uZCdcbmltcG9ydCB7IGNvbmQsIGFuZEFsbCwgb3JBbnksIGxpbWl0T2Zmc2V0LCBjYW1lbFRvU25ha2UgfSBmcm9tICcuL3NxbCdcbmltcG9ydCB0eXBlIHsgU3FsQ29uZCB9IGZyb20gJy4vc3FsJ1xuaW1wb3J0IHsgcGFyc2VDb250ZW50UXVlcnkgfSBmcm9tICcuL3F1ZXJ5J1xuaW1wb3J0IHR5cGUgeyBQYXJzZWRDb250ZW50UXVlcnkgfSBmcm9tICcuL3F1ZXJ5J1xuXG50eXBlIFJvdyA9IFJlY29yZDxzdHJpbmcsIHVua25vd24+XG5cbmludGVyZmFjZSBFdmVudFJvdyBleHRlbmRzIFJvdyB7XG4gIGlkOiBudW1iZXJcbiAgZG9jdW1lbnRfaWQ6IHN0cmluZ1xuICBraW5kOiBzdHJpbmdcbiAgdGl0bGVfanNvbjogc3RyaW5nIHwgbnVsbFxuICBkZXNjcmlwdGlvbl9qc29uOiBzdHJpbmcgfCBudWxsXG4gIG5hdHVyZTogc3RyaW5nXG4gIGV2ZW50X2Zvcm1hdDogc3RyaW5nIHwgbnVsbFxuICBzdGF0dXNfb3ZlcnJpZGU6IHN0cmluZyB8IG51bGxcbiAgc3RhcnRfdGltZTogbnVtYmVyIHwgbnVsbFxuICBlbmRfdGltZTogbnVtYmVyIHwgbnVsbFxuICBsaW5rOiBzdHJpbmcgfCBudWxsXG4gIGNvdmVyX2ltYWdlX3VybDogc3RyaW5nIHwgbnVsbFxuICBvcmdhbml6ZXI6IHN0cmluZyB8IG51bGxcbiAgb3JnYW5pemVyX3ZlcmlmaWVkOiBudW1iZXJcbiAgc291cmNlX3BsYXRmb3JtOiBzdHJpbmcgfCBudWxsXG4gIHNvdXJjZV91cmw6IHN0cmluZyB8IG51bGxcbiAgbGFzdF92ZXJpZmllZF9hdDogbnVtYmVyIHwgbnVsbFxuICB0YWdzX2pzb246IHN0cmluZyB8IG51bGxcbiAgZ3Vlc3RzX2pzb246IHN0cmluZyB8IG51bGxcbiAgdGlja2V0X3ByaWNlX3RleHRfanNvbjogc3RyaW5nIHwgbnVsbFxuICBwcmljZV9taW46IG51bWJlciB8IG51bGxcbiAgcHJpY2VfbWF4OiBudW1iZXIgfCBudWxsXG4gIGN1cnJlbmN5OiBzdHJpbmcgfCBudWxsXG4gIHRpY2tldF9zdGF0dXM6IHN0cmluZyB8IG51bGxcbiAgdGlja2V0X3VybDogc3RyaW5nIHwgbnVsbFxuICBjcmVhdGVkX2F0OiBudW1iZXJcbiAgdXBkYXRlZF9hdDogbnVtYmVyXG4gIHB1Ymxpc2hlZF9hdDogbnVtYmVyIHwgbnVsbFxufVxuXG5pbnRlcmZhY2UgTG9jYXRpb25Sb3cge1xuICBjb3VudHJ5OiBzdHJpbmcgfCBudWxsXG4gIHJlZ2lvbjogc3RyaW5nIHwgbnVsbFxuICBjaXR5OiBzdHJpbmcgfCBudWxsXG4gIHZlbnVlOiBzdHJpbmcgfCBudWxsXG4gIGFkZHJlc3M6IHN0cmluZyB8IG51bGxcbiAgbG9jYXRpb25fbm90ZTogc3RyaW5nIHwgbnVsbFxuICBtYXBfdXJsOiBzdHJpbmcgfCBudWxsXG59XG5cbmNvbnN0IEVWRU5UU19TRUxFQ1QgPSBgU0VMRUNUIGUuKiwgbC5jb3VudHJ5LCBsLnJlZ2lvbiwgbC5jaXR5LCBsLnZlbnVlLCBsLmFkZHJlc3MsIGwubG9jYXRpb25fbm90ZSwgbC5tYXBfdXJsXG5GUk9NIGV2ZW50cyBlIExFRlQgSk9JTiBldmVudF9sb2NhdGlvbnMgbCBPTiBsLmV2ZW50X2lkID0gZS5pZGBcblxuLyoqIHVuaXhlcG9jaCBtcyDihpIgSVNPIOWtl+espuS4su+8m05VTEwg4oaSIE5VTEwgKi9cbmZ1bmN0aW9uIHRvSXNvKG1zOiBudW1iZXIgfCBudWxsKTogc3RyaW5nIHwgbnVsbCB7XG4gIHJldHVybiBtcyA9PT0gbnVsbCA/IG51bGwgOiBuZXcgRGF0ZShtcykudG9JU09TdHJpbmcoKVxufVxuXG4vKiog6KGMIOKGkiBPbmxpbmVFdmVudCAvIE9mZmxpbmVFdmVudCBKU09OIOW9oueKtiAqL1xuZnVuY3Rpb24gZXZlbnRUb0pzb24ocm93OiBFdmVudFJvdyAmIExvY2F0aW9uUm93LCBsb2NhbGU6IHN0cmluZyk6IFJvdyB7XG4gIGNvbnN0IGJhc2UgPSB7XG4gICAgaWQ6IHJvdy5pZCxcbiAgICBkb2N1bWVudElkOiByb3cuZG9jdW1lbnRfaWQsXG4gICAgdGl0bGU6IHBpY2tMb2NhbGUocm93LnRpdGxlX2pzb24sIGxvY2FsZSksXG4gICAgbmF0dXJlOiByb3cubmF0dXJlLFxuICAgIGV2ZW50Rm9ybWF0OiByb3cuZXZlbnRfZm9ybWF0LFxuICAgIHN0YXR1c092ZXJyaWRlOiByb3cuc3RhdHVzX292ZXJyaWRlLFxuICAgIGNvdW50cnk6IHJvdy5jb3VudHJ5ID8/IHVuZGVmaW5lZCxcbiAgICByZWdpb246IHJvdy5yZWdpb24gPz8gdW5kZWZpbmVkLFxuICAgIHN0YXJ0VGltZTogdG9Jc28ocm93LnN0YXJ0X3RpbWUpLFxuICAgIGVuZFRpbWU6IHRvSXNvKHJvdy5lbmRfdGltZSksXG4gICAgbGluazogcm93LmxpbmsgPz8gdW5kZWZpbmVkLFxuICAgIHRpY2tldFVybDogcm93LnRpY2tldF91cmwgPz8gdW5kZWZpbmVkLFxuICAgIHRpY2tldFN0YXR1czogcm93LnRpY2tldF9zdGF0dXMsXG4gICAgdGlja2V0UHJpY2VUZXh0OiBwaWNrTG9jYWxlKHJvdy50aWNrZXRfcHJpY2VfdGV4dF9qc29uLCBsb2NhbGUpIHx8IHVuZGVmaW5lZCxcbiAgICBwcmljZU1pbjogcm93LnByaWNlX21pbixcbiAgICBwcmljZU1heDogcm93LnByaWNlX21heCxcbiAgICBjdXJyZW5jeTogcm93LmN1cnJlbmN5ID8/IHVuZGVmaW5lZCxcbiAgICBjb3ZlckltYWdlOiByb3cuY292ZXJfaW1hZ2VfdXJsID8geyB1cmw6IHJvdy5jb3Zlcl9pbWFnZV91cmwgfSA6IHVuZGVmaW5lZCxcbiAgICBvcmdhbml6ZXI6IHJvdy5vcmdhbml6ZXIgPz8gdW5kZWZpbmVkLFxuICAgIG9yZ2FuaXplclZlcmlmaWVkOiByb3cub3JnYW5pemVyX3ZlcmlmaWVkID09PSAxLFxuICAgIHRhZ3M6IHBhcnNlSnNvbkFycmF5KHJvdy50YWdzX2pzb24pLmpvaW4oJywnKSxcbiAgICBndWVzdHM6IHBhcnNlSnNvbkFycmF5KHJvdy5ndWVzdHNfanNvbikuam9pbignLCcpLFxuICAgIHNvdXJjZVBsYXRmb3JtOiByb3cuc291cmNlX3BsYXRmb3JtLFxuICAgIHNvdXJjZU5hbWU6IHJvdy5zb3VyY2VfcGxhdGZvcm0gPyByb3cuc291cmNlX3BsYXRmb3JtIDogdW5kZWZpbmVkLFxuICAgIHNvdXJjZVVybDogcm93LnNvdXJjZV91cmwgPz8gdW5kZWZpbmVkLFxuICAgIGxhc3RWZXJpZmllZEF0OiB0b0lzbyhyb3cubGFzdF92ZXJpZmllZF9hdCksXG4gICAgZGVzY3JpcHRpb246IHBpY2tMb2NhbGUocm93LmRlc2NyaXB0aW9uX2pzb24sIGxvY2FsZSkgfHwgdW5kZWZpbmVkLFxuICAgIGNyZWF0ZWRBdDogbmV3IERhdGUocm93LmNyZWF0ZWRfYXQpLnRvSVNPU3RyaW5nKCksXG4gICAgdXBkYXRlZEF0OiBuZXcgRGF0ZShyb3cudXBkYXRlZF9hdCkudG9JU09TdHJpbmcoKSxcbiAgICBwdWJsaXNoZWRBdDogdG9Jc28ocm93LnB1Ymxpc2hlZF9hdCksXG4gICAgbG9jYWxlLFxuICB9XG4gIGlmIChyb3cua2luZCA9PT0gJ29mZmxpbmUnKSB7XG4gICAgY29uc3QgbG9jYXRpb24gPSBbcm93LnZlbnVlLCByb3cuYWRkcmVzcywgcm93LmNpdHldLmZpbHRlcihCb29sZWFuKS5qb2luKCcgJylcbiAgICByZXR1cm4geyAuLi5iYXNlLCBraW5kOiAnb2ZmbGluZScsIGxvY2F0aW9uLCB2ZW51ZTogcm93LnZlbnVlID8/IHVuZGVmaW5lZCwgYWRkcmVzczogcm93LmFkZHJlc3MgPz8gdW5kZWZpbmVkLCBjaXR5OiByb3cuY2l0eSA/PyB1bmRlZmluZWQsIG1hcFVybDogcm93Lm1hcF91cmwgPz8gdW5kZWZpbmVkIH1cbiAgfVxuICByZXR1cm4geyAuLi5iYXNlLCBraW5kOiAnb25saW5lJywgcGxhdGZvcm06IHJvdy5zb3VyY2VfcGxhdGZvcm0gPz8gdW5kZWZpbmVkIH1cbn1cblxuY29uc3QgRVZFTlRfU09SVF9DT0xVTU5TOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICBzdGFydF90aW1lOiAnZS5zdGFydF90aW1lJyxcbiAgZW5kX3RpbWU6ICdlLmVuZF90aW1lJyxcbiAgcHVibGlzaGVkX2F0OiAnZS5wdWJsaXNoZWRfYXQnLFxuICBjcmVhdGVkX2F0OiAnZS5jcmVhdGVkX2F0Jyxcbn1cblxuLyoqIOino+aekOWQjueahOaOkuW6j+mUriDihpIgU1FMIE9SREVSIEJZIOeJh+aute+8m+acquefpeWtl+auteWbnumAgCBzdGFydF90aW1lIERFU0MgKi9cbmZ1bmN0aW9uIG9yZGVyQnlPZihzb3J0czogQXJyYXk8eyBmaWVsZDogc3RyaW5nOyBkaXI6ICdhc2MnIHwgJ2Rlc2MnIH0+KTogc3RyaW5nIHtcbiAgaWYgKHNvcnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuICdlLnN0YXJ0X3RpbWUgREVTQydcbiAgY29uc3QgcGFydHMgPSBzb3J0c1xuICAgIC5tYXAoKHMpID0+IHtcbiAgICAgIGNvbnN0IGNvbCA9IEVWRU5UX1NPUlRfQ09MVU1OU1tzLmZpZWxkXSA/PyAocy5maWVsZC5zdGFydHNXaXRoKCdlLicpIHx8IHMuZmllbGQuaW5jbHVkZXMoJy4nKSA/IHMuZmllbGQgOiBudWxsKVxuICAgICAgaWYgKCFjb2wpIHJldHVybiBudWxsXG4gICAgICByZXR1cm4gYCR7Y29sfSAke3MuZGlyLnRvVXBwZXJDYXNlKCl9YFxuICAgIH0pXG4gICAgLmZpbHRlcigocCk6IHAgaXMgc3RyaW5nID0+IHAgIT09IG51bGwpXG4gIHJldHVybiBwYXJ0cy5sZW5ndGggPiAwID8gcGFydHMuam9pbignLCAnKSA6ICdlLnN0YXJ0X3RpbWUgREVTQydcbn1cblxuLyoqXG4gKiDmiorop6PmnpDlh7rnmoTov4fmu6TmnaHku7bmmKDlsITliLAgU1FM77yIa2luZCDlt7LnlLHot6/nlLHlm7rlrprvvInjgIJcbiAqIOaUr+aMge+8mm5hdHVyZSBlceOAgWNvdW50cnkvcmVnaW9uL2NpdHkgY29udGFpbnNp77yI57q/5LiK5pegIGNpdHkg4oaSIOaYvuW8j+epuumbhu+8ieOAgVxuICogZW5kVGltZSBndGXvvIhyZWxldmFudCDmqKHlvI/vvInjgIEkb3Ig57uE77yIdGl0bGUvb3JnYW5pemVyL2Rlc2NyaXB0aW9uL+KApu+8ieOAgWV4Y2x1ZGVJZCBuZeOAglxuICovXG5mdW5jdGlvbiBidWlsZEV2ZW50V2hlcmUocTogUGFyc2VkQ29udGVudFF1ZXJ5LCBraW5kOiAnb25saW5lJyB8ICdvZmZsaW5lJywgbm93TXM6IG51bWJlcik6IFNxbENvbmQge1xuICBjb25zdCBjb25kczogU3FsQ29uZFtdID0gW1xuICAgIHsgc3FsOiAnZS5raW5kID0gPycsIHBhcmFtczogW2tpbmRdIH0sXG4gICAgeyBzcWw6ICdlLnB1Ymxpc2hlZF9hdCBJUyBOT1QgTlVMTCcsIHBhcmFtczogW10gfSxcbiAgXVxuXG4gIGZvciAoY29uc3QgbGVhZiBvZiBxLmxlYXZlcykge1xuICAgIGNvbnN0IFtoZWFkLCByZWxdID0gbGVhZi5wYXRoXG4gICAgaWYgKGhlYWQgPT09ICdpZCcgJiYgbGVhZi5vcCA9PT0gJ25lJykge1xuICAgICAgY29uZHMucHVzaChjb25kKCdlLmlkJywgJ25lJywgcGFyc2VJbnQobGVhZi52YWx1ZSwgMTApKSlcbiAgICAgIGNvbnRpbnVlXG4gICAgfVxuICAgIGlmIChoZWFkID09PSAnZW5kX3RpbWUnICYmIChsZWFmLm9wID09PSAnZ3RlJyB8fCBsZWFmLm9wID09PSAnZ3QnKSkge1xuICAgICAgY29uZHMucHVzaChjb25kKCdlLmVuZF90aW1lJywgJ2d0ZScsIERhdGUucGFyc2UobGVhZi52YWx1ZSkpKVxuICAgICAgY29udGludWVcbiAgICB9XG4gICAgaWYgKGhlYWQgPT09ICdzdGFydF90aW1lJyAmJiAobGVhZi5vcCA9PT0gJ2d0JyB8fCBsZWFmLm9wID09PSAnbHRlJykpIHtcbiAgICAgIGNvbmRzLnB1c2goY29uZCgnZS5zdGFydF90aW1lJywgbGVhZi5vcCwgRGF0ZS5wYXJzZShsZWFmLnZhbHVlKSkpXG4gICAgICBjb250aW51ZVxuICAgIH1cbiAgICBpZiAoaGVhZCA9PT0gJ25hdHVyZScgJiYgbGVhZi5vcCA9PT0gJ2VxJykge1xuICAgICAgY29uZHMucHVzaChjb25kKCdlLm5hdHVyZScsICdlcScsIGxlYWYudmFsdWUpKVxuICAgICAgY29udGludWVcbiAgICB9XG4gICAgLy8g5Zyw54K557G75a2X5q6177yaY291bnRyeS9yZWdpb24vY2l0ee+8iGNpdHkg5LuFIG9mZmxpbmUg5pyJ5oSP5LmJ77yJXG4gICAgaWYgKChoZWFkID09PSAnY291bnRyeScgfHwgaGVhZCA9PT0gJ3JlZ2lvbicgfHwgaGVhZCA9PT0gJ2NpdHknKSAmJiBsZWFmLm9wID09PSAnY29udGFpbnNpJykge1xuICAgICAgaWYgKGhlYWQgPT09ICdjaXR5JyAmJiBraW5kID09PSAnb25saW5lJykgY29udGludWUgLy8g57q/5LiK5peg5Z+O5biC57u05bqm77ya6Z2Z6buY5b+955Wl6K+l5a2Q5Y+lXG4gICAgICBjb25kcy5wdXNoKGNvbmQoYGwuJHtjYW1lbFRvU25ha2UoaGVhZCl9YCwgJ2NvbnRhaW5zaScsIGxlYWYudmFsdWUpKVxuICAgICAgY29udGludWVcbiAgICB9XG4gICAgdm9pZCByZWxcbiAgfVxuXG4gIC8vICRvciDnu4TvvJrmkJzntKLlrZfmrrXpm4blkIjmjIkga2luZCDljLrliIZcbiAgZm9yIChjb25zdCBncm91cCBvZiBxLm9yR3JvdXBzKSB7XG4gICAgY29uc3Qgb3JzOiBTcWxDb25kW10gPSBbXVxuICAgIGZvciAoY29uc3QgbGVhZiBvZiBncm91cCkge1xuICAgICAgY29uc3QgZmllbGQgPSBsZWFmLnBhdGhbbGVhZi5wYXRoLmxlbmd0aCAtIDFdXG4gICAgICBpZiAoZmllbGQgPT09ICd0aXRsZScpIG9ycy5wdXNoKGNvbmQoJ0xPV0VSKGUudGl0bGVfanNvbiknLCAnY29udGFpbnNpJywgbGVhZi52YWx1ZSkpXG4gICAgICBlbHNlIGlmIChmaWVsZCA9PT0gJ29yZ2FuaXplcicpIG9ycy5wdXNoKGNvbmQoJ2Uub3JnYW5pemVyJywgJ2NvbnRhaW5zaScsIGxlYWYudmFsdWUpKVxuICAgICAgZWxzZSBpZiAoZmllbGQgPT09ICdkZXNjcmlwdGlvbicpIG9ycy5wdXNoKGNvbmQoJ0xPV0VSKGUuZGVzY3JpcHRpb25fanNvbiknLCAnY29udGFpbnNpJywgbGVhZi52YWx1ZSkpXG4gICAgICBlbHNlIGlmIChmaWVsZCA9PT0gJ3BsYXRmb3JtJyAmJiBraW5kID09PSAnb25saW5lJykgb3JzLnB1c2goY29uZCgnZS5zb3VyY2VfcGxhdGZvcm0nLCAnY29udGFpbnNpJywgbGVhZi52YWx1ZSkpXG4gICAgICBlbHNlIGlmIChmaWVsZCA9PT0gJ2xvY2F0aW9uJyAmJiBraW5kID09PSAnb2ZmbGluZScpXG4gICAgICAgIG9ycy5wdXNoKFxuICAgICAgICAgIG9yQW55KFtcbiAgICAgICAgICAgIGNvbmQoJ2wudmVudWUnLCAnY29udGFpbnNpJywgbGVhZi52YWx1ZSksXG4gICAgICAgICAgICBjb25kKCdsLmFkZHJlc3MnLCAnY29udGFpbnNpJywgbGVhZi52YWx1ZSksXG4gICAgICAgICAgICBjb25kKCdsLmxvY2F0aW9uX25vdGUnLCAnY29udGFpbnNpJywgbGVhZi52YWx1ZSksXG4gICAgICAgICAgXSlcbiAgICAgICAgKVxuICAgICAgZWxzZSBpZiAoZmllbGQgPT09ICdndWVzdHMnICYmIGtpbmQgPT09ICdvZmZsaW5lJykgb3JzLnB1c2goY29uZCgnZS5ndWVzdHNfanNvbicsICdjb250YWluc2knLCBsZWFmLnZhbHVlKSlcbiAgICAgIGVsc2UgaWYgKGZpZWxkID09PSAndGFncycpIG9ycy5wdXNoKGNvbmQoJ2UudGFnc19qc29uJywgJ2NvbnRhaW5zaScsIGxlYWYudmFsdWUpKVxuICAgICAgZWxzZSBpZiAoZmllbGQgPT09ICd0aWNrZXRfcHJpY2VfdGV4dCcpIG9ycy5wdXNoKGNvbmQoJ2UudGlja2V0X3ByaWNlX3RleHRfanNvbicsICdjb250YWluc2knLCBsZWFmLnZhbHVlKSlcbiAgICAgIGVsc2UgaWYgKGZpZWxkID09PSAnc291cmNlX25hbWUnKSBvcnMucHVzaChjb25kKCdlLnNvdXJjZV9wbGF0Zm9ybScsICdjb250YWluc2knLCBsZWFmLnZhbHVlKSlcbiAgICAgIGVsc2UgaWYgKGZpZWxkID09PSAnY291bnRyeScgfHwgZmllbGQgPT09ICdyZWdpb24nIHx8IGZpZWxkID09PSAnY2l0eScpIHtcbiAgICAgICAgaWYgKGZpZWxkID09PSAnY2l0eScgJiYga2luZCA9PT0gJ29ubGluZScpIGNvbnRpbnVlXG4gICAgICAgIG9ycy5wdXNoKGNvbmQoYGwuJHtjYW1lbFRvU25ha2UoZmllbGQpfWAsICdjb250YWluc2knLCBsZWFmLnZhbHVlKSlcbiAgICAgIH1cbiAgICB9XG4gICAgY29uZHMucHVzaChvckFueShvcnMpKVxuICB9XG4gIHJldHVybiBhbmRBbGwoY29uZHMpXG59XG5cbmV4cG9ydCBjb25zdCBldmVudHNSb3V0ZXMgPSBuZXcgSG9ubzx7IEJpbmRpbmdzOiBFbnYgfT4oKVxuXG5hc3luYyBmdW5jdGlvbiBmZXRjaFJvd3MoZGI6IEQxRGF0YWJhc2UsIHdoZXJlU3FsOiBTcWxDb25kLCBvcmRlclNxbDogc3RyaW5nLCBsaW1PZmY6IFNxbENvbmQpOiBQcm9taXNlPChFdmVudFJvdyAmIExvY2F0aW9uUm93KVtdPiB7XG4gIGNvbnN0IHN0bXQgPSBkYi5wcmVwYXJlKGAke0VWRU5UU19TRUxFQ1R9IFdIRVJFICR7d2hlcmVTcWwuc3FsfSBPUkRFUiBCWSAke29yZGVyU3FsfSAke2xpbU9mZi5zcWx9YClcbiAgY29uc3Qgb3V0ID0gYXdhaXQgc3RtdC5iaW5kKFsuLi53aGVyZVNxbC5wYXJhbXMsIC4uLmxpbU9mZi5wYXJhbXNdKS5hbGw8RXZlbnRSb3cgJiBMb2NhdGlvblJvdz4oKVxuICByZXR1cm4gb3V0LnJlc3VsdHMgPz8gW11cbn1cblxuYXN5bmMgZnVuY3Rpb24gY291bnRSb3dzKGRiOiBEMURhdGFiYXNlLCB3aGVyZVNxbDogU3FsQ29uZCk6IFByb21pc2U8bnVtYmVyPiB7XG4gIGNvbnN0IHN0bXQgPSBkYi5wcmVwYXJlKGBTRUxFQ1QgQ09VTlQoKikgQVMgbiBGUk9NIGV2ZW50cyBlIExFRlQgSk9JTiBldmVudF9sb2NhdGlvbnMgbCBPTiBsLmV2ZW50X2lkID0gZS5pZCBXSEVSRSAke3doZXJlU3FsLnNxbH1gKVxuICBjb25zdCByb3cgPSBhd2FpdCBzdG10LmJpbmQoLi4ud2hlcmVTcWwucGFyYW1zKS5maXJzdDx7IG46IG51bWJlciB9PigpXG4gIHJldHVybiByb3c/Lm4gPz8gMFxufVxuXG5cbmZvciAoY29uc3Qga2luZCBvZiBbJ29ubGluZScsICdvZmZsaW5lJ10gYXMgY29uc3QpIHtcbiAgY29uc3QgcGF0aCA9IGtpbmQgPT09ICdvbmxpbmUnID8gJy9vbmxpbmUtZXZlbnRzJyA6ICcvb2ZmbGluZS1ldmVudHMnXG5cbiAgZXZlbnRzUm91dGVzLmdldChwYXRoLCBhc3luYyAoYykgPT4ge1xuICAgIGNvbnN0IHEgPSBwYXJzZUNvbnRlbnRRdWVyeShuZXcgVVJMKGMucmVxLnVybCkpXG4gICAgY29uc3Qgc29ydE1vZGUgPSBxLnNvcnRzWzBdPy5maWVsZFxuICAgIGNvbnN0IG5vd01zID0gRGF0ZS5ub3coKVxuXG4gICAgbGV0IHJvd3M6IChFdmVudFJvdyAmIExvY2F0aW9uUm93KVtdXG4gICAgbGV0IHRvdGFsOiBudW1iZXJcblxuICAgIGlmICghcS5saW1pdCAmJiAhcS5zdGFydCAmJiAoc29ydE1vZGUgPT09IHVuZGVmaW5lZCkpIHtcbiAgICAgIC8vIHJlbGV2YW50IOm7mOiupOaooeW8j++8mui/m+ihjOS4rS/mnKrmnaXlnKjliY3vvIhzdGFydFRpbWUgYXNj77yJ77yM5bey57uT5p2f6KGl6b2Q77yIZW5kVGltZSBkZXNj77yJXG4gICAgICBjb25zdCBhY3RpdmVXaGVyZSA9IGFuZEFsbChbYnVpbGRCYXNlV2hlcmUoa2luZCksIGNvbmQoJ2UuZW5kX3RpbWUnLCAnZ3RlJywgbm93TXMpXSlcbiAgICAgIGNvbnN0IGVuZGVkV2hlcmUgPSBhbmRBbGwoW2J1aWxkQmFzZVdoZXJlKGtpbmQpLCBjb25kKCdlLmVuZF90aW1lJywgJ2x0Jywgbm93TXMpXSlcbiAgICAgIGNvbnN0IHBhZ2VTaXplID0gcS5wYWdlU2l6ZVxuICAgICAgY29uc3QgW2FjdGl2ZSwgZW5kZWQsIGFjdGl2ZUNvdW50LCBlbmRlZENvdW50XSA9IGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgICAgZmV0Y2hSb3dzKGMuZW52LkRCLCBhY3RpdmVXaGVyZSwgJ2Uuc3RhcnRfdGltZSBBU0MnLCBsaW1pdE9mZnNldChwYWdlU2l6ZSwgMCkpLFxuICAgICAgICBmZXRjaFJvd3MoYy5lbnYuREIsIGVuZGVkV2hlcmUsICdlLmVuZF90aW1lIERFU0MnLCBsaW1pdE9mZnNldChNYXRoLm1heCgwLCBwYWdlU2l6ZSksIDApKSxcbiAgICAgICAgY291bnRSb3dzKGMuZW52LkRCLCBhY3RpdmVXaGVyZSksXG4gICAgICAgIGNvdW50Um93cyhjLmVudi5EQiwgZW5kZWRXaGVyZSksXG4gICAgICBdKVxuICAgICAgcm93cyA9IFsuLi5hY3RpdmUsIC4uLmVuZGVkXS5zbGljZSgwLCBwYWdlU2l6ZSlcbiAgICAgIHRvdGFsID0gYWN0aXZlQ291bnQgKyBlbmRlZENvdW50XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHdoZXJlID0gYnVpbGRFdmVudFdoZXJlKHEsIGtpbmQsIG5vd01zKVxuICAgICAgY29uc3Qgb2Zmc2V0ID0gcS5zdGFydCA/PyAocS5wYWdlIC0gMSkgKiBxLnBhZ2VTaXplXG4gICAgICBjb25zdCBzaXplID0gcS5saW1pdCA/PyBxLnBhZ2VTaXplXG4gICAgICA7W3Jvd3MsIHRvdGFsXSA9IGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgICAgZmV0Y2hSb3dzKGMuZW52LkRCLCB3aGVyZSwgb3JkZXJCeU9mKHEuc29ydHMubGVuZ3RoID4gMCA/IHEuc29ydHMgOiBbeyBmaWVsZDogJ3N0YXJ0X3RpbWUnLCBkaXI6ICdkZXNjJyB9XSksIGxpbWl0T2Zmc2V0KHNpemUsIG9mZnNldCkpLFxuICAgICAgICBjb3VudFJvd3MoYy5lbnYuREIsIHdoZXJlKSxcbiAgICAgIF0pXG4gICAgfVxuXG4gICAgY29uc3QgZGF0YSA9IHJvd3MubWFwKChyKSA9PiBldmVudFRvSnNvbihyLCBxLmxvY2FsZSkpXG4gICAgaWYgKHEubGltaXQgIT09IG51bGwgfHwgcS5zdGFydCAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG9rUGFnaW5hdGVkKGRhdGEsIHBhZ2luYXRpb25PZihxLnBhZ2UsIHEucGFnZVNpemUsIHRvdGFsKSlcbiAgICB9XG4gICAgcmV0dXJuIG9rUGFnaW5hdGVkKGRhdGEsIHBhZ2luYXRpb25PZihxLnBhZ2UsIHEucGFnZVNpemUsIHRvdGFsKSlcbiAgfSlcblxuICBldmVudHNSb3V0ZXMuZ2V0KGAke3BhdGh9LzprZXlgLCBhc3luYyAoYykgPT4ge1xuICAgIGNvbnN0IGtleSA9IGMucmVxLnBhcmFtKCdrZXknKS50cmltKClcbiAgICBjb25zdCBxID0gcGFyc2VDb250ZW50UXVlcnkobmV3IFVSTChjLnJlcS51cmwpKVxuICAgIGNvbnN0IG51bWVyaWMgPSAvXlxcZCskLy50ZXN0KGtleSlcbiAgICBjb25zdCB3aGVyZSA9IGFuZEFsbChbXG4gICAgICB7IHNxbDogJ2Uua2luZCA9ID8nLCBwYXJhbXM6IFtraW5kXSB9LFxuICAgICAgeyBzcWw6ICdlLnB1Ymxpc2hlZF9hdCBJUyBOT1QgTlVMTCcsIHBhcmFtczogW10gfSxcbiAgICAgIG51bWVyaWMgPyBjb25kKCdlLmlkJywgJ2VxJywgcGFyc2VJbnQoa2V5LCAxMCkpIDogY29uZCgnZS5kb2N1bWVudF9pZCcsICdlcScsIGtleSksXG4gICAgXSlcbiAgICBjb25zdCByb3dzID0gYXdhaXQgZmV0Y2hSb3dzKGMuZW52LkRCLCB3aGVyZSwgJ2Uuc3RhcnRfdGltZSBERVNDJywgbGltaXRPZmZzZXQoMSwgMCkpXG4gICAgaWYgKHJvd3MubGVuZ3RoID09PSAwKSByZXR1cm4gZmFpbCg0MDQsICdub3RfZm91bmQnKVxuICAgIHJldHVybiBvayhldmVudFRvSnNvbihyb3dzWzBdLCBxLmxvY2FsZSkpXG4gIH0pXG59XG5cbi8qKiDln7rnoYAgV0hFUkXvvJpraW5kICsgcHVibGlzaGVk77yM5LiN5ZCr5pe26Ze056qXICovXG5mdW5jdGlvbiBidWlsZEJhc2VXaGVyZShraW5kOiAnb25saW5lJyB8ICdvZmZsaW5lJyk6IFNxbENvbmQge1xuICByZXR1cm4gYW5kQWxsKFtcbiAgICB7IHNxbDogJ2Uua2luZCA9ID8nLCBwYXJhbXM6IFtraW5kXSB9LFxuICAgIHsgc3FsOiAnZS5wdWJsaXNoZWRfYXQgSVMgTk9UIE5VTEwnLCBwYXJhbXM6IFtdIH0sXG4gIF0pXG59XG5cbi8vIOKUgOKUgCAvZXZlbnRzLWJ1bmRsZe+8muS4gOasoeWFqOmHj+aJq+aPj+WQjOaXtuS6p+WHuuWQiOW5tuWIl+ihqOS4juWOu+mHjeWcsOWMuuetm+mAiemhuSDilIDilIBcblxuaW50ZXJmYWNlIExvY2F0aW9uUmVjb3JkIHtcbiAga2luZDogJ29ubGluZScgfCAnb2ZmbGluZSdcbiAgY291bnRyeTogc3RyaW5nXG4gIHJlZ2lvbjogc3RyaW5nXG4gIGNpdHk6IHN0cmluZ1xufVxuXG5ldmVudHNSb3V0ZXMuZ2V0KCcvZXZlbnRzLWJ1bmRsZScsIGFzeW5jIChjKSA9PiB7XG4gIGNvbnN0IHVybCA9IG5ldyBVUkwoYy5yZXEudXJsKVxuICBjb25zdCBxID0gcGFyc2VDb250ZW50UXVlcnkodXJsKVxuICBjb25zdCBwYWdlID0gTnVtYmVyKHVybC5zZWFyY2hQYXJhbXMuZ2V0KCdwYWdlJykgfHwgJzEnKSB8fCAxXG4gIGNvbnN0IHBhZ2VTaXplUmF3ID0gTnVtYmVyKHVybC5zZWFyY2hQYXJhbXMuZ2V0KCdwYWdlU2l6ZScpIHx8IHVybC5zZWFyY2hQYXJhbXMuZ2V0KCdsaW1pdCcpIHx8ICcyNCcpXG4gIGNvbnN0IHBhZ2VTaXplID0gTWF0aC5taW4oMTAwLCBNYXRoLm1heCgxLCBwYWdlU2l6ZVJhdykpXG5cbiAgY29uc3Qgb25saW5lID0gYXdhaXQgZmV0Y2hSb3dzKGMuZW52LkRCLCBidWlsZEJhc2VXaGVyZSgnb25saW5lJyksICdlLnN0YXJ0X3RpbWUgREVTQycsIGxpbWl0T2Zmc2V0KDUwMCwgMCkpXG4gIGNvbnN0IG9mZmxpbmUgPSBhd2FpdCBmZXRjaFJvd3MoYy5lbnYuREIsIGJ1aWxkQmFzZVdoZXJlKCdvZmZsaW5lJyksICdlLnN0YXJ0X3RpbWUgREVTQycsIGxpbWl0T2Zmc2V0KDUwMCwgMCkpXG5cbiAgY29uc3Qgc2VlbiA9IG5ldyBTZXQ8c3RyaW5nPigpXG4gIGNvbnN0IGxvY2F0aW9uUmVjb3JkczogTG9jYXRpb25SZWNvcmRbXSA9IFtdXG4gIGNvbnN0IGNvbGxlY3QgPSAocm93czogKEV2ZW50Um93ICYgTG9jYXRpb25Sb3cpW10sIGtpbmQ6ICdvbmxpbmUnIHwgJ29mZmxpbmUnKSA9PiB7XG4gICAgZm9yIChjb25zdCByIG9mIHJvd3MpIHtcbiAgICAgIGNvbnN0IGNvdW50cnkgPSAoci5jb3VudHJ5ID8/ICcnKS50cmltKClcbiAgICAgIGNvbnN0IHJlZ2lvbiA9IChyLnJlZ2lvbiA/PyAnJykudHJpbSgpXG4gICAgICBjb25zdCBjaXR5ID0ga2luZCA9PT0gJ29mZmxpbmUnID8gKHIuY2l0eSA/PyAnJykudHJpbSgpIDogJydcbiAgICAgIGlmICghY291bnRyeSAmJiAhcmVnaW9uICYmICFjaXR5KSBjb250aW51ZVxuICAgICAgY29uc3Qga2V5ID0gYCR7a2luZH18JHtjb3VudHJ5fXwke3JlZ2lvbn18JHtjaXR5fWBcbiAgICAgIGlmIChzZWVuLmhhcyhrZXkpKSBjb250aW51ZVxuICAgICAgc2Vlbi5hZGQoa2V5KVxuICAgICAgbG9jYXRpb25SZWNvcmRzLnB1c2goeyBraW5kLCBjb3VudHJ5LCByZWdpb24sIGNpdHkgfSlcbiAgICB9XG4gIH1cbiAgY29sbGVjdChvbmxpbmUsICdvbmxpbmUnKVxuICBjb2xsZWN0KG9mZmxpbmUsICdvZmZsaW5lJylcblxuICBjb25zdCBtZXJnZWQ6IEFycmF5PFJvdyAmIHsgdHlwZTogc3RyaW5nIH0+ID0gW1xuICAgIC4uLm9ubGluZS5tYXAoKHIpID0+ICh7IGV2ZW50OiBldmVudFRvSnNvbihyLCBxLmxvY2FsZSksIHR5cGU6ICdvbmxpbmUnIH0pKSxcbiAgICAuLi5vZmZsaW5lLm1hcCgocikgPT4gKHsgZXZlbnQ6IGV2ZW50VG9Kc29uKHIsIHEubG9jYWxlKSwgdHlwZTogJ29mZmxpbmUnIH0pKSxcbiAgXVxuICBtZXJnZWQuc29ydCgoYSwgYikgPT4ge1xuICAgIGNvbnN0IGVhID0gYS5ldmVudCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPlxuICAgIGNvbnN0IGViID0gYi5ldmVudCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPlxuICAgIHJldHVybiBTdHJpbmcoZWIuc3RhcnRUaW1lID8/ICcnKS5sb2NhbGVDb21wYXJlKFN0cmluZyhlYS5zdGFydFRpbWUgPz8gJycpKVxuICB9KVxuXG4gIGNvbnN0IHN0YXJ0ID0gKE1hdGgubWF4KDEsIHBhZ2UpIC0gMSkgKiBwYWdlU2l6ZVxuICBjb25zdCBwYWdlZCA9IG1lcmdlZC5zbGljZShzdGFydCwgc3RhcnQgKyBwYWdlU2l6ZSlcbiAgY29uc3QgcGFnaW5hdGlvbjogU3RyYXBpUGFnaW5hdGlvbiA9IHBhZ2luYXRpb25PZihwYWdlLCBwYWdlU2l6ZSwgbWVyZ2VkLmxlbmd0aClcbiAgcmV0dXJuIFJlc3BvbnNlLmpzb24oeyBkYXRhOiBwYWdlZCwgbWV0YTogeyBwYWdpbmF0aW9uIH0sIGxvY2F0aW9uUmVjb3JkcyB9KVxufSlcbiJdLCJmaWxlIjoiL1VzZXJzL2thcmEvQ29kZS9TY2hhbGUtTGlicmFyeS9zZXJ2ZXIvc3JjL2NvbnRlbnQvZXZlbnRzLnRzIn0=
