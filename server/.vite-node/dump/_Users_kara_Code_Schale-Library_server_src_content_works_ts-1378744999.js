// /Users/kara/Code/Schale-Library/server/src/content/works.ts
const __vite_ssr_import_0__ = await __vite_ssr_import__("hono", {"importedNames":["Hono"]});
const __vite_ssr_import_1__ = await __vite_ssr_import__("/src/lib/respond.ts", {"importedNames":["ok","okPaginated","fail","paginationOf"]});
const __vite_ssr_import_2__ = await __vite_ssr_import__("/src/content/query.ts", {"importedNames":["parseContentQuery"]});
const __vite_ssr_import_3__ = await __vite_ssr_import__("/src/content/sql.ts", {"importedNames":["cond","andAll","orAny","limitOffset","camelToSnake"]});




const WORKS_SELECT = `SELECT w.*, s.id AS student_id, s.document_id AS student_document_id, s.name AS student_name, ws.sort_order AS student_sort
FROM works w
LEFT JOIN works_students ws ON ws.work_id = w.id
LEFT JOIN students s ON s.id = ws.student_id`;
function groupWorkJson(rows, keyOf) {
  const byKey = /* @__PURE__ */ new Map();
  for (const r of rows) {
    const key = keyOf(r);
    let entry = byKey.get(key);
    if (!entry) {
      byKey.set(key, entry = { row: r, students: [] });
    }
    if (entry && r.student_id !== null && r.student_id !== void 0) {
      entry.students.push({
        id: r.student_id,
        documentId: r.student_document_id ?? "",
        name: r.student_name ?? ""
      });
    }
  }
  return [...byKey.values()].map(({ row, students }) => workToJson(row, students));
}
function toIso(ms) {
  return ms === null ? null : new Date(ms).toISOString();
}
function workToJson(w, students) {
  return {
    id: w.id,
    documentId: w.document_id,
    title: w.title,
    author: w.author ?? void 0,
    description: w.description ?? void 0,
    coverImage: w.cover_image_url || w.cover_image_url_external ? { url: w.cover_image_url || w.cover_image_url_external } : void 0,
    coverImageUrl: w.cover_image_url_external ?? void 0,
    originalPublishDate: w.original_publish_date ?? void 0,
    nature: w.nature,
    workType: w.work_type ?? "other",
    link: w.link ?? void 0,
    isActive: w.is_active === 1,
    isFeatured: w.is_featured === 1,
    featuredPriority: w.featured_priority,
    featuredReason: w.featured_reason ?? void 0,
    featuredUntil: toIso(w.featured_until),
    sourcePlatform: w.source_platform ?? void 0,
    sourceUrl: w.source_url ?? void 0,
    sourceId: w.source_id ?? void 0,
    isAutoImported: w.is_auto_imported === 1,
    importedAt: toIso(w.imported_at),
    students,
    createdAt: new Date(w.created_at).toISOString(),
    updatedAt: new Date(w.updated_at).toISOString(),
    publishedAt: toIso(w.published_at)
  };
}
const WORK_SORT_COLUMNS = {
  published_at: "w.published_at",
  created_at: "w.created_at",
  updated_at: "w.updated_at",
  is_featured: "w.is_featured",
  featured_priority: "w.featured_priority"
};
function orderByOf(sorts) {
  const parts = sorts.map((s) => {
    const col = WORK_SORT_COLUMNS[s.field];
    return col ? `${col} ${s.dir.toUpperCase()}` : null;
  }).filter((p) => p !== null);
  return parts.length > 0 ? parts.join(", ") : "w.published_at DESC";
}
function buildWhere(q) {
  const conds = [{ sql: "w.published_at IS NOT NULL", params: [] }];
  for (const leaf of q.leaves) {
    const [head, rel] = leaf.path;
    if (head === "is_active") {
      conds.push(__vite_ssr_import_3__.cond("w.is_active", "eq", leaf.value === "true" || leaf.value === "1" ? 1 : 0));
      continue;
    }
    if (head === "nature") {
      conds.push(__vite_ssr_import_3__.cond("w.nature", "eq", leaf.value));
      continue;
    }
    if (head === "work_type") {
      conds.push(__vite_ssr_import_3__.cond("w.work_type", "eq", leaf.value));
      continue;
    }
    if (head === "source_platform") {
      conds.push(__vite_ssr_import_3__.cond("w.source_platform", "eq", leaf.value));
      continue;
    }
    if (head === "is_featured") {
      conds.push(__vite_ssr_import_3__.cond("w.is_featured", "eq", leaf.value === "true" || leaf.value === "1" ? 1 : 0));
      continue;
    }
    if (head === "id" && leaf.op === "ne") {
      conds.push(__vite_ssr_import_3__.cond("w.id", "ne", parseInt(leaf.value, 10)));
      continue;
    }
    if (head === "id" && leaf.op === "eq") {
      conds.push(__vite_ssr_import_3__.cond("w.id", "eq", parseInt(leaf.value, 10)));
      continue;
    }
    if (head === "document_id" && leaf.op === "eq") {
      conds.push(__vite_ssr_import_3__.cond("w.document_id", "eq", leaf.value));
      continue;
    }
    if (head === "author" && leaf.op === "eq") {
      conds.push(__vite_ssr_import_3__.cond("w.author", "eq", leaf.value));
      continue;
    }
    if (head === "featured_until" && rel === void 0) {
      continue;
    }
    void rel;
  }
  for (const group of q.orGroups) {
    const ors = group.map((leaf) => {
      const field = leaf.path[leaf.path.length - 1];
      if (field === "title") return __vite_ssr_import_3__.cond("w.title", "containsi", leaf.value);
      if (field === "author") return __vite_ssr_import_3__.cond("w.author", "containsi", leaf.value);
      if (field === "description") return __vite_ssr_import_3__.cond("LOWER(w.description)", "containsi", leaf.value);
      if (field === "name") return __vite_ssr_import_3__.cond("s.name", "containsi", leaf.value);
      return null;
    }).filter((x) => x !== null);
    conds.push(__vite_ssr_import_3__.orAny(ors));
  }
  for (const ag of q.andGroups) {
    for (const leaf of ag.leaves) {
      const [head] = leaf.path;
      if (head === "is_active" || head === "is_featured") {
        conds.push(__vite_ssr_import_3__.cond(`w.${__vite_ssr_import_3__.camelToSnake(head)}`, "eq", leaf.value === "true" || leaf.value === "1" ? 1 : 0));
      } else if (head === "id" && leaf.op === "ne") {
        conds.push(__vite_ssr_import_3__.cond("w.id", "ne", parseInt(leaf.value, 10)));
      } else if (head === "author" && leaf.op === "eq") {
        conds.push(__vite_ssr_import_3__.cond("w.author", "eq", leaf.value));
      }
    }
    for (const og of ag.orGroups) {
      const windowOrs = [];
      let sawWindow = false;
      for (const leaf of og) {
        const field = leaf.path[leaf.path.length - 1];
        if (field !== "featured_until") continue;
        sawWindow = true;
        if (leaf.op === "gte") windowOrs.push({ sql: "w.featured_until >= ?", params: [Date.parse(leaf.value)] });
        else if (leaf.op === "eq" && leaf.value === "") windowOrs.push({ sql: "w.featured_until IS NULL", params: [] });
        else if (leaf.op === "eq") windowOrs.push({ sql: "w.featured_until IS NULL", params: [] });
      }
      if (sawWindow && windowOrs.length > 0) conds.push(__vite_ssr_import_3__.orAny(windowOrs));
    }
  }
  return __vite_ssr_import_3__.andAll(conds);
}
const worksRoutes = new __vite_ssr_import_0__.Hono();
Object.defineProperty(__vite_ssr_exports__, "worksRoutes", { enumerable: true, configurable: true, get(){ return worksRoutes }});
async function fetchWorkRows(db, whereSql, orderSql, limOff) {
  const stmt = db.prepare(`${WORKS_SELECT} WHERE ${whereSql.sql} ORDER BY ${orderSql}, ws.sort_order ASC ${limOff.sql}`);
  const out = await stmt.bind([...whereSql.params, ...limOff.params]).all();
  return out.results ?? [];
}
async function countWorks(db, whereSql) {
  const stmt = db.prepare(`SELECT COUNT(DISTINCT w.id) AS n FROM works w LEFT JOIN works_students ws ON ws.work_id = w.id LEFT JOIN students s ON s.id = ws.student_id WHERE ${whereSql.sql}`);
  const row = await stmt.bind(...whereSql.params).first();
  return row?.n ?? 0;
}
worksRoutes.get("/works", async (c) => {
  const q = __vite_ssr_import_2__.parseContentQuery(new URL(c.req.url));
  const studentInLeaves = q.leaves.filter((l) => l.path[0] === "students" && l.path[1] === "id");
  let whereSql = buildWhere(q);
  if (studentInLeaves.length > 0) {
    const ids = studentInLeaves.map((l) => parseInt(l.value, 10)).filter((n) => !Number.isNaN(n));
    whereSql = __vite_ssr_import_3__.andAll([whereSql, __vite_ssr_import_3__.orAny(ids.map((id) => __vite_ssr_import_3__.cond("ws.student_id", "eq", id)))]);
  }
  const offset = q.start ?? (q.page - 1) * q.pageSize;
  const size = q.limit ?? q.pageSize;
  const rows = await fetchWorkRows(c.env.DB, whereSql, orderByOf(q.sorts), __vite_ssr_import_3__.limitOffset(size, offset));
  const total = await countWorks(c.env.DB, whereSql);
  const data = groupWorkJson(rows, (r) => `${r.id}`);
  return __vite_ssr_import_1__.okPaginated(data, __vite_ssr_import_1__.paginationOf(q.page, q.pageSize, total));
});
worksRoutes.get("/works/:key", async (c) => {
  const key = c.req.param("key").trim();
  const numeric = /^\d+$/.test(key);
  const whereSql = __vite_ssr_import_3__.andAll([
    { sql: "w.published_at IS NOT NULL", params: [] },
    numeric ? __vite_ssr_import_3__.cond("w.id", "eq", parseInt(key, 10)) : __vite_ssr_import_3__.cond("w.document_id", "eq", key)
  ]);
  const rows = await fetchWorkRows(c.env.DB, whereSql, "w.published_at DESC", __vite_ssr_import_3__.limitOffset(50, 0));
  const data = groupWorkJson(rows, (r) => `${r.id}`);
  if (data.length === 0) return __vite_ssr_import_1__.fail(404, "not_found");
  return __vite_ssr_import_1__.ok(data[0]);
});

