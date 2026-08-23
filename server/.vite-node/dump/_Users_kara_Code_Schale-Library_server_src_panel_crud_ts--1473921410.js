// /Users/kara/Code/Schale-Library/server/src/panel/crud.ts
const __vite_ssr_import_0__ = await __vite_ssr_import__("/src/lib/respond.ts", {"importedNames":["fail","ok","okPaginated","paginationOf"]});
const __vite_ssr_import_1__ = await __vite_ssr_import__("/src/lib/i18n.ts", {"importedNames":["pickLocale"]});
const __vite_ssr_import_2__ = await __vite_ssr_import__("/src/panel/collections.ts", {"importedNames":["COLLECTIONS","isPanelCollection"]});
const __vite_ssr_import_3__ = await __vite_ssr_import__("/src/panel/input-schema.ts", {"importedNames":["FieldValidationError","mapLocale","pickAllowedFields"]});
const __vite_ssr_import_4__ = await __vite_ssr_import__("/src/panel/audit.ts", {"importedNames":["recordAuditLog"]});





const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 12;
function serializeRow(collectionKey, row, locale) {
  const def = __vite_ssr_import_2__.COLLECTIONS[collectionKey];
  const out = {
    id: row.document_id ?? String(row.id),
    documentId: row.document_id ?? String(row.id),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
    status: row.published_at ? "published" : "draft"
  };
  for (const [fieldName, field] of Object.entries(def.fields)) {
    if (field.kind === "published-at") continue;
    const raw = row[field.column];
    if (field.localized) {
      out[fieldName] = typeof raw === "string" ? __vite_ssr_import_1__.pickLocale(raw, locale) : "";
    } else {
      out[fieldName] = raw ?? null;
    }
  }
  return out;
}
function generateDocumentId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}
async function findByDocumentId(db, table, documentId) {
  return db.prepare(`SELECT * FROM ${table} WHERE document_id = ?1`).bind(documentId).first();
}
function registerCrudRoutes(panel) {
  panel.get("/panel/:collection", async (c) => {
    const key = c.req.param("collection");
    if (!__vite_ssr_import_2__.isPanelCollection(key)) return __vite_ssr_import_0__.fail(404, "unknown_collection");
    const def = __vite_ssr_import_2__.COLLECTIONS[key];
    const locale = __vite_ssr_import_3__.mapLocale(c.req.query("locale"));
    const page = Math.max(1, Number(c.req.query("page") || "1") || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(c.req.query("pageSize") || String(DEFAULT_PAGE_SIZE)) || DEFAULT_PAGE_SIZE));
    const where = [];
    const binds = [];
    const status = c.req.query("status");
    if (status === "published") where.push("published_at IS NOT NULL");
    else if (status === "draft") where.push("published_at IS NULL");
    const search = c.req.query("search")?.trim();
    if (search) {
      const clauses = def.searchColumns.map((col) => `LOWER(${col}) LIKE ?${binds.length + 1}`);
      binds.push(`%${search.toLowerCase()}%`);
      if (clauses.length > 0) where.push(`(${clauses.join(" OR ")})`);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const orderSql = def.defaultSort.map(([col, dir]) => `${col} ${dir.toUpperCase()}`).join(", ");
    const totalRow = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM ${def.table} ${whereSql}`).bind(...binds).first();
    const total = totalRow?.n ?? 0;
    const offset = (page - 1) * pageSize;
    const { results } = await c.env.DB.prepare(
      `SELECT * FROM ${def.table} ${whereSql} ORDER BY ${orderSql} LIMIT ${pageSize} OFFSET ${offset}`
    ).bind(...binds).all();
    return __vite_ssr_import_0__.okPaginated(results.map((row) => serializeRow(key, row, locale)), __vite_ssr_import_0__.paginationOf(page, pageSize, total));
  });
  panel.get("/panel/:collection/:documentId", async (c) => {
    const key = c.req.param("collection");
    if (!__vite_ssr_import_2__.isPanelCollection(key)) return __vite_ssr_import_0__.fail(404, "unknown_collection");
    const def = __vite_ssr_import_2__.COLLECTIONS[key];
    const row = await findByDocumentId(c.env.DB, def.table, c.req.param("documentId"));
    if (!row) return __vite_ssr_import_0__.fail(404, "not_found");
    return __vite_ssr_import_0__.ok(serializeRow(key, row, __vite_ssr_import_3__.mapLocale(c.req.query("locale"))));
  });
  panel.post("/panel/:collection", async (c) => {
    const key = c.req.param("collection");
    if (!__vite_ssr_import_2__.isPanelCollection(key)) return __vite_ssr_import_0__.fail(404, "unknown_collection");
    const def = __vite_ssr_import_2__.COLLECTIONS[key];
    if (def.readOnly) return __vite_ssr_import_0__.fail(400, "read_only_collection");
    let body;
    try {
      body = await c.req.json();
    } catch {
      return __vite_ssr_import_0__.fail(400, "invalid_request");
    }
    const payload = "data" in body && body.data && typeof body.data === "object" ? body.data : body;
    const localeQuery = "locale" in body && typeof body.locale === "string" ? body.locale : void 0;
    try {
      const now = Date.now();
      const { values } = __vite_ssr_import_3__.pickAllowedFields(key, payload, localeQuery);
      const columns = ["document_id", "created_at", "updated_at"];
      const placeholders = ["?1", "?2", "?3"];
      const binds = [generateDocumentId(), now, now];
      for (const [column, value] of Object.entries(values)) {
        columns.push(column);
        placeholders.push(`?${binds.length + 1}`);
        binds.push(value);
      }
      const result = await c.env.DB.prepare(
        `INSERT INTO ${def.table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`
      ).bind(...binds).run();
      if (!result.meta.changes) return __vite_ssr_import_0__.fail(500, "insert_failed");
      const row = await findByDocumentId(c.env.DB, def.table, binds[0]);
      await __vite_ssr_import_4__.recordAuditLog(c, {
        action: "create",
        targetCollection: key,
        targetDocumentId: binds[0],
        payloadSummary: summarizePayload(payload)
      });
      return __vite_ssr_import_0__.ok(row ? serializeRow(key, row, __vite_ssr_import_3__.mapLocale(localeQuery)) : {});
    } catch (error) {
      if (error instanceof __vite_ssr_import_3__.FieldValidationError) {
        return __vite_ssr_import_0__.fail(400, error.field ? `unknown_field:${error.field}` : error.message);
      }
      const message = error.message || "";
      if (/UNIQUE/.test(message)) return __vite_ssr_import_0__.fail(400, "duplicate_slug");
      if (/NOT NULL/.test(message)) return __vite_ssr_import_0__.fail(400, "missing_required_field");
      return __vite_ssr_import_0__.fail(400, "create_failed");
    }
  });
  panel.put("/panel/:collection/:documentId", async (c) => {
    const key = c.req.param("collection");
    if (!__vite_ssr_import_2__.isPanelCollection(key)) return __vite_ssr_import_0__.fail(404, "unknown_collection");
    const def = __vite_ssr_import_2__.COLLECTIONS[key];
    if (def.readOnly) return __vite_ssr_import_0__.fail(400, "read_only_collection");
    let body;
    try {
      body = await c.req.json();
    } catch {
      return __vite_ssr_import_0__.fail(400, "invalid_request");
    }
    const payload = "data" in body && body.data && typeof body.data === "object" ? body.data : body;
    const localeQuery = "locale" in body && typeof body.locale === "string" ? body.locale : void 0;
    const documentId = c.req.param("documentId");
    const existing = await findByDocumentId(c.env.DB, def.table, documentId);
    if (!existing) return __vite_ssr_import_0__.fail(404, "not_found");
    try {
      const { values } = __vite_ssr_import_3__.pickAllowedFields(key, payload, localeQuery);
      const sets = ["updated_at = ?1"];
      const binds = [Date.now()];
      for (const [column, value] of Object.entries(values)) {
        sets.push(`${column} = ?${binds.length + 1}`);
        binds.push(value);
      }
      binds.push(documentId);
      await c.env.DB.prepare(`UPDATE ${def.table} SET ${sets.join(", ")} WHERE document_id = ?${binds.length}`).bind(...binds).run();
      const row = await findByDocumentId(c.env.DB, def.table, documentId);
      await __vite_ssr_import_4__.recordAuditLog(c, {
        action: "update",
        targetCollection: key,
        targetDocumentId: documentId,
        payloadSummary: summarizePayload(payload)
      });
      return __vite_ssr_import_0__.ok(row ? serializeRow(key, row, __vite_ssr_import_3__.mapLocale(localeQuery)) : {});
    } catch (error) {
      if (error instanceof __vite_ssr_import_3__.FieldValidationError) {
        return __vite_ssr_import_0__.fail(400, error.field ? `unknown_field:${error.field}` : error.message);
      }
      const message = error.message || "";
      if (/UNIQUE/.test(message)) return __vite_ssr_import_0__.fail(400, "duplicate_slug");
      return __vite_ssr_import_0__.fail(400, "update_failed");
    }
  });
  panel.delete("/panel/:collection/:documentId", async (c) => {
    const key = c.req.param("collection");
    if (!__vite_ssr_import_2__.isPanelCollection(key)) return __vite_ssr_import_0__.fail(404, "unknown_collection");
    const def = __vite_ssr_import_2__.COLLECTIONS[key];
    if (def.readOnly) return __vite_ssr_import_0__.fail(400, "read_only_collection");
    const documentId = c.req.param("documentId");
    const existing = await findByDocumentId(c.env.DB, def.table, documentId);
    if (!existing) return __vite_ssr_import_0__.fail(404, "not_found");
    await c.env.DB.prepare(`DELETE FROM ${def.table} WHERE document_id = ?1`).bind(documentId).run();
    await __vite_ssr_import_4__.recordAuditLog(c, { action: "delete", targetCollection: key, targetDocumentId: documentId });
    return __vite_ssr_import_0__.ok({ success: true });
  });
}
Object.defineProperty(__vite_ssr_exports__, "registerCrudRoutes", { enumerable: true, configurable: true, get(){ return registerCrudRoutes }});
function summarizePayload(payload) {
  try {
    const keys = Object.keys(payload);
    const preview = keys.length > 8 ? keys.slice(0, 8).join(",") + ",…" : keys.join(",");
    return JSON.stringify({ fields: preview });
  } catch {
    return "";
  }
}

//# sourceMappingSource=vite-node
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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LEtBQUssU0FBUyxJQUFJLEtBQUssTUFBTSxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsSUFBSSxPQUFPLEtBQUssS0FBSyxHQUFHO0FBQ25GLFdBQU8sS0FBSyxVQUFVLEVBQUUsUUFBUSxRQUFRLENBQUM7QUFBQSxFQUMzQyxRQUFRO0FBQ04sV0FBTztBQUFBLEVBQ1Q7QUFDRiIsIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiY3J1ZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIOmAmueUqOmbhuWQiCBDUlVE77yaR0VUL1BPU1QgL3BhbmVsLzpjb2xsZWN0aW9u44CBR0VUL1BVVC9ERUxFVEUgL3BhbmVsLzpjb2xsZWN0aW9uLzpkb2N1bWVudElk44CCXG4gKiDpm4blkIjnmb3lkI3ljZXvvIhjb2xsZWN0aW9ucy50c++8iSsg5a2X5q6155m95ZCN5Y2V77yIaW5wdXQtc2NoZW1hLnRz77yJ5Y+M6YeN5qCh6aqM44CCXG4gKiDlr7nlpJYgSUQg5LiA5b6LIGRvY3VtZW50SWTvvJvmlbDlrZcgaWQg5LuF5YaF6YOo5L2/55So44CCXG4gKi9cbmltcG9ydCB0eXBlIHsgSG9ub1BhbmVsIH0gZnJvbSAnLi90eXBlcydcbmltcG9ydCB7IGZhaWwsIG9rLCBva1BhZ2luYXRlZCwgcGFnaW5hdGlvbk9mIH0gZnJvbSAnLi4vbGliL3Jlc3BvbmQnXG5pbXBvcnQgeyBwaWNrTG9jYWxlIH0gZnJvbSAnLi4vbGliL2kxOG4nXG5pbXBvcnQgeyBDT0xMRUNUSU9OUywgaXNQYW5lbENvbGxlY3Rpb24gfSBmcm9tICcuL2NvbGxlY3Rpb25zJ1xuaW1wb3J0IHsgRmllbGRWYWxpZGF0aW9uRXJyb3IsIG1hcExvY2FsZSwgcGlja0FsbG93ZWRGaWVsZHMgfSBmcm9tICcuL2lucHV0LXNjaGVtYSdcbmltcG9ydCB7IHJlY29yZEF1ZGl0TG9nIH0gZnJvbSAnLi9hdWRpdCdcblxuY29uc3QgTUFYX1BBR0VfU0laRSA9IDEwMFxuY29uc3QgREVGQVVMVF9QQUdFX1NJWkUgPSAxMlxuXG5pbnRlcmZhY2UgUm93UmVjb3JkIHtcbiAgaWQ6IG51bWJlclxuICBkb2N1bWVudF9pZDogc3RyaW5nIHwgbnVsbFxuICBjcmVhdGVkX2F0OiBudW1iZXJcbiAgdXBkYXRlZF9hdDogbnVtYmVyXG4gIHB1Ymxpc2hlZF9hdDogbnVtYmVyIHwgbnVsbFxuICBbY29sdW1uOiBzdHJpbmddOiB1bmtub3duXG59XG5cbi8qKiDooYwg4oaSIOmdouadv+Wlkee6piBKU09O77yaY2FtZWxDYXNlIOWtl+auteWQjSArIGkxOG4g6Kej5YyFICsgZG9jdW1lbnRJZOOAgiAqL1xuZnVuY3Rpb24gc2VyaWFsaXplUm93KFxuICBjb2xsZWN0aW9uS2V5OiBzdHJpbmcsXG4gIHJvdzogUm93UmVjb3JkLFxuICBsb2NhbGU6IHN0cmluZ1xuKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4ge1xuICBjb25zdCBkZWYgPSBDT0xMRUNUSU9OU1tjb2xsZWN0aW9uS2V5XVxuICBjb25zdCBvdXQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge1xuICAgIGlkOiByb3cuZG9jdW1lbnRfaWQgPz8gU3RyaW5nKHJvdy5pZCksXG4gICAgZG9jdW1lbnRJZDogcm93LmRvY3VtZW50X2lkID8/IFN0cmluZyhyb3cuaWQpLFxuICAgIGNyZWF0ZWRBdDogbmV3IERhdGUocm93LmNyZWF0ZWRfYXQpLnRvSVNPU3RyaW5nKCksXG4gICAgdXBkYXRlZEF0OiBuZXcgRGF0ZShyb3cudXBkYXRlZF9hdCkudG9JU09TdHJpbmcoKSxcbiAgICBwdWJsaXNoZWRBdDogcm93LnB1Ymxpc2hlZF9hdCA/IG5ldyBEYXRlKHJvdy5wdWJsaXNoZWRfYXQpLnRvSVNPU3RyaW5nKCkgOiBudWxsLFxuICAgIHN0YXR1czogcm93LnB1Ymxpc2hlZF9hdCA/ICdwdWJsaXNoZWQnIDogJ2RyYWZ0JyxcbiAgfVxuXG4gIGZvciAoY29uc3QgW2ZpZWxkTmFtZSwgZmllbGRdIG9mIE9iamVjdC5lbnRyaWVzKGRlZi5maWVsZHMpKSB7XG4gICAgaWYgKGZpZWxkLmtpbmQgPT09ICdwdWJsaXNoZWQtYXQnKSBjb250aW51ZVxuICAgIGNvbnN0IHJhdyA9IHJvd1tmaWVsZC5jb2x1bW5dXG4gICAgaWYgKGZpZWxkLmxvY2FsaXplZCkge1xuICAgICAgb3V0W2ZpZWxkTmFtZV0gPSB0eXBlb2YgcmF3ID09PSAnc3RyaW5nJyA/IHBpY2tMb2NhbGUocmF3LCBsb2NhbGUpIDogJydcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0W2ZpZWxkTmFtZV0gPSByYXcgPz8gbnVsbFxuICAgIH1cbiAgfVxuICByZXR1cm4gb3V0XG59XG5cbi8qKiDpmo/mnLogZG9jdW1lbnRJZO+8jOWvuem9kCBTdHJhcGkgMjQg5L2N5Y2B5YWt6L+b5Yi25qC85byP44CCICovXG5mdW5jdGlvbiBnZW5lcmF0ZURvY3VtZW50SWQoKTogc3RyaW5nIHtcbiAgcmV0dXJuIGNyeXB0by5yYW5kb21VVUlEKCkucmVwbGFjZSgvLS9nLCAnJykuc2xpY2UoMCwgMjQpXG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZpbmRCeURvY3VtZW50SWQoZGI6IEQxRGF0YWJhc2UsIHRhYmxlOiBzdHJpbmcsIGRvY3VtZW50SWQ6IHN0cmluZyk6IFByb21pc2U8Um93UmVjb3JkIHwgbnVsbD4ge1xuICByZXR1cm4gZGIucHJlcGFyZShgU0VMRUNUICogRlJPTSAke3RhYmxlfSBXSEVSRSBkb2N1bWVudF9pZCA9ID8xYCkuYmluZChkb2N1bWVudElkKS5maXJzdDxSb3dSZWNvcmQ+KClcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyQ3J1ZFJvdXRlcyhwYW5lbDogSG9ub1BhbmVsKTogdm9pZCB7XG4gIC8vIOazqOaEj++8muW/hemhu+eUqOaYvuW8jyAvcGFuZWwg5YmN57yA77yb5oyC6L295ZyoICcvJyDml7YgJy86Y29sbGVjdGlvbicg5Lya5oqKICdwYW5lbCcg5b2T6ZuG5ZCI5ZCN5ZCe5o6J5Lik5q616Lev5b6EXG4gIC8vID09PT09IOWIl+ihqCA9PT09PVxuICBwYW5lbC5nZXQoJy9wYW5lbC86Y29sbGVjdGlvbicsIGFzeW5jIChjKSA9PiB7XG4gICAgY29uc3Qga2V5ID0gYy5yZXEucGFyYW0oJ2NvbGxlY3Rpb24nKVxuICAgIGlmICghaXNQYW5lbENvbGxlY3Rpb24oa2V5KSkgcmV0dXJuIGZhaWwoNDA0LCAndW5rbm93bl9jb2xsZWN0aW9uJylcbiAgICBjb25zdCBkZWYgPSBDT0xMRUNUSU9OU1trZXldXG4gICAgY29uc3QgbG9jYWxlID0gbWFwTG9jYWxlKGMucmVxLnF1ZXJ5KCdsb2NhbGUnKSlcbiAgICBjb25zdCBwYWdlID0gTWF0aC5tYXgoMSwgTnVtYmVyKGMucmVxLnF1ZXJ5KCdwYWdlJykgfHwgJzEnKSB8fCAxKVxuICAgIGNvbnN0IHBhZ2VTaXplID0gTWF0aC5taW4oTUFYX1BBR0VfU0laRSwgTWF0aC5tYXgoMSwgTnVtYmVyKGMucmVxLnF1ZXJ5KCdwYWdlU2l6ZScpIHx8IFN0cmluZyhERUZBVUxUX1BBR0VfU0laRSkpIHx8IERFRkFVTFRfUEFHRV9TSVpFKSlcblxuICAgIGNvbnN0IHdoZXJlOiBzdHJpbmdbXSA9IFtdXG4gICAgY29uc3QgYmluZHM6IHVua25vd25bXSA9IFtdXG5cbiAgICBjb25zdCBzdGF0dXMgPSBjLnJlcS5xdWVyeSgnc3RhdHVzJylcbiAgICBpZiAoc3RhdHVzID09PSAncHVibGlzaGVkJykgd2hlcmUucHVzaCgncHVibGlzaGVkX2F0IElTIE5PVCBOVUxMJylcbiAgICBlbHNlIGlmIChzdGF0dXMgPT09ICdkcmFmdCcpIHdoZXJlLnB1c2goJ3B1Ymxpc2hlZF9hdCBJUyBOVUxMJylcblxuICAgIGNvbnN0IHNlYXJjaCA9IGMucmVxLnF1ZXJ5KCdzZWFyY2gnKT8udHJpbSgpXG4gICAgaWYgKHNlYXJjaCkge1xuICAgICAgY29uc3QgY2xhdXNlcyA9IGRlZi5zZWFyY2hDb2x1bW5zLm1hcCgoY29sKSA9PiBgTE9XRVIoJHtjb2x9KSBMSUtFID8ke2JpbmRzLmxlbmd0aCArIDF9YClcbiAgICAgIGJpbmRzLnB1c2goYCUke3NlYXJjaC50b0xvd2VyQ2FzZSgpfSVgKVxuICAgICAgaWYgKGNsYXVzZXMubGVuZ3RoID4gMCkgd2hlcmUucHVzaChgKCR7Y2xhdXNlcy5qb2luKCcgT1IgJyl9KWApXG4gICAgfVxuXG4gICAgY29uc3Qgd2hlcmVTcWwgPSB3aGVyZS5sZW5ndGggPiAwID8gYFdIRVJFICR7d2hlcmUuam9pbignIEFORCAnKX1gIDogJydcbiAgICBjb25zdCBvcmRlclNxbCA9IGRlZi5kZWZhdWx0U29ydC5tYXAoKFtjb2wsIGRpcl0pID0+IGAke2NvbH0gJHtkaXIudG9VcHBlckNhc2UoKX1gKS5qb2luKCcsICcpXG4gICAgY29uc3QgdG90YWxSb3cgPSBhd2FpdCBjLmVudi5EQi5wcmVwYXJlKGBTRUxFQ1QgQ09VTlQoKikgQVMgbiBGUk9NICR7ZGVmLnRhYmxlfSAke3doZXJlU3FsfWApXG4gICAgICAuYmluZCguLi5iaW5kcylcbiAgICAgIC5maXJzdDx7IG46IG51bWJlciB9PigpXG4gICAgY29uc3QgdG90YWwgPSB0b3RhbFJvdz8ubiA/PyAwXG5cbiAgICBjb25zdCBvZmZzZXQgPSAocGFnZSAtIDEpICogcGFnZVNpemVcbiAgICBjb25zdCB7IHJlc3VsdHMgfSA9IGF3YWl0IGMuZW52LkRCLnByZXBhcmUoXG4gICAgICBgU0VMRUNUICogRlJPTSAke2RlZi50YWJsZX0gJHt3aGVyZVNxbH0gT1JERVIgQlkgJHtvcmRlclNxbH0gTElNSVQgJHtwYWdlU2l6ZX0gT0ZGU0VUICR7b2Zmc2V0fWBcbiAgICApXG4gICAgICAuYmluZCguLi5iaW5kcylcbiAgICAgIC5hbGw8Um93UmVjb3JkPigpXG5cbiAgICByZXR1cm4gb2tQYWdpbmF0ZWQocmVzdWx0cy5tYXAoKHJvdykgPT4gc2VyaWFsaXplUm93KGtleSwgcm93LCBsb2NhbGUpKSwgcGFnaW5hdGlvbk9mKHBhZ2UsIHBhZ2VTaXplLCB0b3RhbCkpXG4gIH0pXG5cbiAgLy8gPT09PT0g5Y2V5p2hID09PT09XG4gIHBhbmVsLmdldCgnL3BhbmVsLzpjb2xsZWN0aW9uLzpkb2N1bWVudElkJywgYXN5bmMgKGMpID0+IHtcbiAgICBjb25zdCBrZXkgPSBjLnJlcS5wYXJhbSgnY29sbGVjdGlvbicpXG4gICAgaWYgKCFpc1BhbmVsQ29sbGVjdGlvbihrZXkpKSByZXR1cm4gZmFpbCg0MDQsICd1bmtub3duX2NvbGxlY3Rpb24nKVxuICAgIGNvbnN0IGRlZiA9IENPTExFQ1RJT05TW2tleV1cbiAgICBjb25zdCByb3cgPSBhd2FpdCBmaW5kQnlEb2N1bWVudElkKGMuZW52LkRCLCBkZWYudGFibGUsIGMucmVxLnBhcmFtKCdkb2N1bWVudElkJykpXG4gICAgaWYgKCFyb3cpIHJldHVybiBmYWlsKDQwNCwgJ25vdF9mb3VuZCcpXG4gICAgcmV0dXJuIG9rKHNlcmlhbGl6ZVJvdyhrZXksIHJvdywgbWFwTG9jYWxlKGMucmVxLnF1ZXJ5KCdsb2NhbGUnKSkpKVxuICB9KVxuXG4gIC8vID09PT09IOaWsOW7uiA9PT09PVxuICBwYW5lbC5wb3N0KCcvcGFuZWwvOmNvbGxlY3Rpb24nLCBhc3luYyAoYykgPT4ge1xuICAgIGNvbnN0IGtleSA9IGMucmVxLnBhcmFtKCdjb2xsZWN0aW9uJylcbiAgICBpZiAoIWlzUGFuZWxDb2xsZWN0aW9uKGtleSkpIHJldHVybiBmYWlsKDQwNCwgJ3Vua25vd25fY29sbGVjdGlvbicpXG4gICAgY29uc3QgZGVmID0gQ09MTEVDVElPTlNba2V5XVxuICAgIGlmIChkZWYucmVhZE9ubHkpIHJldHVybiBmYWlsKDQwMCwgJ3JlYWRfb25seV9jb2xsZWN0aW9uJylcblxuICAgIGxldCBib2R5OiB7IGRhdGE/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjsgbG9jYWxlPzogc3RyaW5nIH0gfCBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPlxuICAgIHRyeSB7XG4gICAgICBib2R5ID0gYXdhaXQgYy5yZXEuanNvbigpXG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZmFpbCg0MDAsICdpbnZhbGlkX3JlcXVlc3QnKVxuICAgIH1cbiAgICBjb25zdCBwYXlsb2FkID0gKCdkYXRhJyBpbiBib2R5ICYmIGJvZHkuZGF0YSAmJiB0eXBlb2YgYm9keS5kYXRhID09PSAnb2JqZWN0JyA/IGJvZHkuZGF0YSA6IGJvZHkpIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+XG4gICAgY29uc3QgbG9jYWxlUXVlcnkgPSAnbG9jYWxlJyBpbiBib2R5ICYmIHR5cGVvZiBib2R5LmxvY2FsZSA9PT0gJ3N0cmluZycgPyBib2R5LmxvY2FsZSA6IHVuZGVmaW5lZFxuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG5vdyA9IERhdGUubm93KClcbiAgICAgIGNvbnN0IHsgdmFsdWVzIH0gPSBwaWNrQWxsb3dlZEZpZWxkcyhrZXksIHBheWxvYWQsIGxvY2FsZVF1ZXJ5KVxuICAgICAgY29uc3QgY29sdW1ucyA9IFsnZG9jdW1lbnRfaWQnLCAnY3JlYXRlZF9hdCcsICd1cGRhdGVkX2F0J11cbiAgICAgIGNvbnN0IHBsYWNlaG9sZGVycyA9IFsnPzEnLCAnPzInLCAnPzMnXVxuICAgICAgY29uc3QgYmluZHM6IHVua25vd25bXSA9IFtnZW5lcmF0ZURvY3VtZW50SWQoKSwgbm93LCBub3ddXG4gICAgICBmb3IgKGNvbnN0IFtjb2x1bW4sIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyh2YWx1ZXMpKSB7XG4gICAgICAgIGNvbHVtbnMucHVzaChjb2x1bW4pXG4gICAgICAgIHBsYWNlaG9sZGVycy5wdXNoKGA/JHtiaW5kcy5sZW5ndGggKyAxfWApXG4gICAgICAgIGJpbmRzLnB1c2godmFsdWUpXG4gICAgICB9XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjLmVudi5EQi5wcmVwYXJlKFxuICAgICAgICBgSU5TRVJUIElOVE8gJHtkZWYudGFibGV9ICgke2NvbHVtbnMuam9pbignLCAnKX0pIFZBTFVFUyAoJHtwbGFjZWhvbGRlcnMuam9pbignLCAnKX0pYFxuICAgICAgKVxuICAgICAgICAuYmluZCguLi5iaW5kcylcbiAgICAgICAgLnJ1bigpXG4gICAgICBpZiAoIXJlc3VsdC5tZXRhLmNoYW5nZXMpIHJldHVybiBmYWlsKDUwMCwgJ2luc2VydF9mYWlsZWQnKVxuXG4gICAgICBjb25zdCByb3cgPSBhd2FpdCBmaW5kQnlEb2N1bWVudElkKGMuZW52LkRCLCBkZWYudGFibGUsIGJpbmRzWzBdIGFzIHN0cmluZylcbiAgICAgIGF3YWl0IHJlY29yZEF1ZGl0TG9nKGMsIHtcbiAgICAgICAgYWN0aW9uOiAnY3JlYXRlJyxcbiAgICAgICAgdGFyZ2V0Q29sbGVjdGlvbjoga2V5LFxuICAgICAgICB0YXJnZXREb2N1bWVudElkOiBiaW5kc1swXSBhcyBzdHJpbmcsXG4gICAgICAgIHBheWxvYWRTdW1tYXJ5OiBzdW1tYXJpemVQYXlsb2FkKHBheWxvYWQpLFxuICAgICAgfSlcbiAgICAgIHJldHVybiBvayhyb3cgPyBzZXJpYWxpemVSb3coa2V5LCByb3csIG1hcExvY2FsZShsb2NhbGVRdWVyeSkpIDoge30pXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEZpZWxkVmFsaWRhdGlvbkVycm9yKSB7XG4gICAgICAgIHJldHVybiBmYWlsKDQwMCwgZXJyb3IuZmllbGQgPyBgdW5rbm93bl9maWVsZDoke2Vycm9yLmZpZWxkfWAgOiBlcnJvci5tZXNzYWdlKVxuICAgICAgfVxuICAgICAgY29uc3QgbWVzc2FnZSA9IChlcnJvciBhcyBFcnJvcikubWVzc2FnZSB8fCAnJ1xuICAgICAgaWYgKC9VTklRVUUvLnRlc3QobWVzc2FnZSkpIHJldHVybiBmYWlsKDQwMCwgJ2R1cGxpY2F0ZV9zbHVnJylcbiAgICAgIGlmICgvTk9UIE5VTEwvLnRlc3QobWVzc2FnZSkpIHJldHVybiBmYWlsKDQwMCwgJ21pc3NpbmdfcmVxdWlyZWRfZmllbGQnKVxuICAgICAgcmV0dXJuIGZhaWwoNDAwLCAnY3JlYXRlX2ZhaWxlZCcpXG4gICAgfVxuICB9KVxuXG4gIC8vID09PT09IOabtOaWsCA9PT09PVxuICBwYW5lbC5wdXQoJy9wYW5lbC86Y29sbGVjdGlvbi86ZG9jdW1lbnRJZCcsIGFzeW5jIChjKSA9PiB7XG4gICAgY29uc3Qga2V5ID0gYy5yZXEucGFyYW0oJ2NvbGxlY3Rpb24nKVxuICAgIGlmICghaXNQYW5lbENvbGxlY3Rpb24oa2V5KSkgcmV0dXJuIGZhaWwoNDA0LCAndW5rbm93bl9jb2xsZWN0aW9uJylcbiAgICBjb25zdCBkZWYgPSBDT0xMRUNUSU9OU1trZXldXG4gICAgaWYgKGRlZi5yZWFkT25seSkgcmV0dXJuIGZhaWwoNDAwLCAncmVhZF9vbmx5X2NvbGxlY3Rpb24nKVxuXG4gICAgbGV0IGJvZHk6IHsgZGF0YT86IFJlY29yZDxzdHJpbmcsIHVua25vd24+OyBsb2NhbGU/OiBzdHJpbmcgfSB8IFJlY29yZDxzdHJpbmcsIHVua25vd24+XG4gICAgdHJ5IHtcbiAgICAgIGJvZHkgPSBhd2FpdCBjLnJlcS5qc29uKClcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBmYWlsKDQwMCwgJ2ludmFsaWRfcmVxdWVzdCcpXG4gICAgfVxuICAgIGNvbnN0IHBheWxvYWQgPSAoJ2RhdGEnIGluIGJvZHkgJiYgYm9keS5kYXRhICYmIHR5cGVvZiBib2R5LmRhdGEgPT09ICdvYmplY3QnID8gYm9keS5kYXRhIDogYm9keSkgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj5cbiAgICBjb25zdCBsb2NhbGVRdWVyeSA9ICdsb2NhbGUnIGluIGJvZHkgJiYgdHlwZW9mIGJvZHkubG9jYWxlID09PSAnc3RyaW5nJyA/IGJvZHkubG9jYWxlIDogdW5kZWZpbmVkXG4gICAgY29uc3QgZG9jdW1lbnRJZCA9IGMucmVxLnBhcmFtKCdkb2N1bWVudElkJylcblxuICAgIGNvbnN0IGV4aXN0aW5nID0gYXdhaXQgZmluZEJ5RG9jdW1lbnRJZChjLmVudi5EQiwgZGVmLnRhYmxlLCBkb2N1bWVudElkKVxuICAgIGlmICghZXhpc3RpbmcpIHJldHVybiBmYWlsKDQwNCwgJ25vdF9mb3VuZCcpXG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgeyB2YWx1ZXMgfSA9IHBpY2tBbGxvd2VkRmllbGRzKGtleSwgcGF5bG9hZCwgbG9jYWxlUXVlcnkpXG4gICAgICBjb25zdCBzZXRzID0gWyd1cGRhdGVkX2F0ID0gPzEnXVxuICAgICAgY29uc3QgYmluZHM6IHVua25vd25bXSA9IFtEYXRlLm5vdygpXVxuICAgICAgZm9yIChjb25zdCBbY29sdW1uLCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXModmFsdWVzKSkge1xuICAgICAgICBzZXRzLnB1c2goYCR7Y29sdW1ufSA9ID8ke2JpbmRzLmxlbmd0aCArIDF9YClcbiAgICAgICAgYmluZHMucHVzaCh2YWx1ZSlcbiAgICAgIH1cbiAgICAgIGJpbmRzLnB1c2goZG9jdW1lbnRJZClcbiAgICAgIGF3YWl0IGMuZW52LkRCLnByZXBhcmUoYFVQREFURSAke2RlZi50YWJsZX0gU0VUICR7c2V0cy5qb2luKCcsICcpfSBXSEVSRSBkb2N1bWVudF9pZCA9ID8ke2JpbmRzLmxlbmd0aH1gKVxuICAgICAgICAuYmluZCguLi5iaW5kcylcbiAgICAgICAgLnJ1bigpXG5cbiAgICAgIGNvbnN0IHJvdyA9IGF3YWl0IGZpbmRCeURvY3VtZW50SWQoYy5lbnYuREIsIGRlZi50YWJsZSwgZG9jdW1lbnRJZClcbiAgICAgIGF3YWl0IHJlY29yZEF1ZGl0TG9nKGMsIHtcbiAgICAgICAgYWN0aW9uOiAndXBkYXRlJyxcbiAgICAgICAgdGFyZ2V0Q29sbGVjdGlvbjoga2V5LFxuICAgICAgICB0YXJnZXREb2N1bWVudElkOiBkb2N1bWVudElkLFxuICAgICAgICBwYXlsb2FkU3VtbWFyeTogc3VtbWFyaXplUGF5bG9hZChwYXlsb2FkKSxcbiAgICAgIH0pXG4gICAgICByZXR1cm4gb2socm93ID8gc2VyaWFsaXplUm93KGtleSwgcm93LCBtYXBMb2NhbGUobG9jYWxlUXVlcnkpKSA6IHt9KVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBGaWVsZFZhbGlkYXRpb25FcnJvcikge1xuICAgICAgICByZXR1cm4gZmFpbCg0MDAsIGVycm9yLmZpZWxkID8gYHVua25vd25fZmllbGQ6JHtlcnJvci5maWVsZH1gIDogZXJyb3IubWVzc2FnZSlcbiAgICAgIH1cbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfHwgJydcbiAgICAgIGlmICgvVU5JUVVFLy50ZXN0KG1lc3NhZ2UpKSByZXR1cm4gZmFpbCg0MDAsICdkdXBsaWNhdGVfc2x1ZycpXG4gICAgICByZXR1cm4gZmFpbCg0MDAsICd1cGRhdGVfZmFpbGVkJylcbiAgICB9XG4gIH0pXG5cbiAgLy8gPT09PT0g5Yig6ZmkID09PT09XG4gIHBhbmVsLmRlbGV0ZSgnL3BhbmVsLzpjb2xsZWN0aW9uLzpkb2N1bWVudElkJywgYXN5bmMgKGMpID0+IHtcbiAgICBjb25zdCBrZXkgPSBjLnJlcS5wYXJhbSgnY29sbGVjdGlvbicpXG4gICAgaWYgKCFpc1BhbmVsQ29sbGVjdGlvbihrZXkpKSByZXR1cm4gZmFpbCg0MDQsICd1bmtub3duX2NvbGxlY3Rpb24nKVxuICAgIGNvbnN0IGRlZiA9IENPTExFQ1RJT05TW2tleV1cbiAgICBpZiAoZGVmLnJlYWRPbmx5KSByZXR1cm4gZmFpbCg0MDAsICdyZWFkX29ubHlfY29sbGVjdGlvbicpXG4gICAgY29uc3QgZG9jdW1lbnRJZCA9IGMucmVxLnBhcmFtKCdkb2N1bWVudElkJylcblxuICAgIGNvbnN0IGV4aXN0aW5nID0gYXdhaXQgZmluZEJ5RG9jdW1lbnRJZChjLmVudi5EQiwgZGVmLnRhYmxlLCBkb2N1bWVudElkKVxuICAgIGlmICghZXhpc3RpbmcpIHJldHVybiBmYWlsKDQwNCwgJ25vdF9mb3VuZCcpXG5cbiAgICBhd2FpdCBjLmVudi5EQi5wcmVwYXJlKGBERUxFVEUgRlJPTSAke2RlZi50YWJsZX0gV0hFUkUgZG9jdW1lbnRfaWQgPSA/MWApLmJpbmQoZG9jdW1lbnRJZCkucnVuKClcbiAgICBhd2FpdCByZWNvcmRBdWRpdExvZyhjLCB7IGFjdGlvbjogJ2RlbGV0ZScsIHRhcmdldENvbGxlY3Rpb246IGtleSwgdGFyZ2V0RG9jdW1lbnRJZDogZG9jdW1lbnRJZCB9KVxuICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUgfSlcbiAgfSlcbn1cblxuZnVuY3Rpb24gc3VtbWFyaXplUGF5bG9hZChwYXlsb2FkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHN0cmluZyB7XG4gIHRyeSB7XG4gICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKHBheWxvYWQpXG4gICAgY29uc3QgcHJldmlldyA9IGtleXMubGVuZ3RoID4gOCA/IGtleXMuc2xpY2UoMCwgOCkuam9pbignLCcpICsgJyzigKYnIDoga2V5cy5qb2luKCcsJylcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoeyBmaWVsZHM6IHByZXZpZXcgfSlcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuICcnXG4gIH1cbn1cbiJdLCJmaWxlIjoiL1VzZXJzL2thcmEvQ29kZS9TY2hhbGUtTGlicmFyeS9zZXJ2ZXIvc3JjL3BhbmVsL2NydWQudHMifQ==
