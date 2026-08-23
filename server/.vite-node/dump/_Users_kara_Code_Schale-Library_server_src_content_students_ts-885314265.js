// /Users/kara/Code/Schale-Library/server/src/content/students.ts
const __vite_ssr_import_0__ = await __vite_ssr_import__("hono", {"importedNames":["Hono"]});
const __vite_ssr_import_1__ = await __vite_ssr_import__("/src/lib/respond.ts", {"importedNames":["ok","okPaginated","fail","paginationOf"]});
const __vite_ssr_import_2__ = await __vite_ssr_import__("/src/content/query.ts", {"importedNames":["parseContentQuery"]});
const __vite_ssr_import_3__ = await __vite_ssr_import__("/src/content/sql.ts", {"importedNames":["cond","andAll","orAny","limitOffset"]});




const STUDENTS_SELECT = `SELECT st.*, sc.id AS school_id2, sc.name_json AS school_name, sc.document_id AS school_document_id, sc.slug AS school_slug, sc.color AS school_color
FROM students st LEFT JOIN schools sc ON sc.id = st.school_id`;
function studentToJson(r) {
  return {
    id: r.id,
    documentId: r.document_id,
    slug: r.slug,
    name: r.name,
    organization: r.organization ?? void 0,
    wikiUrl: r.wiki_url ?? void 0,
    avatar: r.avatar_url ? { url: r.avatar_url } : void 0,
    school_ref: r.school_name && r.school_slug ? {
      id: r.school_id,
      documentId: r.school_document_id,
      name: JSON.parse(r.school_name)["zh-Hans"] || Object.values(JSON.parse(r.school_name))[0] || "",
      slug: r.school_slug,
      color: r.school_color ?? void 0
    } : null,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
    publishedAt: r.published_at === null ? null : new Date(r.published_at).toISOString()
  };
}
const STUDENT_SORT_COLUMNS = {
  name: "st.name",
  updated_at: "st.updated_at",
  created_at: "st.created_at"
};
function orderByOf(sorts) {
  const parts = sorts.map((s) => {
    const col = STUDENT_SORT_COLUMNS[s.field];
    return col ? `${col} ${s.dir.toUpperCase()}` : null;
  }).filter((p) => p !== null);
  return parts.length > 0 ? parts.join(", ") : "st.name ASC";
}
function buildWhere(q) {
  const conds = [{ sql: "st.published_at IS NOT NULL", params: [] }];
  for (const leaf of q.leaves) {
    const [head] = leaf.path;
    if (head === "id") {
      continue;
    }
    if (head === "document_id" && leaf.op === "eq") {
      conds.push(__vite_ssr_import_3__.cond("st.document_id", "eq", leaf.value));
      continue;
    }
    if ((head === "name" || head === "organization") && leaf.op === "containsi") {
      conds.push(__vite_ssr_import_3__.cond(head === "name" ? "LOWER(st.name)" : "LOWER(st.organization)", "containsi", leaf.value));
      continue;
    }
  }
  for (const ag of q.andGroups) {
    for (const og of ag.orGroups) {
      const ors = [];
      for (const leaf of og) {
        const [head, rel] = leaf.path;
        if ((head === "name" || head === "organization") && leaf.op === "containsi") {
          ors.push(__vite_ssr_import_3__.cond(head === "name" ? "LOWER(st.name)" : "LOWER(st.organization)", "containsi", leaf.value));
        } else if (head === "school_ref" && rel === "slug" && leaf.op === "eq") {
          ors.push(__vite_ssr_import_3__.cond("sc.slug", "eq", leaf.value));
        } else if (head === "school" && leaf.op === "eq") {
          ors.push(__vite_ssr_import_3__.cond("sc.slug", "eq", leaf.value));
        } else if (head === "bio" && leaf.op === "containsi") {
          continue;
        }
      }
      conds.push(__vite_ssr_import_3__.orAny(ors));
    }
  }
  for (const group of q.orGroups) {
    const ors = [];
    for (const leaf of group) {
      const field = leaf.path[leaf.path.length - 1];
      if (field === "name") ors.push(__vite_ssr_import_3__.cond("LOWER(st.name)", "containsi", leaf.value));
      else if (field === "organization") ors.push(__vite_ssr_import_3__.cond("LOWER(st.organization)", "containsi", leaf.value));
      else if (field === "school") ors.push(__vite_ssr_import_3__.cond("sc.name_json", "containsi", leaf.value));
    }
    conds.push(__vite_ssr_import_3__.orAny(ors));
  }
  return __vite_ssr_import_3__.andAll(conds);
}
function studentIdInWhere(q) {
  const ids = [];
  for (const leaf of q.leaves) {
    if (leaf.path[0] === "id" && leaf.op === "eq") ids.push(parseInt(leaf.value, 10));
  }
  if (ids.length === 0) return null;
  return __vite_ssr_import_3__.orAny(ids.map((id) => __vite_ssr_import_3__.cond("st.id", "eq", id)));
}
const studentsRoutes = new __vite_ssr_import_0__.Hono();
Object.defineProperty(__vite_ssr_exports__, "studentsRoutes", { enumerable: true, configurable: true, get(){ return studentsRoutes }});
async function fetchStudentRows(db, whereSql, orderSql, limOff) {
  const stmt = db.prepare(`${STUDENTS_SELECT} WHERE ${whereSql.sql} ORDER BY ${orderSql} ${limOff.sql}`);
  const out = await stmt.bind([...whereSql.params, ...limOff.params]).all();
  return out.results ?? [];
}
async function countStudents(db, whereSql) {
  const stmt = db.prepare(`SELECT COUNT(*) AS n FROM students st LEFT JOIN schools sc ON sc.id = st.school_id WHERE ${whereSql.sql}`);
  const row = await stmt.bind(...whereSql.params).first();
  return row?.n ?? 0;
}
studentsRoutes.get("/students", async (c) => {
  const q = __vite_ssr_import_2__.parseContentQuery(new URL(c.req.url));
  let whereSql = buildWhere(q);
  const inWhere = studentIdInWhere(q);
  if (inWhere) whereSql = __vite_ssr_import_3__.andAll([whereSql, inWhere]);
  const offset = q.start ?? (q.page - 1) * q.pageSize;
  const size = q.limit ?? q.pageSize;
  const [rows, total] = await Promise.all([
    fetchStudentRows(c.env.DB, whereSql, orderByOf(q.sorts), __vite_ssr_import_3__.limitOffset(size, offset)),
    countStudents(c.env.DB, whereSql)
  ]);
  return __vite_ssr_import_1__.okPaginated(rows.map(studentToJson), __vite_ssr_import_1__.paginationOf(q.page, q.pageSize, total));
});
studentsRoutes.get("/students/:key", async (c) => {
  const key = c.req.param("key").trim();
  const numeric = /^\d+$/.test(key);
  const whereSql = __vite_ssr_import_3__.andAll([
    { sql: "st.published_at IS NOT NULL", params: [] },
    numeric ? __vite_ssr_import_3__.cond("st.id", "eq", parseInt(key, 10)) : __vite_ssr_import_3__.cond("st.document_id", "eq", key)
  ]);
  const rows = await fetchStudentRows(c.env.DB, whereSql, "st.name ASC", __vite_ssr_import_3__.limitOffset(1, 0));
  if (rows.length === 0) return __vite_ssr_import_1__.fail(404, "not_found");
  return __vite_ssr_import_1__.ok(studentToJson(rows[0]));
});