//# sourceMappingSource=vite-node
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQTs7OztBQVlxQjtBQUUrQjtBQUNsQjtBQUM2QjtBQThDL0QsTUFBTSxlQUFlO0FBQUE7QUFBQTtBQUFBO0FBTXJCLFNBQVMsY0FBYyxNQUE2QixPQUFzRjtBQUN4SSxRQUFNLFFBQVEsb0JBQUksSUFBb0U7QUFDdEYsYUFBVyxLQUFLLE1BQU07QUFDcEIsVUFBTSxNQUFNLE1BQU0sQ0FBQztBQUNuQixRQUFJLFFBQVEsTUFBTSxJQUFJLEdBQUc7QUFDekIsUUFBSSxDQUFDLE9BQU87QUFDVixZQUFNLElBQUksS0FBTSxRQUFRLEVBQUUsS0FBSyxHQUFHLFVBQVUsQ0FBQyxFQUFFLENBQUU7QUFBQSxJQUNuRDtBQUNBLFFBQUksU0FBUyxFQUFFLGVBQWUsUUFBUSxFQUFFLGVBQWUsUUFBVztBQUNoRSxZQUFNLFNBQVMsS0FBSztBQUFBLFFBQ2xCLElBQUksRUFBRTtBQUFBLFFBQ04sWUFBWSxFQUFFLHVCQUF1QjtBQUFBLFFBQ3JDLE1BQU0sRUFBRSxnQkFBZ0I7QUFBQSxNQUMxQixDQUFDO0FBQUEsSUFDSDtBQUFBLEVBQ0Y7QUFDQSxTQUFPLENBQUMsR0FBRyxNQUFNLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLEtBQUssU0FBUyxNQUFNLFdBQVcsS0FBSyxRQUFRLENBQUM7QUFDakY7QUFFQSxTQUFTLE1BQU0sSUFBa0M7QUFDL0MsU0FBTyxPQUFPLE9BQU8sT0FBTyxJQUFJLEtBQUssRUFBRSxFQUFFLFlBQVk7QUFDdkQ7QUFFQSxTQUFTLFdBQVcsR0FBWSxVQUE4RDtBQUM1RixTQUFPO0FBQUEsSUFDTCxJQUFJLEVBQUU7QUFBQSxJQUNOLFlBQVksRUFBRTtBQUFBLElBQ2QsT0FBTyxFQUFFO0FBQUEsSUFDVCxRQUFRLEVBQUUsVUFBVTtBQUFBLElBQ3BCLGFBQWEsRUFBRSxlQUFlO0FBQUEsSUFDOUIsWUFBYSxFQUFFLG1CQUFtQixFQUFFLDJCQUNoQyxFQUFFLEtBQUssRUFBRSxtQkFBbUIsRUFBRSx5QkFBeUIsSUFDdkQ7QUFBQSxJQUNKLGVBQWUsRUFBRSw0QkFBNEI7QUFBQSxJQUM3QyxxQkFBcUIsRUFBRSx5QkFBeUI7QUFBQSxJQUNoRCxRQUFRLEVBQUU7QUFBQSxJQUNWLFVBQVUsRUFBRSxhQUFhO0FBQUEsSUFDekIsTUFBTSxFQUFFLFFBQVE7QUFBQSxJQUNoQixVQUFVLEVBQUUsY0FBYztBQUFBLElBQzFCLFlBQVksRUFBRSxnQkFBZ0I7QUFBQSxJQUM5QixrQkFBa0IsRUFBRTtBQUFBLElBQ3BCLGdCQUFnQixFQUFFLG1CQUFtQjtBQUFBLElBQ3JDLGVBQWUsTUFBTSxFQUFFLGNBQWM7QUFBQSxJQUNyQyxnQkFBZ0IsRUFBRSxtQkFBbUI7QUFBQSxJQUNyQyxXQUFXLEVBQUUsY0FBYztBQUFBLElBQzNCLFVBQVUsRUFBRSxhQUFhO0FBQUEsSUFDekIsZ0JBQWdCLEVBQUUscUJBQXFCO0FBQUEsSUFDdkMsWUFBWSxNQUFNLEVBQUUsV0FBVztBQUFBLElBQy9CO0FBQUEsSUFDQSxXQUFXLElBQUksS0FBSyxFQUFFLFVBQVUsRUFBRSxZQUFZO0FBQUEsSUFDOUMsV0FBVyxJQUFJLEtBQUssRUFBRSxVQUFVLEVBQUUsWUFBWTtBQUFBLElBQzlDLGFBQWEsTUFBTSxFQUFFLFlBQVk7QUFBQSxFQUNuQztBQUNGO0FBRUEsTUFBTSxvQkFBNEM7QUFBQSxFQUNoRCxjQUFjO0FBQUEsRUFDZCxZQUFZO0FBQUEsRUFDWixZQUFZO0FBQUEsRUFDWixhQUFhO0FBQUEsRUFDYixtQkFBbUI7QUFDckI7QUFFQSxTQUFTLFVBQVUsT0FBOEQ7QUFDL0UsUUFBTSxRQUFRLE1BQU0sSUFBSSxDQUFDLE1BQU07QUFDN0IsVUFBTSxNQUFNLGtCQUFrQixFQUFFLEtBQUs7QUFDckMsV0FBTyxNQUFNLEdBQUcsR0FBRyxJQUFJLEVBQUUsSUFBSSxZQUFZLENBQUMsS0FBSztBQUFBLEVBQ2pELENBQUMsRUFBRSxPQUFPLENBQUMsTUFBbUIsTUFBTSxJQUFJO0FBQ3hDLFNBQU8sTUFBTSxTQUFTLElBQUksTUFBTSxLQUFLLElBQUksSUFBSTtBQUMvQztBQUVBLFNBQVMsV0FBVyxHQUFnQztBQUNsRCxRQUFNLFFBQVEsQ0FBQyxFQUFFLEtBQUssOEJBQThCLFFBQVEsQ0FBQyxFQUFFLENBQVk7QUFFM0UsYUFBVyxRQUFRLEVBQUUsUUFBUTtBQUMzQixVQUFNLENBQUMsTUFBTSxHQUFHLElBQUksS0FBSztBQUN6QixRQUFJLFNBQVMsYUFBYTtBQUN4QixZQUFNLEtBQUssMkJBQUssZUFBZSxNQUFNLEtBQUssVUFBVSxVQUFVLEtBQUssVUFBVSxNQUFNLElBQUksQ0FBQyxDQUFDO0FBQ3pGO0FBQUEsSUFDRjtBQUNBLFFBQUksU0FBUyxVQUFVO0FBQ3JCLFlBQU0sS0FBSywyQkFBSyxZQUFZLE1BQU0sS0FBSyxLQUFLLENBQUM7QUFDN0M7QUFBQSxJQUNGO0FBQ0EsUUFBSSxTQUFTLGFBQWE7QUFDeEIsWUFBTSxLQUFLLDJCQUFLLGVBQWUsTUFBTSxLQUFLLEtBQUssQ0FBQztBQUNoRDtBQUFBLElBQ0Y7QUFDQSxRQUFJLFNBQVMsbUJBQW1CO0FBQzlCLFlBQU0sS0FBSywyQkFBSyxxQkFBcUIsTUFBTSxLQUFLLEtBQUssQ0FBQztBQUN0RDtBQUFBLElBQ0Y7QUFDQSxRQUFJLFNBQVMsZUFBZTtBQUMxQixZQUFNLEtBQUssMkJBQUssaUJBQWlCLE1BQU0sS0FBSyxVQUFVLFVBQVUsS0FBSyxVQUFVLE1BQU0sSUFBSSxDQUFDLENBQUM7QUFDM0Y7QUFBQSxJQUNGO0FBQ0EsUUFBSSxTQUFTLFFBQVEsS0FBSyxPQUFPLE1BQU07QUFDckMsWUFBTSxLQUFLLDJCQUFLLFFBQVEsTUFBTSxTQUFTLEtBQUssT0FBTyxFQUFFLENBQUMsQ0FBQztBQUN2RDtBQUFBLElBQ0Y7QUFDQSxRQUFJLFNBQVMsUUFBUSxLQUFLLE9BQU8sTUFBTTtBQUNyQyxZQUFNLEtBQUssMkJBQUssUUFBUSxNQUFNLFNBQVMsS0FBSyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0FBQ3ZEO0FBQUEsSUFDRjtBQUNBLFFBQUksU0FBUyxpQkFBaUIsS0FBSyxPQUFPLE1BQU07QUFDOUMsWUFBTSxLQUFLLDJCQUFLLGlCQUFpQixNQUFNLEtBQUssS0FBSyxDQUFDO0FBQ2xEO0FBQUEsSUFDRjtBQUNBLFFBQUksU0FBUyxZQUFZLEtBQUssT0FBTyxNQUFNO0FBQ3pDLFlBQU0sS0FBSywyQkFBSyxZQUFZLE1BQU0sS0FBSyxLQUFLLENBQUM7QUFDN0M7QUFBQSxJQUNGO0FBQ0EsUUFBSSxTQUFTLG9CQUFvQixRQUFRLFFBQVc7QUFFbEQ7QUFBQSxJQUNGO0FBQ0EsU0FBSztBQUFBLEVBQ1A7QUFHQSxhQUFXLFNBQVMsRUFBRSxVQUFVO0FBQzlCLFVBQU0sTUFBTSxNQUFNLElBQUksQ0FBQyxTQUFTO0FBQzlCLFlBQU0sUUFBUSxLQUFLLEtBQUssS0FBSyxLQUFLLFNBQVMsQ0FBQztBQUM1QyxVQUFJLFVBQVUsUUFBUyxRQUFPLDJCQUFLLFdBQVcsYUFBYSxLQUFLLEtBQUs7QUFDckUsVUFBSSxVQUFVLFNBQVUsUUFBTywyQkFBSyxZQUFZLGFBQWEsS0FBSyxLQUFLO0FBQ3ZFLFVBQUksVUFBVSxjQUFlLFFBQU8sMkJBQUssd0JBQXdCLGFBQWEsS0FBSyxLQUFLO0FBQ3hGLFVBQUksVUFBVSxPQUFRLFFBQU8sMkJBQUssVUFBVSxhQUFhLEtBQUssS0FBSztBQUNuRSxhQUFPO0FBQUEsSUFDVCxDQUFDLEVBQUUsT0FBTyxDQUFDLE1BQWtDLE1BQU0sSUFBSTtBQUN2RCxVQUFNLEtBQUssNEJBQU0sR0FBRyxDQUFDO0FBQUEsRUFDdkI7QUFHQSxhQUFXLE1BQU0sRUFBRSxXQUFXO0FBQzVCLGVBQVcsUUFBUSxHQUFHLFFBQVE7QUFDNUIsWUFBTSxDQUFDLElBQUksSUFBSSxLQUFLO0FBQ3BCLFVBQUksU0FBUyxlQUFlLFNBQVMsZUFBZTtBQUNsRCxjQUFNLEtBQUssMkJBQUssS0FBSyxtQ0FBYSxJQUFJLENBQUMsSUFBSSxNQUFNLEtBQUssVUFBVSxVQUFVLEtBQUssVUFBVSxNQUFNLElBQUksQ0FBQyxDQUFDO0FBQUEsTUFDdkcsV0FBVyxTQUFTLFFBQVEsS0FBSyxPQUFPLE1BQU07QUFDNUMsY0FBTSxLQUFLLDJCQUFLLFFBQVEsTUFBTSxTQUFTLEtBQUssT0FBTyxFQUFFLENBQUMsQ0FBQztBQUFBLE1BQ3pELFdBQVcsU0FBUyxZQUFZLEtBQUssT0FBTyxNQUFNO0FBQ2hELGNBQU0sS0FBSywyQkFBSyxZQUFZLE1BQU0sS0FBSyxLQUFLLENBQUM7QUFBQSxNQUMvQztBQUFBLElBQ0Y7QUFDQSxlQUFXLE1BQU0sR0FBRyxVQUFVO0FBRTVCLFlBQU0sWUFBdUIsQ0FBQztBQUM5QixVQUFJLFlBQVk7QUFDaEIsaUJBQVcsUUFBUSxJQUFJO0FBQ3JCLGNBQU0sUUFBUSxLQUFLLEtBQUssS0FBSyxLQUFLLFNBQVMsQ0FBQztBQUM1QyxZQUFJLFVBQVUsaUJBQWtCO0FBQ2hDLG9CQUFZO0FBR1osWUFBSSxLQUFLLE9BQU8sTUFBTyxXQUFVLEtBQUssRUFBRSxLQUFLLHlCQUF5QixRQUFRLENBQUMsS0FBSyxNQUFNLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQztBQUFBLGlCQUMvRixLQUFLLE9BQU8sUUFBUSxLQUFLLFVBQVUsR0FBSSxXQUFVLEtBQUssRUFBRSxLQUFLLDRCQUE0QixRQUFRLENBQUMsRUFBRSxDQUFDO0FBQUEsaUJBQ3JHLEtBQUssT0FBTyxLQUFNLFdBQVUsS0FBSyxFQUFFLEtBQUssNEJBQTRCLFFBQVEsQ0FBQyxFQUFFLENBQUM7QUFBQSxNQUMzRjtBQUNBLFVBQUksYUFBYSxVQUFVLFNBQVMsRUFBRyxPQUFNLEtBQUssNEJBQU0sU0FBUyxDQUFDO0FBQUEsSUFDcEU7QUFBQSxFQUNGO0FBRUEsU0FBTyw2QkFBTyxLQUFLO0FBQ3JCO0FBRU8sTUFBTSxjQUFjLElBQUksMkJBQXdCO2lJQUFBO0FBRXZELGVBQWUsY0FBYyxJQUFnQixVQUFtQixVQUFrQixRQUFtRDtBQUNuSSxRQUFNLE9BQU8sR0FBRyxRQUFRLEdBQUcsWUFBWSxVQUFVLFNBQVMsR0FBRyxhQUFhLFFBQVEsdUJBQXVCLE9BQU8sR0FBRyxFQUFFO0FBQ3JILFFBQU0sTUFBTSxNQUFNLEtBQUssS0FBSyxDQUFDLEdBQUcsU0FBUyxRQUFRLEdBQUcsT0FBTyxNQUFNLENBQUMsRUFBRSxJQUF5QjtBQUM3RixTQUFPLElBQUksV0FBVyxDQUFDO0FBQ3pCO0FBRUEsZUFBZSxXQUFXLElBQWdCLFVBQW9DO0FBQzVFLFFBQU0sT0FBTyxHQUFHLFFBQVEscUpBQXFKLFNBQVMsR0FBRyxFQUFFO0FBQzNMLFFBQU0sTUFBTSxNQUFNLEtBQUssS0FBSyxHQUFHLFNBQVMsTUFBTSxFQUFFLE1BQXFCO0FBQ3JFLFNBQU8sS0FBSyxLQUFLO0FBQ25CO0FBRUEsWUFBWSxJQUFJLFVBQVUsT0FBTyxNQUFNO0FBQ3JDLFFBQU0sSUFBSSx3Q0FBa0IsSUFBSSxJQUFJLEVBQUUsSUFBSSxHQUFHLENBQUM7QUFHOUMsUUFBTSxrQkFBa0IsRUFBRSxPQUFPLE9BQU8sQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU0sY0FBYyxFQUFFLEtBQUssQ0FBQyxNQUFNLElBQUk7QUFDN0YsTUFBSSxXQUFXLFdBQVcsQ0FBQztBQUMzQixNQUFJLGdCQUFnQixTQUFTLEdBQUc7QUFDOUIsVUFBTSxNQUFNLGdCQUFnQixJQUFJLENBQUMsTUFBTSxTQUFTLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUM7QUFDNUYsZUFBVyw2QkFBTyxDQUFDLFVBQVUsNEJBQU0sSUFBSSxJQUFJLENBQUMsT0FBTywyQkFBSyxpQkFBaUIsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFBQSxFQUN2RjtBQUVBLFFBQU0sU0FBUyxFQUFFLFVBQVUsRUFBRSxPQUFPLEtBQUssRUFBRTtBQUMzQyxRQUFNLE9BQU8sRUFBRSxTQUFTLEVBQUU7QUFFMUIsUUFBTSxPQUFPLE1BQU0sY0FBYyxFQUFFLElBQUksSUFBSSxVQUFVLFVBQVUsRUFBRSxLQUFLLEdBQUcsa0NBQVksTUFBTSxNQUFNLENBQUM7QUFDbEcsUUFBTSxRQUFRLE1BQU0sV0FBVyxFQUFFLElBQUksSUFBSSxRQUFRO0FBR2pELFFBQU0sT0FBTyxjQUFjLE1BQU0sQ0FBQyxNQUFNLEdBQUcsRUFBRSxFQUFFLEVBQUU7QUFDakQsU0FBTyxrQ0FBWSxNQUFNLG1DQUFhLEVBQUUsTUFBTSxFQUFFLFVBQVUsS0FBSyxDQUFDO0FBQ2xFLENBQUM7QUFFRCxZQUFZLElBQUksZUFBZSxPQUFPLE1BQU07QUFDMUMsUUFBTSxNQUFNLEVBQUUsSUFBSSxNQUFNLEtBQUssRUFBRSxLQUFLO0FBQ3BDLFFBQU0sVUFBVSxRQUFRLEtBQUssR0FBRztBQUNoQyxRQUFNLFdBQVcsNkJBQU87QUFBQSxJQUN0QixFQUFFLEtBQUssOEJBQThCLFFBQVEsQ0FBQyxFQUFFO0FBQUEsSUFDaEQsVUFBVSwyQkFBSyxRQUFRLE1BQU0sU0FBUyxLQUFLLEVBQUUsQ0FBQyxJQUFJLDJCQUFLLGlCQUFpQixNQUFNLEdBQUc7QUFBQSxFQUNuRixDQUFDO0FBQ0QsUUFBTSxPQUFPLE1BQU0sY0FBYyxFQUFFLElBQUksSUFBSSxVQUFVLHVCQUF1QixrQ0FBWSxJQUFJLENBQUMsQ0FBQztBQUM5RixRQUFNLE9BQU8sY0FBYyxNQUFNLENBQUMsTUFBTSxHQUFHLEVBQUUsRUFBRSxFQUFFO0FBQ2pELE1BQUksS0FBSyxXQUFXLEVBQUcsUUFBTywyQkFBSyxLQUFLLFdBQVc7QUFDbkQsU0FBTyx5QkFBRyxLQUFLLENBQUMsQ0FBQztBQUNuQixDQUFDIiwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJ3b3Jrcy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIOWFrOW8gOWGheWuuSBBUEkg4oCUIHdvcmtzIOWfn++8iOaXpyBTdHJhcGkgd29yayDpm4blkIjlubPnp7vvvIxXNCDmnI3lvbnjgIFXNSDpgIDlvbnvvInjgIJcbiAqXG4gKiDnq6/ngrnvvIjlr7nmi40gZnJvbnRlbmQvdGVzdHMvY29udHJhY3RzL3dvcmtzLnRzICsgZnJvbnRlbmQvc3JjL2xpYi9hcGkvd29ya3MudHPvvInvvJpcbiAqIC0gR0VUIC93b3Jrc++8muWIl+ihqO+8m2lzQWN0aXZlIOi/h+a7pOOAgWZlYXR1cmVkIOeql+WPo+OAgeWkmumUruaOkuW6j+OAgeWIhumhtVxuICogLSBHRVQgL3dvcmtzLzprZXnvvJror6bmg4XvvIjmlbDlrZcg4oaSIGlk77yM5ZCm5YiZIGRvY3VtZW50SWTvvIlcbiAqIOaQnOe0oi/mjInkvZzogIUv5oyJ5a2m55Sf562J5Zy65pmv5aSN55So5ZCM5LiA56uv54K577yaJG9yIOe7hO+8iHRpdGxlL2F1dGhvci9kZXNjcmlwdGlvbi9zdHVkZW50cy5uYW1l77yJ44CBXG4gKiBmaWx0ZXJzW3N0dWRlbnRzXVtpZF1bJGluXeOAgWZpbHRlcnNbYXV0aG9yXVskZXFd44CBZmlsdGVyc1tpZF1bJG5lXSDlnYflnKjliJfooajlpITnkIblmajlhoXlrp7njrDjgIJcbiAqXG4gKiBzdHVkZW50cyDlhbPogZTnu48gd29ya3Nfc3R1ZGVudHMgSk9JTiDovpPlh7ogc3R1ZGVudHNbXe+8m2NvdmVySW1hZ2UudXJsIOWPllxuICogY292ZXJfaW1hZ2VfdXJsIOS8mOWFiO+8jOWbnumAgCBjb3Zlcl9pbWFnZV91cmxfZXh0ZXJuYWzjgIJcbiAqL1xuaW1wb3J0IHsgSG9ubyB9IGZyb20gJ2hvbm8nXG5pbXBvcnQgdHlwZSB7IEVudiB9IGZyb20gJy4uL2luZGV4J1xuaW1wb3J0IHsgb2ssIG9rUGFnaW5hdGVkLCBmYWlsLCBwYWdpbmF0aW9uT2YgfSBmcm9tICcuLi9saWIvcmVzcG9uZCdcbmltcG9ydCB7IHBhcnNlQ29udGVudFF1ZXJ5IH0gZnJvbSAnLi9xdWVyeSdcbmltcG9ydCB7IGNvbmQsIGFuZEFsbCwgb3JBbnksIGxpbWl0T2Zmc2V0LCBjYW1lbFRvU25ha2UgfSBmcm9tICcuL3NxbCdcbmltcG9ydCB0eXBlIHsgU3FsQ29uZCB9IGZyb20gJy4vc3FsJ1xuaW1wb3J0IHR5cGUgeyBQYXJzZWRDb250ZW50UXVlcnkgfSBmcm9tICcuL3F1ZXJ5J1xuXG50eXBlIFJvdyA9IFJlY29yZDxzdHJpbmcsIHVua25vd24+XG5cbmludGVyZmFjZSBXb3JrUm93IHtcbiAgaWQ6IG51bWJlclxuICBkb2N1bWVudF9pZDogc3RyaW5nXG4gIHRpdGxlOiBzdHJpbmdcbiAgYXV0aG9yOiBzdHJpbmcgfCBudWxsXG4gIGRlc2NyaXB0aW9uOiBzdHJpbmcgfCBudWxsXG4gIGNvdmVyX2ltYWdlX3VybDogc3RyaW5nIHwgbnVsbFxuICBjb3Zlcl9pbWFnZV91cmxfZXh0ZXJuYWw6IHN0cmluZyB8IG51bGxcbiAgbmF0dXJlOiBzdHJpbmdcbiAgd29ya190eXBlOiBzdHJpbmcgfCBudWxsXG4gIGxpbms6IHN0cmluZyB8IG51bGxcbiAgc291cmNlX3BsYXRmb3JtOiBzdHJpbmcgfCBudWxsXG4gIHNvdXJjZV91cmw6IHN0cmluZyB8IG51bGxcbiAgc291cmNlX2lkOiBzdHJpbmcgfCBudWxsXG4gIGlzX2ZlYXR1cmVkOiBudW1iZXJcbiAgZmVhdHVyZWRfcHJpb3JpdHk6IG51bWJlclxuICBmZWF0dXJlZF9yZWFzb246IHN0cmluZyB8IG51bGxcbiAgZmVhdHVyZWRfdW50aWw6IG51bWJlciB8IG51bGxcbiAgaXNfYWN0aXZlOiBudW1iZXJcbiAgaXNfYXV0b19pbXBvcnRlZDogbnVtYmVyXG4gIGltcG9ydGVkX2F0OiBudW1iZXIgfCBudWxsXG4gIG9yaWdpbmFsX3B1Ymxpc2hfZGF0ZTogc3RyaW5nIHwgbnVsbFxuICBjcmVhdGVkX2F0OiBudW1iZXJcbiAgdXBkYXRlZF9hdDogbnVtYmVyXG4gIHB1Ymxpc2hlZF9hdDogbnVtYmVyIHwgbnVsbFxufVxuXG5pbnRlcmZhY2UgU3R1ZGVudEJyaWVmIHtcbiAgaWQ6IG51bWJlclxuICBkb2N1bWVudElkOiBzdHJpbmdcbiAgbmFtZTogc3RyaW5nXG59XG5cbmludGVyZmFjZSBXb3JrUm93V2l0aFN0dWRlbnRzIGV4dGVuZHMgV29ya1JvdyB7XG4gIHN0dWRlbnRfaWQ6IG51bWJlciB8IG51bGxcbiAgc3R1ZGVudF9kb2N1bWVudF9pZDogc3RyaW5nIHwgbnVsbFxuICBzdHVkZW50X25hbWU6IHN0cmluZyB8IG51bGxcbiAgc3R1ZGVudF9zb3J0OiBudW1iZXIgfCBudWxsXG59XG5cbmNvbnN0IFdPUktTX1NFTEVDVCA9IGBTRUxFQ1Qgdy4qLCBzLmlkIEFTIHN0dWRlbnRfaWQsIHMuZG9jdW1lbnRfaWQgQVMgc3R1ZGVudF9kb2N1bWVudF9pZCwgcy5uYW1lIEFTIHN0dWRlbnRfbmFtZSwgd3Muc29ydF9vcmRlciBBUyBzdHVkZW50X3NvcnRcbkZST00gd29ya3Mgd1xuTEVGVCBKT0lOIHdvcmtzX3N0dWRlbnRzIHdzIE9OIHdzLndvcmtfaWQgPSB3LmlkXG5MRUZUIEpPSU4gc3R1ZGVudHMgcyBPTiBzLmlkID0gd3Muc3R1ZGVudF9pZGBcblxuLyoqIOihjOe7hO+8iOWQjCB3b3JrIOWkmuihjO+8jOavj+WtpueUn+S4gOihjO+8ieKGkiB3b3JrIEpTT04gKyBzdHVkZW50c1tdICovXG5mdW5jdGlvbiBncm91cFdvcmtKc29uKHJvd3M6IFdvcmtSb3dXaXRoU3R1ZGVudHNbXSwga2V5T2Y6IChyOiBXb3JrUm93V2l0aFN0dWRlbnRzKSA9PiBzdHJpbmcpOiBBcnJheTxSb3cgJiB7IHN0dWRlbnRzOiBTdHVkZW50QnJpZWZbXSB9PiB7XG4gIGNvbnN0IGJ5S2V5ID0gbmV3IE1hcDxzdHJpbmcsIHsgcm93OiBXb3JrUm93V2l0aFN0dWRlbnRzOyBzdHVkZW50czogU3R1ZGVudEJyaWVmW10gfT4oKVxuICBmb3IgKGNvbnN0IHIgb2Ygcm93cykge1xuICAgIGNvbnN0IGtleSA9IGtleU9mKHIpXG4gICAgbGV0IGVudHJ5ID0gYnlLZXkuZ2V0KGtleSlcbiAgICBpZiAoIWVudHJ5KSB7XG4gICAgICBieUtleS5zZXQoa2V5LCAoZW50cnkgPSB7IHJvdzogciwgc3R1ZGVudHM6IFtdIH0pKVxuICAgIH1cbiAgICBpZiAoZW50cnkgJiYgci5zdHVkZW50X2lkICE9PSBudWxsICYmIHIuc3R1ZGVudF9pZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBlbnRyeS5zdHVkZW50cy5wdXNoKHtcbiAgICAgICAgaWQ6IHIuc3R1ZGVudF9pZCxcbiAgICAgICAgZG9jdW1lbnRJZDogci5zdHVkZW50X2RvY3VtZW50X2lkID8/ICcnLFxuICAgICAgICBuYW1lOiByLnN0dWRlbnRfbmFtZSA/PyAnJyxcbiAgICAgIH0pXG4gICAgfVxuICB9XG4gIHJldHVybiBbLi4uYnlLZXkudmFsdWVzKCldLm1hcCgoeyByb3csIHN0dWRlbnRzIH0pID0+IHdvcmtUb0pzb24ocm93LCBzdHVkZW50cykpXG59XG5cbmZ1bmN0aW9uIHRvSXNvKG1zOiBudW1iZXIgfCBudWxsKTogc3RyaW5nIHwgbnVsbCB7XG4gIHJldHVybiBtcyA9PT0gbnVsbCA/IG51bGwgOiBuZXcgRGF0ZShtcykudG9JU09TdHJpbmcoKVxufVxuXG5mdW5jdGlvbiB3b3JrVG9Kc29uKHc6IFdvcmtSb3csIHN0dWRlbnRzOiBTdHVkZW50QnJpZWZbXSk6IFJvdyAmIHsgc3R1ZGVudHM6IFN0dWRlbnRCcmllZltdIH0ge1xuICByZXR1cm4ge1xuICAgIGlkOiB3LmlkLFxuICAgIGRvY3VtZW50SWQ6IHcuZG9jdW1lbnRfaWQsXG4gICAgdGl0bGU6IHcudGl0bGUsXG4gICAgYXV0aG9yOiB3LmF1dGhvciA/PyB1bmRlZmluZWQsXG4gICAgZGVzY3JpcHRpb246IHcuZGVzY3JpcHRpb24gPz8gdW5kZWZpbmVkLFxuICAgIGNvdmVySW1hZ2U6ICh3LmNvdmVyX2ltYWdlX3VybCB8fCB3LmNvdmVyX2ltYWdlX3VybF9leHRlcm5hbClcbiAgICAgID8geyB1cmw6IHcuY292ZXJfaW1hZ2VfdXJsIHx8IHcuY292ZXJfaW1hZ2VfdXJsX2V4dGVybmFsIH1cbiAgICAgIDogdW5kZWZpbmVkLFxuICAgIGNvdmVySW1hZ2VVcmw6IHcuY292ZXJfaW1hZ2VfdXJsX2V4dGVybmFsID8/IHVuZGVmaW5lZCxcbiAgICBvcmlnaW5hbFB1Ymxpc2hEYXRlOiB3Lm9yaWdpbmFsX3B1Ymxpc2hfZGF0ZSA/PyB1bmRlZmluZWQsXG4gICAgbmF0dXJlOiB3Lm5hdHVyZSxcbiAgICB3b3JrVHlwZTogdy53b3JrX3R5cGUgPz8gJ290aGVyJyxcbiAgICBsaW5rOiB3LmxpbmsgPz8gdW5kZWZpbmVkLFxuICAgIGlzQWN0aXZlOiB3LmlzX2FjdGl2ZSA9PT0gMSxcbiAgICBpc0ZlYXR1cmVkOiB3LmlzX2ZlYXR1cmVkID09PSAxLFxuICAgIGZlYXR1cmVkUHJpb3JpdHk6IHcuZmVhdHVyZWRfcHJpb3JpdHksXG4gICAgZmVhdHVyZWRSZWFzb246IHcuZmVhdHVyZWRfcmVhc29uID8/IHVuZGVmaW5lZCxcbiAgICBmZWF0dXJlZFVudGlsOiB0b0lzbyh3LmZlYXR1cmVkX3VudGlsKSxcbiAgICBzb3VyY2VQbGF0Zm9ybTogdy5zb3VyY2VfcGxhdGZvcm0gPz8gdW5kZWZpbmVkLFxuICAgIHNvdXJjZVVybDogdy5zb3VyY2VfdXJsID8/IHVuZGVmaW5lZCxcbiAgICBzb3VyY2VJZDogdy5zb3VyY2VfaWQgPz8gdW5kZWZpbmVkLFxuICAgIGlzQXV0b0ltcG9ydGVkOiB3LmlzX2F1dG9faW1wb3J0ZWQgPT09IDEsXG4gICAgaW1wb3J0ZWRBdDogdG9Jc28ody5pbXBvcnRlZF9hdCksXG4gICAgc3R1ZGVudHMsXG4gICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSh3LmNyZWF0ZWRfYXQpLnRvSVNPU3RyaW5nKCksXG4gICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSh3LnVwZGF0ZWRfYXQpLnRvSVNPU3RyaW5nKCksXG4gICAgcHVibGlzaGVkQXQ6IHRvSXNvKHcucHVibGlzaGVkX2F0KSxcbiAgfVxufVxuXG5jb25zdCBXT1JLX1NPUlRfQ09MVU1OUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgcHVibGlzaGVkX2F0OiAndy5wdWJsaXNoZWRfYXQnLFxuICBjcmVhdGVkX2F0OiAndy5jcmVhdGVkX2F0JyxcbiAgdXBkYXRlZF9hdDogJ3cudXBkYXRlZF9hdCcsXG4gIGlzX2ZlYXR1cmVkOiAndy5pc19mZWF0dXJlZCcsXG4gIGZlYXR1cmVkX3ByaW9yaXR5OiAndy5mZWF0dXJlZF9wcmlvcml0eScsXG59XG5cbmZ1bmN0aW9uIG9yZGVyQnlPZihzb3J0czogQXJyYXk8eyBmaWVsZDogc3RyaW5nOyBkaXI6ICdhc2MnIHwgJ2Rlc2MnIH0+KTogc3RyaW5nIHtcbiAgY29uc3QgcGFydHMgPSBzb3J0cy5tYXAoKHMpID0+IHtcbiAgICBjb25zdCBjb2wgPSBXT1JLX1NPUlRfQ09MVU1OU1tzLmZpZWxkXVxuICAgIHJldHVybiBjb2wgPyBgJHtjb2x9ICR7cy5kaXIudG9VcHBlckNhc2UoKX1gIDogbnVsbFxuICB9KS5maWx0ZXIoKHApOiBwIGlzIHN0cmluZyA9PiBwICE9PSBudWxsKVxuICByZXR1cm4gcGFydHMubGVuZ3RoID4gMCA/IHBhcnRzLmpvaW4oJywgJykgOiAndy5wdWJsaXNoZWRfYXQgREVTQydcbn1cblxuZnVuY3Rpb24gYnVpbGRXaGVyZShxOiBQYXJzZWRDb250ZW50UXVlcnkpOiBTcWxDb25kIHtcbiAgY29uc3QgY29uZHMgPSBbeyBzcWw6ICd3LnB1Ymxpc2hlZF9hdCBJUyBOT1QgTlVMTCcsIHBhcmFtczogW10gfSBhcyBTcWxDb25kXVxuXG4gIGZvciAoY29uc3QgbGVhZiBvZiBxLmxlYXZlcykge1xuICAgIGNvbnN0IFtoZWFkLCByZWxdID0gbGVhZi5wYXRoXG4gICAgaWYgKGhlYWQgPT09ICdpc19hY3RpdmUnKSB7XG4gICAgICBjb25kcy5wdXNoKGNvbmQoJ3cuaXNfYWN0aXZlJywgJ2VxJywgbGVhZi52YWx1ZSA9PT0gJ3RydWUnIHx8IGxlYWYudmFsdWUgPT09ICcxJyA/IDEgOiAwKSlcbiAgICAgIGNvbnRpbnVlXG4gICAgfVxuICAgIGlmIChoZWFkID09PSAnbmF0dXJlJykge1xuICAgICAgY29uZHMucHVzaChjb25kKCd3Lm5hdHVyZScsICdlcScsIGxlYWYudmFsdWUpKVxuICAgICAgY29udGludWVcbiAgICB9XG4gICAgaWYgKGhlYWQgPT09ICd3b3JrX3R5cGUnKSB7XG4gICAgICBjb25kcy5wdXNoKGNvbmQoJ3cud29ya190eXBlJywgJ2VxJywgbGVhZi52YWx1ZSkpXG4gICAgICBjb250aW51ZVxuICAgIH1cbiAgICBpZiAoaGVhZCA9PT0gJ3NvdXJjZV9wbGF0Zm9ybScpIHtcbiAgICAgIGNvbmRzLnB1c2goY29uZCgndy5zb3VyY2VfcGxhdGZvcm0nLCAnZXEnLCBsZWFmLnZhbHVlKSlcbiAgICAgIGNvbnRpbnVlXG4gICAgfVxuICAgIGlmIChoZWFkID09PSAnaXNfZmVhdHVyZWQnKSB7XG4gICAgICBjb25kcy5wdXNoKGNvbmQoJ3cuaXNfZmVhdHVyZWQnLCAnZXEnLCBsZWFmLnZhbHVlID09PSAndHJ1ZScgfHwgbGVhZi52YWx1ZSA9PT0gJzEnID8gMSA6IDApKVxuICAgICAgY29udGludWVcbiAgICB9XG4gICAgaWYgKGhlYWQgPT09ICdpZCcgJiYgbGVhZi5vcCA9PT0gJ25lJykge1xuICAgICAgY29uZHMucHVzaChjb25kKCd3LmlkJywgJ25lJywgcGFyc2VJbnQobGVhZi52YWx1ZSwgMTApKSlcbiAgICAgIGNvbnRpbnVlXG4gICAgfVxuICAgIGlmIChoZWFkID09PSAnaWQnICYmIGxlYWYub3AgPT09ICdlcScpIHtcbiAgICAgIGNvbmRzLnB1c2goY29uZCgndy5pZCcsICdlcScsIHBhcnNlSW50KGxlYWYudmFsdWUsIDEwKSkpXG4gICAgICBjb250aW51ZVxuICAgIH1cbiAgICBpZiAoaGVhZCA9PT0gJ2RvY3VtZW50X2lkJyAmJiBsZWFmLm9wID09PSAnZXEnKSB7XG4gICAgICBjb25kcy5wdXNoKGNvbmQoJ3cuZG9jdW1lbnRfaWQnLCAnZXEnLCBsZWFmLnZhbHVlKSlcbiAgICAgIGNvbnRpbnVlXG4gICAgfVxuICAgIGlmIChoZWFkID09PSAnYXV0aG9yJyAmJiBsZWFmLm9wID09PSAnZXEnKSB7XG4gICAgICBjb25kcy5wdXNoKGNvbmQoJ3cuYXV0aG9yJywgJ2VxJywgbGVhZi52YWx1ZSkpXG4gICAgICBjb250aW51ZVxuICAgIH1cbiAgICBpZiAoaGVhZCA9PT0gJ2ZlYXR1cmVkX3VudGlsJyAmJiByZWwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gZmVhdHVyZWRVbnRpbCDnqpflj6PnibnliKTnlLEgJGFuZCDnu4TlpITnkIbvvIzov5nph4zot7Pov4foo7jlrZfmrrVcbiAgICAgIGNvbnRpbnVlXG4gICAgfVxuICAgIHZvaWQgcmVsXG4gIH1cblxuICAvLyAkb3Ig57uE77yadGl0bGUvYXV0aG9yL2Rlc2NyaXB0aW9uL3N0dWRlbnRzLm5hbWUgY29udGFpbnNpXG4gIGZvciAoY29uc3QgZ3JvdXAgb2YgcS5vckdyb3Vwcykge1xuICAgIGNvbnN0IG9ycyA9IGdyb3VwLm1hcCgobGVhZikgPT4ge1xuICAgICAgY29uc3QgZmllbGQgPSBsZWFmLnBhdGhbbGVhZi5wYXRoLmxlbmd0aCAtIDFdXG4gICAgICBpZiAoZmllbGQgPT09ICd0aXRsZScpIHJldHVybiBjb25kKCd3LnRpdGxlJywgJ2NvbnRhaW5zaScsIGxlYWYudmFsdWUpXG4gICAgICBpZiAoZmllbGQgPT09ICdhdXRob3InKSByZXR1cm4gY29uZCgndy5hdXRob3InLCAnY29udGFpbnNpJywgbGVhZi52YWx1ZSlcbiAgICAgIGlmIChmaWVsZCA9PT0gJ2Rlc2NyaXB0aW9uJykgcmV0dXJuIGNvbmQoJ0xPV0VSKHcuZGVzY3JpcHRpb24pJywgJ2NvbnRhaW5zaScsIGxlYWYudmFsdWUpXG4gICAgICBpZiAoZmllbGQgPT09ICduYW1lJykgcmV0dXJuIGNvbmQoJ3MubmFtZScsICdjb250YWluc2knLCBsZWFmLnZhbHVlKVxuICAgICAgcmV0dXJuIG51bGxcbiAgICB9KS5maWx0ZXIoKHgpOiB4IGlzIE5vbk51bGxhYmxlPHR5cGVvZiB4PiA9PiB4ICE9PSBudWxsKVxuICAgIGNvbmRzLnB1c2gob3JBbnkob3JzKSlcbiAgfVxuXG4gIC8vICRhbmQg57uE77yaZmVhdHVyZWRVbnRpbCDnqpflj6PvvIgkbnVsbCBPUiAkZ3RlIG5vd++8iSsg5bmz6ZO65Y+25a2QXG4gIGZvciAoY29uc3QgYWcgb2YgcS5hbmRHcm91cHMpIHtcbiAgICBmb3IgKGNvbnN0IGxlYWYgb2YgYWcubGVhdmVzKSB7XG4gICAgICBjb25zdCBbaGVhZF0gPSBsZWFmLnBhdGhcbiAgICAgIGlmIChoZWFkID09PSAnaXNfYWN0aXZlJyB8fCBoZWFkID09PSAnaXNfZmVhdHVyZWQnKSB7XG4gICAgICAgIGNvbmRzLnB1c2goY29uZChgdy4ke2NhbWVsVG9TbmFrZShoZWFkKX1gLCAnZXEnLCBsZWFmLnZhbHVlID09PSAndHJ1ZScgfHwgbGVhZi52YWx1ZSA9PT0gJzEnID8gMSA6IDApKVxuICAgICAgfSBlbHNlIGlmIChoZWFkID09PSAnaWQnICYmIGxlYWYub3AgPT09ICduZScpIHtcbiAgICAgICAgY29uZHMucHVzaChjb25kKCd3LmlkJywgJ25lJywgcGFyc2VJbnQobGVhZi52YWx1ZSwgMTApKSlcbiAgICAgIH0gZWxzZSBpZiAoaGVhZCA9PT0gJ2F1dGhvcicgJiYgbGVhZi5vcCA9PT0gJ2VxJykge1xuICAgICAgICBjb25kcy5wdXNoKGNvbmQoJ3cuYXV0aG9yJywgJ2VxJywgbGVhZi52YWx1ZSkpXG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3Qgb2cgb2YgYWcub3JHcm91cHMpIHtcbiAgICAgIC8vIOW9ouWmgiBbJG9yWzBdW2ZlYXR1cmVkVW50aWxdWyRudWxsXSwgJG9yWzFdW2ZlYXR1cmVkVW50aWxdWyRndGVdXSDnmoTnqpflj6NcbiAgICAgIGNvbnN0IHdpbmRvd09yczogU3FsQ29uZFtdID0gW11cbiAgICAgIGxldCBzYXdXaW5kb3cgPSBmYWxzZVxuICAgICAgZm9yIChjb25zdCBsZWFmIG9mIG9nKSB7XG4gICAgICAgIGNvbnN0IGZpZWxkID0gbGVhZi5wYXRoW2xlYWYucGF0aC5sZW5ndGggLSAxXVxuICAgICAgICBpZiAoZmllbGQgIT09ICdmZWF0dXJlZF91bnRpbCcpIGNvbnRpbnVlXG4gICAgICAgIHNhd1dpbmRvdyA9IHRydWVcbiAgICAgICAgLy8g6Kej5p6Q5Zmo5Lii5byD5LqGICRudWxsIOagh+iusO+8m+eUqOOAjOWPtuWtkOWAvCA9PSAnJyDkuJQgb3AgZXHjgI3ml6Dms5Xooajovr7igJTigJTmlLnkuLrnuqblrprvvJpcbiAgICAgICAgLy8gJG51bGwg5Y+25a2QIHZhbHVlIOS4uuepuuS4suOAgui/memHjOaMiSBvcCDliIbmtL7jgIJcbiAgICAgICAgaWYgKGxlYWYub3AgPT09ICdndGUnKSB3aW5kb3dPcnMucHVzaCh7IHNxbDogJ3cuZmVhdHVyZWRfdW50aWwgPj0gPycsIHBhcmFtczogW0RhdGUucGFyc2UobGVhZi52YWx1ZSldIH0pXG4gICAgICAgIGVsc2UgaWYgKGxlYWYub3AgPT09ICdlcScgJiYgbGVhZi52YWx1ZSA9PT0gJycpIHdpbmRvd09ycy5wdXNoKHsgc3FsOiAndy5mZWF0dXJlZF91bnRpbCBJUyBOVUxMJywgcGFyYW1zOiBbXSB9KVxuICAgICAgICBlbHNlIGlmIChsZWFmLm9wID09PSAnZXEnKSB3aW5kb3dPcnMucHVzaCh7IHNxbDogJ3cuZmVhdHVyZWRfdW50aWwgSVMgTlVMTCcsIHBhcmFtczogW10gfSlcbiAgICAgIH1cbiAgICAgIGlmIChzYXdXaW5kb3cgJiYgd2luZG93T3JzLmxlbmd0aCA+IDApIGNvbmRzLnB1c2gob3JBbnkod2luZG93T3JzKSlcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYW5kQWxsKGNvbmRzKVxufVxuXG5leHBvcnQgY29uc3Qgd29ya3NSb3V0ZXMgPSBuZXcgSG9ubzx7IEJpbmRpbmdzOiBFbnYgfT4oKVxuXG5hc3luYyBmdW5jdGlvbiBmZXRjaFdvcmtSb3dzKGRiOiBEMURhdGFiYXNlLCB3aGVyZVNxbDogU3FsQ29uZCwgb3JkZXJTcWw6IHN0cmluZywgbGltT2ZmOiBTcWxDb25kKTogUHJvbWlzZTwoV29ya1Jvd1dpdGhTdHVkZW50cylbXT4ge1xuICBjb25zdCBzdG10ID0gZGIucHJlcGFyZShgJHtXT1JLU19TRUxFQ1R9IFdIRVJFICR7d2hlcmVTcWwuc3FsfSBPUkRFUiBCWSAke29yZGVyU3FsfSwgd3Muc29ydF9vcmRlciBBU0MgJHtsaW1PZmYuc3FsfWApXG4gIGNvbnN0IG91dCA9IGF3YWl0IHN0bXQuYmluZChbLi4ud2hlcmVTcWwucGFyYW1zLCAuLi5saW1PZmYucGFyYW1zXSkuYWxsPFdvcmtSb3dXaXRoU3R1ZGVudHM+KClcbiAgcmV0dXJuIG91dC5yZXN1bHRzID8/IFtdXG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNvdW50V29ya3MoZGI6IEQxRGF0YWJhc2UsIHdoZXJlU3FsOiBTcWxDb25kKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3Qgc3RtdCA9IGRiLnByZXBhcmUoYFNFTEVDVCBDT1VOVChESVNUSU5DVCB3LmlkKSBBUyBuIEZST00gd29ya3MgdyBMRUZUIEpPSU4gd29ya3Nfc3R1ZGVudHMgd3MgT04gd3Mud29ya19pZCA9IHcuaWQgTEVGVCBKT0lOIHN0dWRlbnRzIHMgT04gcy5pZCA9IHdzLnN0dWRlbnRfaWQgV0hFUkUgJHt3aGVyZVNxbC5zcWx9YClcbiAgY29uc3Qgcm93ID0gYXdhaXQgc3RtdC5iaW5kKC4uLndoZXJlU3FsLnBhcmFtcykuZmlyc3Q8eyBuOiBudW1iZXIgfT4oKVxuICByZXR1cm4gcm93Py5uID8/IDBcbn1cblxud29ya3NSb3V0ZXMuZ2V0KCcvd29ya3MnLCBhc3luYyAoYykgPT4ge1xuICBjb25zdCBxID0gcGFyc2VDb250ZW50UXVlcnkobmV3IFVSTChjLnJlcS51cmwpKVxuXG4gIC8vIHN0dWRlbnRzW2lkXVskaW5dIOW5s+mTuuWPtuWtkO+8iGdldFdvcmtzQnlTdHVkZW50SWRz77yJ77ya5Lu75LiA5ZG95Lit5Y2z5Y+vXG4gIGNvbnN0IHN0dWRlbnRJbkxlYXZlcyA9IHEubGVhdmVzLmZpbHRlcigobCkgPT4gbC5wYXRoWzBdID09PSAnc3R1ZGVudHMnICYmIGwucGF0aFsxXSA9PT0gJ2lkJylcbiAgbGV0IHdoZXJlU3FsID0gYnVpbGRXaGVyZShxKVxuICBpZiAoc3R1ZGVudEluTGVhdmVzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBpZHMgPSBzdHVkZW50SW5MZWF2ZXMubWFwKChsKSA9PiBwYXJzZUludChsLnZhbHVlLCAxMCkpLmZpbHRlcigobikgPT4gIU51bWJlci5pc05hTihuKSlcbiAgICB3aGVyZVNxbCA9IGFuZEFsbChbd2hlcmVTcWwsIG9yQW55KGlkcy5tYXAoKGlkKSA9PiBjb25kKCd3cy5zdHVkZW50X2lkJywgJ2VxJywgaWQpKSldKVxuICB9XG5cbiAgY29uc3Qgb2Zmc2V0ID0gcS5zdGFydCA/PyAocS5wYWdlIC0gMSkgKiBxLnBhZ2VTaXplXG4gIGNvbnN0IHNpemUgPSBxLmxpbWl0ID8/IHEucGFnZVNpemVcblxuICBjb25zdCByb3dzID0gYXdhaXQgZmV0Y2hXb3JrUm93cyhjLmVudi5EQiwgd2hlcmVTcWwsIG9yZGVyQnlPZihxLnNvcnRzKSwgbGltaXRPZmZzZXQoc2l6ZSwgb2Zmc2V0KSlcbiAgY29uc3QgdG90YWwgPSBhd2FpdCBjb3VudFdvcmtzKGMuZW52LkRCLCB3aGVyZVNxbClcblxuICAvLyDooYwg4oaSIOaMiSB3b3JrIOiBmuWQiO+8iEpPSU4g5bGV5byA55qE6KGM5bqP5Y2z5o6S5bqP6ZSu5bqP77yJXG4gIGNvbnN0IGRhdGEgPSBncm91cFdvcmtKc29uKHJvd3MsIChyKSA9PiBgJHtyLmlkfWApXG4gIHJldHVybiBva1BhZ2luYXRlZChkYXRhLCBwYWdpbmF0aW9uT2YocS5wYWdlLCBxLnBhZ2VTaXplLCB0b3RhbCkpXG59KVxuXG53b3Jrc1JvdXRlcy5nZXQoJy93b3Jrcy86a2V5JywgYXN5bmMgKGMpID0+IHtcbiAgY29uc3Qga2V5ID0gYy5yZXEucGFyYW0oJ2tleScpLnRyaW0oKVxuICBjb25zdCBudW1lcmljID0gL15cXGQrJC8udGVzdChrZXkpXG4gIGNvbnN0IHdoZXJlU3FsID0gYW5kQWxsKFtcbiAgICB7IHNxbDogJ3cucHVibGlzaGVkX2F0IElTIE5PVCBOVUxMJywgcGFyYW1zOiBbXSB9LFxuICAgIG51bWVyaWMgPyBjb25kKCd3LmlkJywgJ2VxJywgcGFyc2VJbnQoa2V5LCAxMCkpIDogY29uZCgndy5kb2N1bWVudF9pZCcsICdlcScsIGtleSksXG4gIF0pXG4gIGNvbnN0IHJvd3MgPSBhd2FpdCBmZXRjaFdvcmtSb3dzKGMuZW52LkRCLCB3aGVyZVNxbCwgJ3cucHVibGlzaGVkX2F0IERFU0MnLCBsaW1pdE9mZnNldCg1MCwgMCkpXG4gIGNvbnN0IGRhdGEgPSBncm91cFdvcmtKc29uKHJvd3MsIChyKSA9PiBgJHtyLmlkfWApXG4gIGlmIChkYXRhLmxlbmd0aCA9PT0gMCkgcmV0dXJuIGZhaWwoNDA0LCAnbm90X2ZvdW5kJylcbiAgcmV0dXJuIG9rKGRhdGFbMF0pXG59KVxuIl0sImZpbGUiOiIvVXNlcnMva2FyYS9Db2RlL1NjaGFsZS1MaWJyYXJ5L3NlcnZlci9zcmMvY29udGVudC93b3Jrcy50cyJ9
