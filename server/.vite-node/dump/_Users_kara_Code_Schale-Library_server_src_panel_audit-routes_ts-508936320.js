// /Users/kara/Code/Schale-Library/server/src/panel/audit-routes.ts
const __vite_ssr_import_0__ = await __vite_ssr_import__("/src/lib/respond.ts", {"importedNames":["okPaginated","paginationOf"]});

const EXPORT_MAX_ROWS = 1e4;
function serializeAuditRow(row) {
  return {
    id: String(row.id),
    documentId: String(row.id),
    action: row.action,
    targetCollection: row.target_collection,
    targetDocumentId: row.target_document_id,
    payloadSummary: row.payload_summary,
    actorUsername: row.actor_username,
    ip: row.ip,
    createdAt: new Date(row.created_at).toISOString()
  };
}
function buildAuditFilters(c) {
  const where = [];
  const binds = [];
  const action = c.req.query("action");
  if (action && action !== "all") {
    where.push(`action = ?${binds.length + 1}`);
    binds.push(action);
  }
  const collection = c.req.query("collection");
  if (collection && collection !== "all") {
    where.push(`target_collection = ?${binds.length + 1}`);
    binds.push(collection);
  }
  const actor = c.req.query("actor")?.trim();
  if (actor) {
    where.push(`LOWER(actor_username) LIKE ?${binds.length + 1}`);
    binds.push(`%${actor.toLowerCase()}%`);
  }
  const from = c.req.query("from");
  if (from) {
    const ms = new Date(from).getTime();
    if (!Number.isNaN(ms)) {
      where.push(`created_at >= ?${binds.length + 1}`);
      binds.push(ms);
    }
  }
  const to = c.req.query("to");
  if (to) {
    const ms = new Date(to).getTime();
    if (!Number.isNaN(ms)) {
      where.push(`created_at <= ?${binds.length + 1}`);
      binds.push(ms);
    }
  }
  return { whereSql: where.length > 0 ? `WHERE ${where.join(" AND ")}` : "", binds };
}
async function handleAuditLogList(c) {
  const page = Math.max(1, Number(c.req.query("page") || "1") || 1);
  const pageSize = Math.min(100, Math.max(1, Number(c.req.query("pageSize") || "20") || 20));
  const { whereSql, binds } = buildAuditFilters(c);
  const totalRow = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM admin_audit_logs ${whereSql}`).bind(...binds).first();
  const total = totalRow?.n ?? 0;
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM admin_audit_logs ${whereSql} ORDER BY created_at DESC LIMIT ?${binds.length + 1} OFFSET ?${binds.length + 2}`
  ).bind(...binds, pageSize, (page - 1) * pageSize).all();
  return __vite_ssr_import_0__.okPaginated(results.map(serializeAuditRow), __vite_ssr_import_0__.paginationOf(page, pageSize, total));
}
Object.defineProperty(__vite_ssr_exports__, "handleAuditLogList", { enumerable: true, configurable: true, get(){ return handleAuditLogList }});
function escapeCsvCell(value) {
  let text = value === null || value === void 0 ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}
async function handleAuditLogExport(c) {
  const { whereSql, binds } = buildAuditFilters(c);
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM admin_audit_logs ${whereSql} ORDER BY created_at DESC LIMIT ?${binds.length + 1}`
  ).bind(...binds, EXPORT_MAX_ROWS).all();
  const totalRow = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM admin_audit_logs ${whereSql}`).bind(...binds).first();
  const total = totalRow?.n ?? 0;
  const header = ["createdAt", "action", "actorUsername", "targetCollection", "targetDocumentId", "payloadSummary", "ip"];
  const lines = [
    ...total > results.length ? [`# Export truncated to ${EXPORT_MAX_ROWS} of ${total} matching rows`] : [],
    header.join(","),
    ...results.map(
      (row) => [
        new Date(row.created_at).toISOString(),
        row.action,
        row.actor_username,
        row.target_collection,
        row.target_document_id,
        row.payload_summary,
        row.ip
      ].map(escapeCsvCell).join(",")
    )
  ];
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-audit-logs.csv"',
      "X-Export-Truncated": total > results.length ? "true" : "false",
      "Cache-Control": "no-store"
    }
  });
}
Object.defineProperty(__vite_ssr_exports__, "handleAuditLogExport", { enumerable: true, configurable: true, get(){ return handleAuditLogExport }});