//# sourceMappingSource=vite-node
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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RixDQUFDO0FBRUQsZUFBZSxJQUFJLGtCQUFrQixPQUFPLE1BQU07QUFDaEQsUUFBTSxNQUFNLEVBQUUsSUFBSSxNQUFNLEtBQUssRUFBRSxLQUFLO0FBQ3BDLFFBQU0sVUFBVSxRQUFRLEtBQUssR0FBRztBQUNoQyxRQUFNLFdBQVcsNkJBQU87QUFBQSxJQUN0QixFQUFFLEtBQUssK0JBQStCLFFBQVEsQ0FBQyxFQUFFO0FBQUEsSUFDakQsVUFBVSwyQkFBSyxTQUFTLE1BQU0sU0FBUyxLQUFLLEVBQUUsQ0FBQyxJQUFJLDJCQUFLLGtCQUFrQixNQUFNLEdBQUc7QUFBQSxFQUNyRixDQUFDO0FBQ0QsUUFBTSxPQUFPLE1BQU0saUJBQWlCLEVBQUUsSUFBSSxJQUFJLFVBQVUsZUFBZSxrQ0FBWSxHQUFHLENBQUMsQ0FBQztBQUN4RixNQUFJLEtBQUssV0FBVyxFQUFHLFFBQU8sMkJBQUssS0FBSyxXQUFXO0FBQ25ELFNBQU8seUJBQUcsY0FBYyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQ2xDLENBQUMiLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbInN0dWRlbnRzLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICog5YWs5byA5YaF5a65IEFQSSDigJQgc3R1ZGVudHMg5Z+f77yI55im6Lqr5a2m55Sf6KGo77yJ44CCXG4gKlxuICog56uv54K577yI5a+55ouNIGZyb250ZW5kL3Rlc3RzL2NvbnRyYWN0cy9zdHVkZW50cy50cyArIGZyb250ZW5kL3NyYy9saWIvYXBpL3N0dWRlbnRzLnRz77yJ77yaXG4gKiAtIEdFVCAvc3R1ZGVudHPvvJrliJfooajvvJtuYW1lL29yZ2FuaXphdGlvbiBjb250YWluc2njgIFzY2hvb2xfcmVmLnNsdWd8c2Nob29sIGVx44CBXG4gKiAgIGZpbHRlcnNbaWRdWyRpbl3jgIFzb3J0IG5hbWU6YXNjIC8gdXBkYXRlZEF0OmRlc2PjgIHliIbpobVcbiAqIC0gR0VUIC9zdHVkZW50cy86a2V577ya6K+m5oOF77yI5pWw5a2XIOKGkiBpZO+8jOWQpuWImSBkb2N1bWVudElk77yJXG4gKlxuICogc2Nob29sX3JlZiDovpPlh7ogSk9JTiBzY2hvb2xzIOeahCB7aWQsIGRvY3VtZW50SWQsIG5hbWUsIHNsdWcsIGNvbG9yfe+8m1xuICogYXZhdGFyLnVybCDlj5YgYXZhdGFyX3VybCDliJfvvJtzY2hvb2wg5pen5p6a5Li+5YiX5bey5LiN5a2Y5Zyo77yMc2Nob29sIOetm+mAieS7heWMuemFjVxuICogc2Nob29sX3JlZi5zbHVn77yIc2NoZW1hIHYyIOaUtuaVm++8ieOAglxuICovXG5pbXBvcnQgeyBIb25vIH0gZnJvbSAnaG9ubydcbmltcG9ydCB0eXBlIHsgRW52IH0gZnJvbSAnLi4vaW5kZXgnXG5pbXBvcnQgeyBvaywgb2tQYWdpbmF0ZWQsIGZhaWwsIHBhZ2luYXRpb25PZiB9IGZyb20gJy4uL2xpYi9yZXNwb25kJ1xuaW1wb3J0IHsgcGFyc2VDb250ZW50UXVlcnkgfSBmcm9tICcuL3F1ZXJ5J1xuaW1wb3J0IHR5cGUgeyBQYXJzZWRDb250ZW50UXVlcnkgfSBmcm9tICcuL3F1ZXJ5J1xuaW1wb3J0IHsgY29uZCwgYW5kQWxsLCBvckFueSwgbGltaXRPZmZzZXQgfSBmcm9tICcuL3NxbCdcbmltcG9ydCB0eXBlIHsgU3FsQ29uZCB9IGZyb20gJy4vc3FsJ1xuXG50eXBlIFJvdyA9IFJlY29yZDxzdHJpbmcsIHVua25vd24+XG5cbmludGVyZmFjZSBTdHVkZW50Um93IHtcbiAgaWQ6IG51bWJlclxuICBkb2N1bWVudF9pZDogc3RyaW5nXG4gIHNsdWc6IHN0cmluZ1xuICBuYW1lOiBzdHJpbmdcbiAgYXZhdGFyX3VybDogc3RyaW5nIHwgbnVsbFxuICBvcmdhbml6YXRpb246IHN0cmluZyB8IG51bGxcbiAgd2lraV91cmw6IHN0cmluZyB8IG51bGxcbiAgc2Nob29sX2lkOiBudW1iZXIgfCBudWxsXG4gIHNjaG9vbF9uYW1lOiBzdHJpbmcgfCBudWxsXG4gIHNjaG9vbF9kb2N1bWVudF9pZDogc3RyaW5nIHwgbnVsbFxuICBzY2hvb2xfc2x1Zzogc3RyaW5nIHwgbnVsbFxuICBzY2hvb2xfY29sb3I6IHN0cmluZyB8IG51bGxcbiAgY3JlYXRlZF9hdDogbnVtYmVyXG4gIHVwZGF0ZWRfYXQ6IG51bWJlclxuICBwdWJsaXNoZWRfYXQ6IG51bWJlciB8IG51bGxcbn1cblxuY29uc3QgU1RVREVOVFNfU0VMRUNUID0gYFNFTEVDVCBzdC4qLCBzYy5pZCBBUyBzY2hvb2xfaWQyLCBzYy5uYW1lX2pzb24gQVMgc2Nob29sX25hbWUsIHNjLmRvY3VtZW50X2lkIEFTIHNjaG9vbF9kb2N1bWVudF9pZCwgc2Muc2x1ZyBBUyBzY2hvb2xfc2x1Zywgc2MuY29sb3IgQVMgc2Nob29sX2NvbG9yXG5GUk9NIHN0dWRlbnRzIHN0IExFRlQgSk9JTiBzY2hvb2xzIHNjIE9OIHNjLmlkID0gc3Quc2Nob29sX2lkYFxuXG5mdW5jdGlvbiBzdHVkZW50VG9Kc29uKHI6IFN0dWRlbnRSb3cpOiBSb3cge1xuICByZXR1cm4ge1xuICAgIGlkOiByLmlkLFxuICAgIGRvY3VtZW50SWQ6IHIuZG9jdW1lbnRfaWQsXG4gICAgc2x1Zzogci5zbHVnLFxuICAgIG5hbWU6IHIubmFtZSxcbiAgICBvcmdhbml6YXRpb246IHIub3JnYW5pemF0aW9uID8/IHVuZGVmaW5lZCxcbiAgICB3aWtpVXJsOiByLndpa2lfdXJsID8/IHVuZGVmaW5lZCxcbiAgICBhdmF0YXI6IHIuYXZhdGFyX3VybCA/IHsgdXJsOiByLmF2YXRhcl91cmwgfSA6IHVuZGVmaW5lZCxcbiAgICBzY2hvb2xfcmVmOlxuICAgICAgci5zY2hvb2xfbmFtZSAmJiByLnNjaG9vbF9zbHVnXG4gICAgICAgID8ge1xuICAgICAgICAgICAgaWQ6IHIuc2Nob29sX2lkLFxuICAgICAgICAgICAgZG9jdW1lbnRJZDogci5zY2hvb2xfZG9jdW1lbnRfaWQsXG4gICAgICAgICAgICBuYW1lOiBKU09OLnBhcnNlKHIuc2Nob29sX25hbWUpWyd6aC1IYW5zJ10gfHwgT2JqZWN0LnZhbHVlcyhKU09OLnBhcnNlKHIuc2Nob29sX25hbWUpKVswXSB8fCAnJyxcbiAgICAgICAgICAgIHNsdWc6IHIuc2Nob29sX3NsdWcsXG4gICAgICAgICAgICBjb2xvcjogci5zY2hvb2xfY29sb3IgPz8gdW5kZWZpbmVkLFxuICAgICAgICAgIH1cbiAgICAgICAgOiBudWxsLFxuICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoci5jcmVhdGVkX2F0KS50b0lTT1N0cmluZygpLFxuICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoci51cGRhdGVkX2F0KS50b0lTT1N0cmluZygpLFxuICAgIHB1Ymxpc2hlZEF0OiByLnB1Ymxpc2hlZF9hdCA9PT0gbnVsbCA/IG51bGwgOiBuZXcgRGF0ZShyLnB1Ymxpc2hlZF9hdCkudG9JU09TdHJpbmcoKSxcbiAgfVxufVxuXG5jb25zdCBTVFVERU5UX1NPUlRfQ09MVU1OUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgbmFtZTogJ3N0Lm5hbWUnLFxuICB1cGRhdGVkX2F0OiAnc3QudXBkYXRlZF9hdCcsXG4gIGNyZWF0ZWRfYXQ6ICdzdC5jcmVhdGVkX2F0Jyxcbn1cblxuZnVuY3Rpb24gb3JkZXJCeU9mKHNvcnRzOiBBcnJheTx7IGZpZWxkOiBzdHJpbmc7IGRpcjogJ2FzYycgfCAnZGVzYycgfT4pOiBzdHJpbmcge1xuICBjb25zdCBwYXJ0cyA9IHNvcnRzXG4gICAgLm1hcCgocykgPT4ge1xuICAgICAgY29uc3QgY29sID0gU1RVREVOVF9TT1JUX0NPTFVNTlNbcy5maWVsZF1cbiAgICAgIHJldHVybiBjb2wgPyBgJHtjb2x9ICR7cy5kaXIudG9VcHBlckNhc2UoKX1gIDogbnVsbFxuICAgIH0pXG4gICAgLmZpbHRlcigocCk6IHAgaXMgc3RyaW5nID0+IHAgIT09IG51bGwpXG4gIHJldHVybiBwYXJ0cy5sZW5ndGggPiAwID8gcGFydHMuam9pbignLCAnKSA6ICdzdC5uYW1lIEFTQydcbn1cblxuZnVuY3Rpb24gYnVpbGRXaGVyZShxOiBQYXJzZWRDb250ZW50UXVlcnkpOiBTcWxDb25kIHtcbiAgY29uc3QgY29uZHM6IFNxbENvbmRbXSA9IFt7IHNxbDogJ3N0LnB1Ymxpc2hlZF9hdCBJUyBOT1QgTlVMTCcsIHBhcmFtczogW10gfV1cblxuICBmb3IgKGNvbnN0IGxlYWYgb2YgcS5sZWF2ZXMpIHtcbiAgICBjb25zdCBbaGVhZF0gPSBsZWFmLnBhdGhcbiAgICBpZiAoaGVhZCA9PT0gJ2lkJykge1xuICAgICAgLy8gZmlsdGVyc1tpZF1bJGluXVswXT3igKYg5bmz6ZO65aSa5Liq5ZCM6Lev5b6E5Y+25a2QIOKGkiBPUlxuICAgICAgY29udGludWUgLy8g55SxIGNvbGxlY3RJbiDlpITnkIZcbiAgICB9XG4gICAgaWYgKGhlYWQgPT09ICdkb2N1bWVudF9pZCcgJiYgbGVhZi5vcCA9PT0gJ2VxJykge1xuICAgICAgY29uZHMucHVzaChjb25kKCdzdC5kb2N1bWVudF9pZCcsICdlcScsIGxlYWYudmFsdWUpKVxuICAgICAgY29udGludWVcbiAgICB9XG4gICAgaWYgKChoZWFkID09PSAnbmFtZScgfHwgaGVhZCA9PT0gJ29yZ2FuaXphdGlvbicpICYmIGxlYWYub3AgPT09ICdjb250YWluc2knKSB7XG4gICAgICBjb25kcy5wdXNoKGNvbmQoaGVhZCA9PT0gJ25hbWUnID8gJ0xPV0VSKHN0Lm5hbWUpJyA6ICdMT1dFUihzdC5vcmdhbml6YXRpb24pJywgJ2NvbnRhaW5zaScsIGxlYWYudmFsdWUpKVxuICAgICAgY29udGludWVcbiAgICB9XG4gIH1cblxuICAvLyAkYW5kIOe7hO+8mmdldFN0dWRlbnRzIOeahCBxdWVyee+8iCRvcltuYW1lfG9yZ2FuaXphdGlvbl0gY29udGFpbnNp77yJ5LiOIHNjaG9vbO+8iCRvcltzY2hvb2xfcmVmLnNsdWd8c2Nob29sXSBlce+8iVxuICBmb3IgKGNvbnN0IGFnIG9mIHEuYW5kR3JvdXBzKSB7XG4gICAgZm9yIChjb25zdCBvZyBvZiBhZy5vckdyb3Vwcykge1xuICAgICAgY29uc3Qgb3JzOiBTcWxDb25kW10gPSBbXVxuICAgICAgZm9yIChjb25zdCBsZWFmIG9mIG9nKSB7XG4gICAgICAgIGNvbnN0IFtoZWFkLCByZWxdID0gbGVhZi5wYXRoXG4gICAgICAgIGlmICgoaGVhZCA9PT0gJ25hbWUnIHx8IGhlYWQgPT09ICdvcmdhbml6YXRpb24nKSAmJiBsZWFmLm9wID09PSAnY29udGFpbnNpJykge1xuICAgICAgICAgIG9ycy5wdXNoKGNvbmQoaGVhZCA9PT0gJ25hbWUnID8gJ0xPV0VSKHN0Lm5hbWUpJyA6ICdMT1dFUihzdC5vcmdhbml6YXRpb24pJywgJ2NvbnRhaW5zaScsIGxlYWYudmFsdWUpKVxuICAgICAgICB9IGVsc2UgaWYgKGhlYWQgPT09ICdzY2hvb2xfcmVmJyAmJiByZWwgPT09ICdzbHVnJyAmJiBsZWFmLm9wID09PSAnZXEnKSB7XG4gICAgICAgICAgb3JzLnB1c2goY29uZCgnc2Muc2x1ZycsICdlcScsIGxlYWYudmFsdWUpKVxuICAgICAgICB9IGVsc2UgaWYgKGhlYWQgPT09ICdzY2hvb2wnICYmIGxlYWYub3AgPT09ICdlcScpIHtcbiAgICAgICAgICBvcnMucHVzaChjb25kKCdzYy5zbHVnJywgJ2VxJywgbGVhZi52YWx1ZSkpXG4gICAgICAgIH0gZWxzZSBpZiAoaGVhZCA9PT0gJ2JpbycgJiYgbGVhZi5vcCA9PT0gJ2NvbnRhaW5zaScpIHtcbiAgICAgICAgICBjb250aW51ZSAvLyBiaW8g5YiX5Zyo55im6LqrIHNjaGVtYSDkuK3kuI3lrZjlnKjvvJrot7Pov4dcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uZHMucHVzaChvckFueShvcnMpKVxuICAgIH1cbiAgfVxuXG4gIC8vICRvciDnu4TvvIhzZWFyY2hTdHVkZW50c++8ie+8mm5hbWUvb3JnYW5pemF0aW9uL3NjaG9vbC9iaW8gY29udGFpbnNpXG4gIGZvciAoY29uc3QgZ3JvdXAgb2YgcS5vckdyb3Vwcykge1xuICAgIGNvbnN0IG9yczogU3FsQ29uZFtdID0gW11cbiAgICBmb3IgKGNvbnN0IGxlYWYgb2YgZ3JvdXApIHtcbiAgICAgIGNvbnN0IGZpZWxkID0gbGVhZi5wYXRoW2xlYWYucGF0aC5sZW5ndGggLSAxXVxuICAgICAgaWYgKGZpZWxkID09PSAnbmFtZScpIG9ycy5wdXNoKGNvbmQoJ0xPV0VSKHN0Lm5hbWUpJywgJ2NvbnRhaW5zaScsIGxlYWYudmFsdWUpKVxuICAgICAgZWxzZSBpZiAoZmllbGQgPT09ICdvcmdhbml6YXRpb24nKSBvcnMucHVzaChjb25kKCdMT1dFUihzdC5vcmdhbml6YXRpb24pJywgJ2NvbnRhaW5zaScsIGxlYWYudmFsdWUpKVxuICAgICAgZWxzZSBpZiAoZmllbGQgPT09ICdzY2hvb2wnKSBvcnMucHVzaChjb25kKCdzYy5uYW1lX2pzb24nLCAnY29udGFpbnNpJywgbGVhZi52YWx1ZSkpXG4gICAgICAvLyBiaW8g5LiN5a2Y5Zyo77ya6Lez6L+HXG4gICAgfVxuICAgIGNvbmRzLnB1c2gob3JBbnkob3JzKSlcbiAgfVxuXG4gIHJldHVybiBhbmRBbGwoY29uZHMpXG59XG5cbi8qKiDmlLbpm4blubPpk7ogZmlsdGVyc1tpZF1bJGluXVtpXSDkuLogT1Ig57uEICovXG5mdW5jdGlvbiBzdHVkZW50SWRJbldoZXJlKHE6IFBhcnNlZENvbnRlbnRRdWVyeSk6IFNxbENvbmQgfCBudWxsIHtcbiAgY29uc3QgaWRzOiBudW1iZXJbXSA9IFtdXG4gIGZvciAoY29uc3QgbGVhZiBvZiBxLmxlYXZlcykge1xuICAgIGlmIChsZWFmLnBhdGhbMF0gPT09ICdpZCcgJiYgbGVhZi5vcCA9PT0gJ2VxJykgaWRzLnB1c2gocGFyc2VJbnQobGVhZi52YWx1ZSwgMTApKVxuICB9XG4gIGlmIChpZHMubGVuZ3RoID09PSAwKSByZXR1cm4gbnVsbFxuICByZXR1cm4gb3JBbnkoaWRzLm1hcCgoaWQpID0+IGNvbmQoJ3N0LmlkJywgJ2VxJywgaWQpKSlcbn1cblxuZXhwb3J0IGNvbnN0IHN0dWRlbnRzUm91dGVzID0gbmV3IEhvbm88eyBCaW5kaW5nczogRW52IH0+KClcblxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hTdHVkZW50Um93cyhkYjogRDFEYXRhYmFzZSwgd2hlcmVTcWw6IFNxbENvbmQsIG9yZGVyU3FsOiBzdHJpbmcsIGxpbU9mZjogU3FsQ29uZCk6IFByb21pc2U8U3R1ZGVudFJvd1tdPiB7XG4gIGNvbnN0IHN0bXQgPSBkYi5wcmVwYXJlKGAke1NUVURFTlRTX1NFTEVDVH0gV0hFUkUgJHt3aGVyZVNxbC5zcWx9IE9SREVSIEJZICR7b3JkZXJTcWx9ICR7bGltT2ZmLnNxbH1gKVxuICBjb25zdCBvdXQgPSBhd2FpdCBzdG10LmJpbmQoWy4uLndoZXJlU3FsLnBhcmFtcywgLi4ubGltT2ZmLnBhcmFtc10pLmFsbDxTdHVkZW50Um93PigpXG4gIHJldHVybiBvdXQucmVzdWx0cyA/PyBbXVxufVxuXG5hc3luYyBmdW5jdGlvbiBjb3VudFN0dWRlbnRzKGRiOiBEMURhdGFiYXNlLCB3aGVyZVNxbDogU3FsQ29uZCk6IFByb21pc2U8bnVtYmVyPiB7XG4gIGNvbnN0IHN0bXQgPSBkYi5wcmVwYXJlKGBTRUxFQ1QgQ09VTlQoKikgQVMgbiBGUk9NIHN0dWRlbnRzIHN0IExFRlQgSk9JTiBzY2hvb2xzIHNjIE9OIHNjLmlkID0gc3Quc2Nob29sX2lkIFdIRVJFICR7d2hlcmVTcWwuc3FsfWApXG4gIGNvbnN0IHJvdyA9IGF3YWl0IHN0bXQuYmluZCguLi53aGVyZVNxbC5wYXJhbXMpLmZpcnN0PHsgbjogbnVtYmVyIH0+KClcbiAgcmV0dXJuIHJvdz8ubiA/PyAwXG59XG5cbnN0dWRlbnRzUm91dGVzLmdldCgnL3N0dWRlbnRzJywgYXN5bmMgKGMpID0+IHtcbiAgY29uc3QgcSA9IHBhcnNlQ29udGVudFF1ZXJ5KG5ldyBVUkwoYy5yZXEudXJsKSlcbiAgbGV0IHdoZXJlU3FsID0gYnVpbGRXaGVyZShxKVxuICBjb25zdCBpbldoZXJlID0gc3R1ZGVudElkSW5XaGVyZShxKVxuICBpZiAoaW5XaGVyZSkgd2hlcmVTcWwgPSBhbmRBbGwoW3doZXJlU3FsLCBpbldoZXJlXSlcblxuICBjb25zdCBvZmZzZXQgPSBxLnN0YXJ0ID8/IChxLnBhZ2UgLSAxKSAqIHEucGFnZVNpemVcbiAgY29uc3Qgc2l6ZSA9IHEubGltaXQgPz8gcS5wYWdlU2l6ZVxuXG4gIGNvbnN0IFtyb3dzLCB0b3RhbF0gPSBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgZmV0Y2hTdHVkZW50Um93cyhjLmVudi5EQiwgd2hlcmVTcWwsIG9yZGVyQnlPZihxLnNvcnRzKSwgbGltaXRPZmZzZXQoc2l6ZSwgb2Zmc2V0KSksXG4gICAgY291bnRTdHVkZW50cyhjLmVudi5EQiwgd2hlcmVTcWwpLFxuICBdKVxuICByZXR1cm4gb2tQYWdpbmF0ZWQocm93cy5tYXAoc3R1ZGVudFRvSnNvbiksIHBhZ2luYXRpb25PZihxLnBhZ2UsIHEucGFnZVNpemUsIHRvdGFsKSlcbn0pXG5cbnN0dWRlbnRzUm91dGVzLmdldCgnL3N0dWRlbnRzLzprZXknLCBhc3luYyAoYykgPT4ge1xuICBjb25zdCBrZXkgPSBjLnJlcS5wYXJhbSgna2V5JykudHJpbSgpXG4gIGNvbnN0IG51bWVyaWMgPSAvXlxcZCskLy50ZXN0KGtleSlcbiAgY29uc3Qgd2hlcmVTcWwgPSBhbmRBbGwoW1xuICAgIHsgc3FsOiAnc3QucHVibGlzaGVkX2F0IElTIE5PVCBOVUxMJywgcGFyYW1zOiBbXSB9LFxuICAgIG51bWVyaWMgPyBjb25kKCdzdC5pZCcsICdlcScsIHBhcnNlSW50KGtleSwgMTApKSA6IGNvbmQoJ3N0LmRvY3VtZW50X2lkJywgJ2VxJywga2V5KSxcbiAgXSlcbiAgY29uc3Qgcm93cyA9IGF3YWl0IGZldGNoU3R1ZGVudFJvd3MoYy5lbnYuREIsIHdoZXJlU3FsLCAnc3QubmFtZSBBU0MnLCBsaW1pdE9mZnNldCgxLCAwKSlcbiAgaWYgKHJvd3MubGVuZ3RoID09PSAwKSByZXR1cm4gZmFpbCg0MDQsICdub3RfZm91bmQnKVxuICByZXR1cm4gb2soc3R1ZGVudFRvSnNvbihyb3dzWzBdKSlcbn0pXG4iXSwiZmlsZSI6Ii9Vc2Vycy9rYXJhL0NvZGUvU2NoYWxlLUxpYnJhcnkvc2VydmVyL3NyYy9jb250ZW50L3N0dWRlbnRzLnRzIn0=