//# sourceMappingSource=vite-node
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUFFLFlBQVk7QUFBQSxRQUNyQyxJQUFJO0FBQUEsUUFDSixJQUFJO0FBQUEsUUFDSixJQUFJO0FBQUEsUUFDSixJQUFJO0FBQUEsUUFDSixJQUFJO0FBQUEsUUFDSixJQUFJO0FBQUEsTUFDTixFQUNHLElBQUksYUFBYSxFQUNqQixLQUFLLEdBQUc7QUFBQSxJQUNiO0FBQUEsRUFDRjtBQUVBLFNBQU8sSUFBSSxTQUFTLE1BQU0sS0FBSyxJQUFJLEdBQUc7QUFBQSxJQUNwQyxTQUFTO0FBQUEsTUFDUCxnQkFBZ0I7QUFBQSxNQUNoQix1QkFBdUI7QUFBQSxNQUN2QixzQkFBc0IsUUFBUSxRQUFRLFNBQVMsU0FBUztBQUFBLE1BQ3hELGlCQUFpQjtBQUFBLElBQ25CO0FBQUEsRUFDRixDQUFDO0FBQ0g7bUpBQUEiLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbImF1ZGl0LXJvdXRlcy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIOWuoeiuoeaXpeW/l+afpeivouS4jiBDU1Yg5a+85Ye677yaXG4gKiAtIEdFVCAvcGFuZWwvYWRtaW4tYXVkaXQtbG9nc++8muWIhumhtVxuICogLSBHRVQgL3BhbmVsL2FkbWluLWF1ZGl0LWxvZ3MvZXhwb3J077yaQ1NWIOa1ge+8jOWFrOW8j+azqOWFpeS4reWSjO+8iD0gKyAtIEAg5byA5aS05YmN57yAICfvvIlcbiAqL1xuaW1wb3J0IHR5cGUgeyBDb250ZXh0IH0gZnJvbSAnaG9ubydcbmltcG9ydCB7IG9rUGFnaW5hdGVkLCBwYWdpbmF0aW9uT2YgfSBmcm9tICcuLi9saWIvcmVzcG9uZCdcblxuY29uc3QgRVhQT1JUX01BWF9ST1dTID0gMTAwMDBcblxuaW50ZXJmYWNlIEF1ZGl0Um93IHtcbiAgaWQ6IG51bWJlclxuICBhY3Rpb246IHN0cmluZ1xuICB0YXJnZXRfY29sbGVjdGlvbjogc3RyaW5nIHwgbnVsbFxuICB0YXJnZXRfZG9jdW1lbnRfaWQ6IHN0cmluZyB8IG51bGxcbiAgcGF5bG9hZF9zdW1tYXJ5OiBzdHJpbmcgfCBudWxsXG4gIGFjdG9yX3VzZXJuYW1lOiBzdHJpbmcgfCBudWxsXG4gIGlwOiBzdHJpbmcgfCBudWxsXG4gIGNyZWF0ZWRfYXQ6IG51bWJlclxufVxuXG5mdW5jdGlvbiBzZXJpYWxpemVBdWRpdFJvdyhyb3c6IEF1ZGl0Um93KTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4ge1xuICByZXR1cm4ge1xuICAgIGlkOiBTdHJpbmcocm93LmlkKSxcbiAgICBkb2N1bWVudElkOiBTdHJpbmcocm93LmlkKSxcbiAgICBhY3Rpb246IHJvdy5hY3Rpb24sXG4gICAgdGFyZ2V0Q29sbGVjdGlvbjogcm93LnRhcmdldF9jb2xsZWN0aW9uLFxuICAgIHRhcmdldERvY3VtZW50SWQ6IHJvdy50YXJnZXRfZG9jdW1lbnRfaWQsXG4gICAgcGF5bG9hZFN1bW1hcnk6IHJvdy5wYXlsb2FkX3N1bW1hcnksXG4gICAgYWN0b3JVc2VybmFtZTogcm93LmFjdG9yX3VzZXJuYW1lLFxuICAgIGlwOiByb3cuaXAsXG4gICAgY3JlYXRlZEF0OiBuZXcgRGF0ZShyb3cuY3JlYXRlZF9hdCkudG9JU09TdHJpbmcoKSxcbiAgfVxufVxuXG5mdW5jdGlvbiBidWlsZEF1ZGl0RmlsdGVycyhjOiBDb250ZXh0PHsgQmluZGluZ3M6IHsgREI6IEQxRGF0YWJhc2UgfTsgVmFyaWFibGVzOiBSZWNvcmQ8c3RyaW5nLCBuZXZlcj4gfT4pOiB7XG4gIHdoZXJlU3FsOiBzdHJpbmdcbiAgYmluZHM6IHVua25vd25bXVxufSB7XG4gIGNvbnN0IHdoZXJlOiBzdHJpbmdbXSA9IFtdXG4gIGNvbnN0IGJpbmRzOiB1bmtub3duW10gPSBbXVxuXG4gIGNvbnN0IGFjdGlvbiA9IGMucmVxLnF1ZXJ5KCdhY3Rpb24nKVxuICBpZiAoYWN0aW9uICYmIGFjdGlvbiAhPT0gJ2FsbCcpIHtcbiAgICB3aGVyZS5wdXNoKGBhY3Rpb24gPSA/JHtiaW5kcy5sZW5ndGggKyAxfWApXG4gICAgYmluZHMucHVzaChhY3Rpb24pXG4gIH1cbiAgY29uc3QgY29sbGVjdGlvbiA9IGMucmVxLnF1ZXJ5KCdjb2xsZWN0aW9uJylcbiAgaWYgKGNvbGxlY3Rpb24gJiYgY29sbGVjdGlvbiAhPT0gJ2FsbCcpIHtcbiAgICB3aGVyZS5wdXNoKGB0YXJnZXRfY29sbGVjdGlvbiA9ID8ke2JpbmRzLmxlbmd0aCArIDF9YClcbiAgICBiaW5kcy5wdXNoKGNvbGxlY3Rpb24pXG4gIH1cbiAgY29uc3QgYWN0b3IgPSBjLnJlcS5xdWVyeSgnYWN0b3InKT8udHJpbSgpXG4gIGlmIChhY3Rvcikge1xuICAgIHdoZXJlLnB1c2goYExPV0VSKGFjdG9yX3VzZXJuYW1lKSBMSUtFID8ke2JpbmRzLmxlbmd0aCArIDF9YClcbiAgICBiaW5kcy5wdXNoKGAlJHthY3Rvci50b0xvd2VyQ2FzZSgpfSVgKVxuICB9XG4gIGNvbnN0IGZyb20gPSBjLnJlcS5xdWVyeSgnZnJvbScpXG4gIGlmIChmcm9tKSB7XG4gICAgY29uc3QgbXMgPSBuZXcgRGF0ZShmcm9tKS5nZXRUaW1lKClcbiAgICBpZiAoIU51bWJlci5pc05hTihtcykpIHtcbiAgICAgIHdoZXJlLnB1c2goYGNyZWF0ZWRfYXQgPj0gPyR7YmluZHMubGVuZ3RoICsgMX1gKVxuICAgICAgYmluZHMucHVzaChtcylcbiAgICB9XG4gIH1cbiAgY29uc3QgdG8gPSBjLnJlcS5xdWVyeSgndG8nKVxuICBpZiAodG8pIHtcbiAgICBjb25zdCBtcyA9IG5ldyBEYXRlKHRvKS5nZXRUaW1lKClcbiAgICBpZiAoIU51bWJlci5pc05hTihtcykpIHtcbiAgICAgIHdoZXJlLnB1c2goYGNyZWF0ZWRfYXQgPD0gPyR7YmluZHMubGVuZ3RoICsgMX1gKVxuICAgICAgYmluZHMucHVzaChtcylcbiAgICB9XG4gIH1cblxuICByZXR1cm4geyB3aGVyZVNxbDogd2hlcmUubGVuZ3RoID4gMCA/IGBXSEVSRSAke3doZXJlLmpvaW4oJyBBTkQgJyl9YCA6ICcnLCBiaW5kcyB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVBdWRpdExvZ0xpc3QoXG4gIGM6IENvbnRleHQ8eyBCaW5kaW5nczogeyBEQjogRDFEYXRhYmFzZSB9OyBWYXJpYWJsZXM6IFJlY29yZDxzdHJpbmcsIG5ldmVyPiB9PlxuKTogUHJvbWlzZTxSZXNwb25zZT4ge1xuICBjb25zdCBwYWdlID0gTWF0aC5tYXgoMSwgTnVtYmVyKGMucmVxLnF1ZXJ5KCdwYWdlJykgfHwgJzEnKSB8fCAxKVxuICBjb25zdCBwYWdlU2l6ZSA9IE1hdGgubWluKDEwMCwgTWF0aC5tYXgoMSwgTnVtYmVyKGMucmVxLnF1ZXJ5KCdwYWdlU2l6ZScpIHx8ICcyMCcpIHx8IDIwKSlcbiAgY29uc3QgeyB3aGVyZVNxbCwgYmluZHMgfSA9IGJ1aWxkQXVkaXRGaWx0ZXJzKGMpXG5cbiAgY29uc3QgdG90YWxSb3cgPSBhd2FpdCBjLmVudi5EQi5wcmVwYXJlKGBTRUxFQ1QgQ09VTlQoKikgQVMgbiBGUk9NIGFkbWluX2F1ZGl0X2xvZ3MgJHt3aGVyZVNxbH1gKVxuICAgIC5iaW5kKC4uLmJpbmRzKVxuICAgIC5maXJzdDx7IG46IG51bWJlciB9PigpXG4gIGNvbnN0IHRvdGFsID0gdG90YWxSb3c/Lm4gPz8gMFxuXG4gIGNvbnN0IHsgcmVzdWx0cyB9ID0gYXdhaXQgYy5lbnYuREIucHJlcGFyZShcbiAgICBgU0VMRUNUICogRlJPTSBhZG1pbl9hdWRpdF9sb2dzICR7d2hlcmVTcWx9IE9SREVSIEJZIGNyZWF0ZWRfYXQgREVTQyBMSU1JVCA/JHtiaW5kcy5sZW5ndGggKyAxfSBPRkZTRVQgPyR7YmluZHMubGVuZ3RoICsgMn1gXG4gIClcbiAgICAuYmluZCguLi5iaW5kcywgcGFnZVNpemUsIChwYWdlIC0gMSkgKiBwYWdlU2l6ZSlcbiAgICAuYWxsPEF1ZGl0Um93PigpXG5cbiAgcmV0dXJuIG9rUGFnaW5hdGVkKHJlc3VsdHMubWFwKHNlcmlhbGl6ZUF1ZGl0Um93KSwgcGFnaW5hdGlvbk9mKHBhZ2UsIHBhZ2VTaXplLCB0b3RhbCkpXG59XG5cbi8qKiDljZXlhYPmoLzku6UgPSArIC0gQCDmiJbliLbooajnrKYv5Zue6L2m5byA5aS05pe25YmN57yAICcg5Lit5ZKM5YWs5byP5rOo5YWl44CCICovXG5mdW5jdGlvbiBlc2NhcGVDc3ZDZWxsKHZhbHVlOiB1bmtub3duKTogc3RyaW5nIHtcbiAgbGV0IHRleHQgPSB2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkID8gJycgOiBTdHJpbmcodmFsdWUpXG4gIGlmICgvXls9K1xcLUBcXHRcXHJdLy50ZXN0KHRleHQpKSB7XG4gICAgdGV4dCA9IGAnJHt0ZXh0fWBcbiAgfVxuICByZXR1cm4gYFwiJHt0ZXh0LnJlcGxhY2UoL1wiL2csICdcIlwiJyl9XCJgXG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVBdWRpdExvZ0V4cG9ydChcbiAgYzogQ29udGV4dDx7IEJpbmRpbmdzOiB7IERCOiBEMURhdGFiYXNlIH07IFZhcmlhYmxlczogUmVjb3JkPHN0cmluZywgbmV2ZXI+IH0+XG4pOiBQcm9taXNlPFJlc3BvbnNlPiB7XG4gIGNvbnN0IHsgd2hlcmVTcWwsIGJpbmRzIH0gPSBidWlsZEF1ZGl0RmlsdGVycyhjKVxuXG4gIGNvbnN0IHsgcmVzdWx0cyB9ID0gYXdhaXQgYy5lbnYuREIucHJlcGFyZShcbiAgICBgU0VMRUNUICogRlJPTSBhZG1pbl9hdWRpdF9sb2dzICR7d2hlcmVTcWx9IE9SREVSIEJZIGNyZWF0ZWRfYXQgREVTQyBMSU1JVCA/JHtiaW5kcy5sZW5ndGggKyAxfWBcbiAgKVxuICAgIC5iaW5kKC4uLmJpbmRzLCBFWFBPUlRfTUFYX1JPV1MpXG4gICAgLmFsbDxBdWRpdFJvdz4oKVxuXG4gIGNvbnN0IHRvdGFsUm93ID0gYXdhaXQgYy5lbnYuREIucHJlcGFyZShgU0VMRUNUIENPVU5UKCopIEFTIG4gRlJPTSBhZG1pbl9hdWRpdF9sb2dzICR7d2hlcmVTcWx9YClcbiAgICAuYmluZCguLi5iaW5kcylcbiAgICAuZmlyc3Q8eyBuOiBudW1iZXIgfT4oKVxuICBjb25zdCB0b3RhbCA9IHRvdGFsUm93Py5uID8/IDBcblxuICBjb25zdCBoZWFkZXIgPSBbJ2NyZWF0ZWRBdCcsICdhY3Rpb24nLCAnYWN0b3JVc2VybmFtZScsICd0YXJnZXRDb2xsZWN0aW9uJywgJ3RhcmdldERvY3VtZW50SWQnLCAncGF5bG9hZFN1bW1hcnknLCAnaXAnXVxuICBjb25zdCBsaW5lcyA9IFtcbiAgICAuLi4odG90YWwgPiByZXN1bHRzLmxlbmd0aCA/IFtgIyBFeHBvcnQgdHJ1bmNhdGVkIHRvICR7RVhQT1JUX01BWF9ST1dTfSBvZiAke3RvdGFsfSBtYXRjaGluZyByb3dzYF0gOiBbXSksXG4gICAgaGVhZGVyLmpvaW4oJywnKSxcbiAgICAuLi5yZXN1bHRzLm1hcCgocm93KSA9PlxuICAgICAgW1xuICAgICAgICBuZXcgRGF0ZShyb3cuY3JlYXRlZF9hdCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgcm93LmFjdGlvbixcbiAgICAgICAgcm93LmFjdG9yX3VzZXJuYW1lLFxuICAgICAgICByb3cudGFyZ2V0X2NvbGxlY3Rpb24sXG4gICAgICAgIHJvdy50YXJnZXRfZG9jdW1lbnRfaWQsXG4gICAgICAgIHJvdy5wYXlsb2FkX3N1bW1hcnksXG4gICAgICAgIHJvdy5pcCxcbiAgICAgIF1cbiAgICAgICAgLm1hcChlc2NhcGVDc3ZDZWxsKVxuICAgICAgICAuam9pbignLCcpXG4gICAgKSxcbiAgXVxuXG4gIHJldHVybiBuZXcgUmVzcG9uc2UobGluZXMuam9pbignXFxuJyksIHtcbiAgICBoZWFkZXJzOiB7XG4gICAgICAnQ29udGVudC1UeXBlJzogJ3RleHQvY3N2OyBjaGFyc2V0PXV0Zi04JyxcbiAgICAgICdDb250ZW50LURpc3Bvc2l0aW9uJzogJ2F0dGFjaG1lbnQ7IGZpbGVuYW1lPVwiYWRtaW4tYXVkaXQtbG9ncy5jc3ZcIicsXG4gICAgICAnWC1FeHBvcnQtVHJ1bmNhdGVkJzogdG90YWwgPiByZXN1bHRzLmxlbmd0aCA/ICd0cnVlJyA6ICdmYWxzZScsXG4gICAgICAnQ2FjaGUtQ29udHJvbCc6ICduby1zdG9yZScsXG4gICAgfSxcbiAgfSlcbn1cbiJdLCJmaWxlIjoiL1VzZXJzL2thcmEvQ29kZS9TY2hhbGUtTGlicmFyeS9zZXJ2ZXIvc3JjL3BhbmVsL2F1ZGl0LXJvdXRlcy50cyJ9
