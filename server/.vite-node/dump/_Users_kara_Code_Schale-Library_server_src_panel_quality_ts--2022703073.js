// /Users/kara/Code/Schale-Library/server/src/panel/quality.ts
const __vite_ssr_import_0__ = await __vite_ssr_import__("/src/lib/respond.ts", {"importedNames":["fail","ok","okPaginated","paginationOf"]});
const __vite_ssr_import_1__ = await __vite_ssr_import__("/src/panel/collections.ts", {"importedNames":["COLLECTIONS"]});
const __vite_ssr_import_2__ = await __vite_ssr_import__("/src/panel/audit.ts", {"importedNames":["recordAuditLog"]});



function isUsableUrl(value) {
  const text = String(value ?? "").trim();
  if (!text) return false;
  try {
    const parsed = new URL(text);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
function scanCollection(collectionKey, rows) {
  const issues = [];
  for (const row of rows) {
    const documentId = typeof row.document_id === "string" ? row.document_id : null;
    if (collectionKey === "events") {
      if (!row.cover_image_url) {
        issues.push({ issueType: "missing-image", severity: "warning", collection: collectionKey, targetDocumentId: documentId, message: "活动缺少封面图" });
      }
      if (!row.link) {
        issues.push({ issueType: "missing-link", severity: "warning", collection: collectionKey, targetDocumentId: documentId, message: "活动缺少外链" });
      } else if (!isUsableUrl(row.link)) {
        issues.push({ issueType: "dead-link", severity: "error", collection: collectionKey, targetDocumentId: documentId, message: "活动外链不是有效 URL" });
      }
      if (row.source_url && !isUsableUrl(row.source_url)) {
        issues.push({ issueType: "dead-link", severity: "error", collection: collectionKey, targetDocumentId: documentId, message: "活动信源链接不是有效 URL" });
      }
      if (row.ticket_url && !isUsableUrl(row.ticket_url)) {
        issues.push({ issueType: "dead-link", severity: "error", collection: collectionKey, targetDocumentId: documentId, message: "活动票务链接不是有效 URL" });
      }
      if (!row.title_json) {
        issues.push({ issueType: "empty-field", severity: "error", collection: collectionKey, targetDocumentId: documentId, message: "活动缺少标题" });
      }
    } else if (collectionKey === "students") {
      if (!row.avatar_url) {
        issues.push({ issueType: "missing-image", severity: "info", collection: collectionKey, targetDocumentId: documentId, message: "学生缺少头像" });
      }
      if (!row.school_id) {
        issues.push({ issueType: "empty-field", severity: "info", collection: collectionKey, targetDocumentId: documentId, message: "学生缺少学院关联" });
      }
      if (!row.name) {
        issues.push({ issueType: "empty-field", severity: "error", collection: collectionKey, targetDocumentId: documentId, message: "学生缺少姓名" });
      }
    } else if (collectionKey === "announcements") {
      if (!row.title_json) {
        issues.push({ issueType: "empty-field", severity: "error", collection: collectionKey, targetDocumentId: documentId, message: "公告缺少标题" });
      }
      if (!row.content_json) {
        issues.push({ issueType: "empty-field", severity: "warning", collection: collectionKey, targetDocumentId: documentId, message: "公告缺少正文" });
      }
      if (row.link && !isUsableUrl(row.link)) {
        issues.push({ issueType: "dead-link", severity: "error", collection: collectionKey, targetDocumentId: documentId, message: "公告跳转链接不是有效 URL" });
      }
    } else if (collectionKey === "friend-links") {
      if (!row.icon_url) {
        issues.push({ issueType: "missing-image", severity: "info", collection: collectionKey, targetDocumentId: documentId, message: "友情链接缺少图标" });
      }
      if (!row.url) {
        issues.push({ issueType: "missing-link", severity: "error", collection: collectionKey, targetDocumentId: documentId, message: "友情链接缺少跳转链接" });
      } else if (!isUsableUrl(row.url)) {
        issues.push({ issueType: "dead-link", severity: "error", collection: collectionKey, targetDocumentId: documentId, message: "友情链接不是有效 URL" });
      }
      if (!row.title_json) {
        issues.push({ issueType: "empty-field", severity: "error", collection: collectionKey, targetDocumentId: documentId, message: "友情链接缺少标题" });
      }
    }
    if (!row.published_at) {
      issues.push({ issueType: "draft", severity: "info", collection: collectionKey, targetDocumentId: documentId, message: "仍处于草稿状态" });
    }
  }
  return issues;
}
async function handleQualityScan(c) {
  try {
    const batchId = crypto.randomUUID();
    let count = 0;
    for (const [key, def] of Object.entries(__vite_ssr_import_1__.COLLECTIONS)) {
      if (!["events", "students", "announcements", "friend-links"].includes(key)) continue;
      const { results } = await c.env.DB.prepare(`SELECT * FROM ${def.table}`).all();
      const drafts = scanCollection(key, results);
      await c.env.DB.prepare("DELETE FROM content_quality_issues WHERE collection = ?1").bind(key).run();
      for (const draft of drafts) {
        await c.env.DB.prepare(
          `INSERT INTO content_quality_issues (issue_type, collection, target_document_id, detail_json, batch_id, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
        ).bind(draft.issueType, draft.collection, draft.targetDocumentId, JSON.stringify({ severity: draft.severity ?? "warning", message: draft.message }), batchId, Date.now()).run();
        count++;
      }
    }
    await __vite_ssr_import_2__.recordAuditLog(c, {
      action: "update",
      targetCollection: "content-quality-issues",
      payloadSummary: `内容质量扫描完成，发现 ${count} 个问题`
    });
    return __vite_ssr_import_0__.ok({ success: true, count });
  } catch (error) {
    return __vite_ssr_import_0__.fail(400, `scan_failed:${error.message}`);
  }
}
Object.defineProperty(__vite_ssr_exports__, "handleQualityScan", { enumerable: true, configurable: true, get(){ return handleQualityScan }});
async function handleQualityIssuesList(c) {
  const page = Math.max(1, Number(c.req.query("page") || "1") || 1);
  const pageSize = Math.min(100, Math.max(1, Number(c.req.query("pageSize") || "20") || 20));
  const where = [];
  const binds = [];
  const collectionFilter = c.req.query("collection");
  if (collectionFilter && collectionFilter !== "all") {
    where.push(`collection = ?${binds.length + 1}`);
    binds.push(collectionFilter);
  }
  const issueType = c.req.query("issueType");
  if (issueType && issueType !== "all") {
    where.push(`issue_type = ?${binds.length + 1}`);
    binds.push(issueType);
  }
  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const totalRow = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM content_quality_issues ${whereSql}`).bind(...binds).first();
  const total = totalRow?.n ?? 0;
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM content_quality_issues ${whereSql} ORDER BY created_at DESC LIMIT ?${binds.length + 1} OFFSET ?${binds.length + 2}`
  ).bind(...binds, pageSize, (page - 1) * pageSize).all();
  const data = results.map((row) => {
    let severity = row.severity ?? "warning";
    let message = "";
    try {
      const detail = row.detail_json ? JSON.parse(row.detail_json) : null;
      if (detail?.severity) severity = detail.severity;
      if (detail?.message) message = detail.message;
    } catch {
    }
    const payload = {
      issueType: row.issue_type,
      severity,
      status: row.status ?? "open",
      collection: row.collection,
      message,
      id: String(row.id),
      documentId: row.batch_id ?? String(row.id),
      targetDocumentId: row.target_document_id,
      createdAt: new Date(row.created_at).toISOString()
    };
    return payload;
  });
  return __vite_ssr_import_0__.okPaginated(data, __vite_ssr_import_0__.paginationOf(page, pageSize, total));
}
Object.defineProperty(__vite_ssr_exports__, "handleQualityIssuesList", { enumerable: true, configurable: true, get(){ return handleQualityIssuesList }});

//# sourceMappingSource=vite-node
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QVcsSUFBSTtBQUFBLE1BQ2Y7QUFBQSxNQUNBLFFBQVEsSUFBSSxVQUFVO0FBQUEsTUFDdEIsWUFBWSxJQUFJO0FBQUEsTUFDaEI7QUFBQSxNQUNBLElBQUksT0FBTyxJQUFJLEVBQUU7QUFBQSxNQUNqQixZQUFZLElBQUksWUFBWSxPQUFPLElBQUksRUFBRTtBQUFBLE1BQ3pDLGtCQUFrQixJQUFJO0FBQUEsTUFDdEIsV0FBVyxJQUFJLEtBQUssSUFBSSxVQUFVLEVBQUUsWUFBWTtBQUFBLElBQ2xEO0FBQ0EsV0FBTztBQUFBLEVBQ1QsQ0FBQztBQUVELFNBQU8sa0NBQVksTUFBTSxtQ0FBYSxNQUFNLFVBQVUsS0FBSyxDQUFDO0FBQzlEO3lKQUFBIiwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJxdWFsaXR5LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICog5YaF5a656LSo5qOA77yaXG4gKiAtIFBPU1QgL3BhbmVsL3F1YWxpdHktc2Nhbu+8muepuuWtl+autSAvIOatu+mTvu+8iOaXoOaViCBVUkzvvInmo4DmtYvvvIxcbiAqICAg57uT5p6c5YaZIGNvbnRlbnRfcXVhbGl0eV9pc3N1ZXPvvIjluKYgYmF0Y2hfaWTvvInvvIzlhYjliKDlkIwgY29sbGVjdGlvbiDml6fmibnmrKHjgIJcbiAqIC0gR0VUIC9wYW5lbC9jb250ZW50LXF1YWxpdHktaXNzdWVzP2NvbGxlY3Rpb24977ya5YiG6aG15p+l6K+i44CCXG4gKi9cbmltcG9ydCB0eXBlIHsgQ29udGV4dCB9IGZyb20gJ2hvbm8nXG5pbXBvcnQgeyBmYWlsLCBvaywgb2tQYWdpbmF0ZWQsIHBhZ2luYXRpb25PZiB9IGZyb20gJy4uL2xpYi9yZXNwb25kJ1xuaW1wb3J0IHsgQ09MTEVDVElPTlMgfSBmcm9tICcuL2NvbGxlY3Rpb25zJ1xuaW1wb3J0IHsgcmVjb3JkQXVkaXRMb2cgfSBmcm9tICcuL2F1ZGl0J1xuXG5pbnRlcmZhY2UgUXVhbGl0eUlzc3VlUm93IHtcbiAgaXNzdWVfdHlwZTogc3RyaW5nXG4gIHNldmVyaXR5OiBzdHJpbmdcbiAgc3RhdHVzOiBzdHJpbmdcbiAgY29sbGVjdGlvbjogc3RyaW5nXG4gIHRhcmdldF9kb2N1bWVudF9pZDogc3RyaW5nIHwgbnVsbFxuICBtZXNzYWdlOiBzdHJpbmdcbn1cblxuaW50ZXJmYWNlIElzc3VlRHJhZnQge1xuICBpc3N1ZVR5cGU6IHN0cmluZ1xuICBzZXZlcml0eT86ICdpbmZvJyB8ICd3YXJuaW5nJyB8ICdlcnJvcidcbiAgY29sbGVjdGlvbjogc3RyaW5nXG4gIHRhcmdldERvY3VtZW50SWQ6IHN0cmluZyB8IG51bGxcbiAgbWVzc2FnZTogc3RyaW5nXG59XG5cbmZ1bmN0aW9uIGlzVXNhYmxlVXJsKHZhbHVlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gIGNvbnN0IHRleHQgPSBTdHJpbmcodmFsdWUgPz8gJycpLnRyaW0oKVxuICBpZiAoIXRleHQpIHJldHVybiBmYWxzZVxuICB0cnkge1xuICAgIGNvbnN0IHBhcnNlZCA9IG5ldyBVUkwodGV4dClcbiAgICByZXR1cm4gcGFyc2VkLnByb3RvY29sID09PSAnaHR0cHM6JyB8fCBwYXJzZWQucHJvdG9jb2wgPT09ICdodHRwOidcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuLyoqIOWQhOmbhuWQiOeahOepuuWtl+autS/mrbvpk77mo4DmtYvop4TliJnjgIIgKi9cbmZ1bmN0aW9uIHNjYW5Db2xsZWN0aW9uKGNvbGxlY3Rpb25LZXk6IHN0cmluZywgcm93czogQXJyYXk8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+KTogSXNzdWVEcmFmdFtdIHtcbiAgY29uc3QgaXNzdWVzOiBJc3N1ZURyYWZ0W10gPSBbXVxuICBmb3IgKGNvbnN0IHJvdyBvZiByb3dzKSB7XG4gICAgY29uc3QgZG9jdW1lbnRJZCA9IHR5cGVvZiByb3cuZG9jdW1lbnRfaWQgPT09ICdzdHJpbmcnID8gcm93LmRvY3VtZW50X2lkIDogbnVsbFxuXG4gICAgaWYgKGNvbGxlY3Rpb25LZXkgPT09ICdldmVudHMnKSB7XG4gICAgICBpZiAoIXJvdy5jb3Zlcl9pbWFnZV91cmwpIHtcbiAgICAgICAgaXNzdWVzLnB1c2goeyBpc3N1ZVR5cGU6ICdtaXNzaW5nLWltYWdlJywgc2V2ZXJpdHk6ICd3YXJuaW5nJywgY29sbGVjdGlvbjogY29sbGVjdGlvbktleSwgdGFyZ2V0RG9jdW1lbnRJZDogZG9jdW1lbnRJZCwgbWVzc2FnZTogJ+a0u+WKqOe8uuWwkeWwgemdouWbvicgfSlcbiAgICAgIH1cbiAgICAgIGlmICghcm93LmxpbmspIHtcbiAgICAgICAgaXNzdWVzLnB1c2goeyBpc3N1ZVR5cGU6ICdtaXNzaW5nLWxpbmsnLCBzZXZlcml0eTogJ3dhcm5pbmcnLCBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uS2V5LCB0YXJnZXREb2N1bWVudElkOiBkb2N1bWVudElkLCBtZXNzYWdlOiAn5rS75Yqo57y65bCR5aSW6ZO+JyB9KVxuICAgICAgfSBlbHNlIGlmICghaXNVc2FibGVVcmwocm93LmxpbmspKSB7XG4gICAgICAgIGlzc3Vlcy5wdXNoKHsgaXNzdWVUeXBlOiAnZGVhZC1saW5rJywgc2V2ZXJpdHk6ICdlcnJvcicsIGNvbGxlY3Rpb246IGNvbGxlY3Rpb25LZXksIHRhcmdldERvY3VtZW50SWQ6IGRvY3VtZW50SWQsIG1lc3NhZ2U6ICfmtLvliqjlpJbpk77kuI3mmK/mnInmlYggVVJMJyB9KVxuICAgICAgfVxuICAgICAgaWYgKHJvdy5zb3VyY2VfdXJsICYmICFpc1VzYWJsZVVybChyb3cuc291cmNlX3VybCkpIHtcbiAgICAgICAgaXNzdWVzLnB1c2goeyBpc3N1ZVR5cGU6ICdkZWFkLWxpbmsnLCBzZXZlcml0eTogJ2Vycm9yJywgY29sbGVjdGlvbjogY29sbGVjdGlvbktleSwgdGFyZ2V0RG9jdW1lbnRJZDogZG9jdW1lbnRJZCwgbWVzc2FnZTogJ+a0u+WKqOS/oea6kOmTvuaOpeS4jeaYr+acieaViCBVUkwnIH0pXG4gICAgICB9XG4gICAgICBpZiAocm93LnRpY2tldF91cmwgJiYgIWlzVXNhYmxlVXJsKHJvdy50aWNrZXRfdXJsKSkge1xuICAgICAgICBpc3N1ZXMucHVzaCh7IGlzc3VlVHlwZTogJ2RlYWQtbGluaycsIHNldmVyaXR5OiAnZXJyb3InLCBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uS2V5LCB0YXJnZXREb2N1bWVudElkOiBkb2N1bWVudElkLCBtZXNzYWdlOiAn5rS75Yqo56Wo5Yqh6ZO+5o6l5LiN5piv5pyJ5pWIIFVSTCcgfSlcbiAgICAgIH1cbiAgICAgIGlmICghcm93LnRpdGxlX2pzb24pIHtcbiAgICAgICAgaXNzdWVzLnB1c2goeyBpc3N1ZVR5cGU6ICdlbXB0eS1maWVsZCcsIHNldmVyaXR5OiAnZXJyb3InLCBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uS2V5LCB0YXJnZXREb2N1bWVudElkOiBkb2N1bWVudElkLCBtZXNzYWdlOiAn5rS75Yqo57y65bCR5qCH6aKYJyB9KVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoY29sbGVjdGlvbktleSA9PT0gJ3N0dWRlbnRzJykge1xuICAgICAgaWYgKCFyb3cuYXZhdGFyX3VybCkge1xuICAgICAgICBpc3N1ZXMucHVzaCh7IGlzc3VlVHlwZTogJ21pc3NpbmctaW1hZ2UnLCBzZXZlcml0eTogJ2luZm8nLCBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uS2V5LCB0YXJnZXREb2N1bWVudElkOiBkb2N1bWVudElkLCBtZXNzYWdlOiAn5a2m55Sf57y65bCR5aS05YOPJyB9KVxuICAgICAgfVxuICAgICAgaWYgKCFyb3cuc2Nob29sX2lkKSB7XG4gICAgICAgIGlzc3Vlcy5wdXNoKHsgaXNzdWVUeXBlOiAnZW1wdHktZmllbGQnLCBzZXZlcml0eTogJ2luZm8nLCBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uS2V5LCB0YXJnZXREb2N1bWVudElkOiBkb2N1bWVudElkLCBtZXNzYWdlOiAn5a2m55Sf57y65bCR5a2m6Zmi5YWz6IGUJyB9KVxuICAgICAgfVxuICAgICAgaWYgKCFyb3cubmFtZSkge1xuICAgICAgICBpc3N1ZXMucHVzaCh7IGlzc3VlVHlwZTogJ2VtcHR5LWZpZWxkJywgc2V2ZXJpdHk6ICdlcnJvcicsIGNvbGxlY3Rpb246IGNvbGxlY3Rpb25LZXksIHRhcmdldERvY3VtZW50SWQ6IGRvY3VtZW50SWQsIG1lc3NhZ2U6ICflrabnlJ/nvLrlsJHlp5PlkI0nIH0pXG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChjb2xsZWN0aW9uS2V5ID09PSAnYW5ub3VuY2VtZW50cycpIHtcbiAgICAgIGlmICghcm93LnRpdGxlX2pzb24pIHtcbiAgICAgICAgaXNzdWVzLnB1c2goeyBpc3N1ZVR5cGU6ICdlbXB0eS1maWVsZCcsIHNldmVyaXR5OiAnZXJyb3InLCBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uS2V5LCB0YXJnZXREb2N1bWVudElkOiBkb2N1bWVudElkLCBtZXNzYWdlOiAn5YWs5ZGK57y65bCR5qCH6aKYJyB9KVxuICAgICAgfVxuICAgICAgaWYgKCFyb3cuY29udGVudF9qc29uKSB7XG4gICAgICAgIGlzc3Vlcy5wdXNoKHsgaXNzdWVUeXBlOiAnZW1wdHktZmllbGQnLCBzZXZlcml0eTogJ3dhcm5pbmcnLCBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uS2V5LCB0YXJnZXREb2N1bWVudElkOiBkb2N1bWVudElkLCBtZXNzYWdlOiAn5YWs5ZGK57y65bCR5q2j5paHJyB9KVxuICAgICAgfVxuICAgICAgaWYgKHJvdy5saW5rICYmICFpc1VzYWJsZVVybChyb3cubGluaykpIHtcbiAgICAgICAgaXNzdWVzLnB1c2goeyBpc3N1ZVR5cGU6ICdkZWFkLWxpbmsnLCBzZXZlcml0eTogJ2Vycm9yJywgY29sbGVjdGlvbjogY29sbGVjdGlvbktleSwgdGFyZ2V0RG9jdW1lbnRJZDogZG9jdW1lbnRJZCwgbWVzc2FnZTogJ+WFrOWRiui3s+i9rOmTvuaOpeS4jeaYr+acieaViCBVUkwnIH0pXG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChjb2xsZWN0aW9uS2V5ID09PSAnZnJpZW5kLWxpbmtzJykge1xuICAgICAgaWYgKCFyb3cuaWNvbl91cmwpIHtcbiAgICAgICAgaXNzdWVzLnB1c2goeyBpc3N1ZVR5cGU6ICdtaXNzaW5nLWltYWdlJywgc2V2ZXJpdHk6ICdpbmZvJywgY29sbGVjdGlvbjogY29sbGVjdGlvbktleSwgdGFyZ2V0RG9jdW1lbnRJZDogZG9jdW1lbnRJZCwgbWVzc2FnZTogJ+WPi+aDhemTvuaOpee8uuWwkeWbvuaghycgfSlcbiAgICAgIH1cbiAgICAgIGlmICghcm93LnVybCkge1xuICAgICAgICBpc3N1ZXMucHVzaCh7IGlzc3VlVHlwZTogJ21pc3NpbmctbGluaycsIHNldmVyaXR5OiAnZXJyb3InLCBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uS2V5LCB0YXJnZXREb2N1bWVudElkOiBkb2N1bWVudElkLCBtZXNzYWdlOiAn5Y+L5oOF6ZO+5o6l57y65bCR6Lez6L2s6ZO+5o6lJyB9KVxuICAgICAgfSBlbHNlIGlmICghaXNVc2FibGVVcmwocm93LnVybCkpIHtcbiAgICAgICAgaXNzdWVzLnB1c2goeyBpc3N1ZVR5cGU6ICdkZWFkLWxpbmsnLCBzZXZlcml0eTogJ2Vycm9yJywgY29sbGVjdGlvbjogY29sbGVjdGlvbktleSwgdGFyZ2V0RG9jdW1lbnRJZDogZG9jdW1lbnRJZCwgbWVzc2FnZTogJ+WPi+aDhemTvuaOpeS4jeaYr+acieaViCBVUkwnIH0pXG4gICAgICB9XG4gICAgICBpZiAoIXJvdy50aXRsZV9qc29uKSB7XG4gICAgICAgIGlzc3Vlcy5wdXNoKHsgaXNzdWVUeXBlOiAnZW1wdHktZmllbGQnLCBzZXZlcml0eTogJ2Vycm9yJywgY29sbGVjdGlvbjogY29sbGVjdGlvbktleSwgdGFyZ2V0RG9jdW1lbnRJZDogZG9jdW1lbnRJZCwgbWVzc2FnZTogJ+WPi+aDhemTvuaOpee8uuWwkeagh+mimCcgfSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXJvdy5wdWJsaXNoZWRfYXQpIHtcbiAgICAgIGlzc3Vlcy5wdXNoKHsgaXNzdWVUeXBlOiAnZHJhZnQnLCBzZXZlcml0eTogJ2luZm8nLCBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uS2V5LCB0YXJnZXREb2N1bWVudElkOiBkb2N1bWVudElkLCBtZXNzYWdlOiAn5LuN5aSE5LqO6I2J56i/54q25oCBJyB9KVxuICAgIH1cbiAgfVxuICByZXR1cm4gaXNzdWVzXG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVRdWFsaXR5U2NhbihcbiAgYzogQ29udGV4dDx7IEJpbmRpbmdzOiB7IERCOiBEMURhdGFiYXNlIH07IFZhcmlhYmxlczogUmVjb3JkPHN0cmluZywgbmV2ZXI+IH0+XG4pOiBQcm9taXNlPFJlc3BvbnNlPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgYmF0Y2hJZCA9IGNyeXB0by5yYW5kb21VVUlEKClcbiAgICBsZXQgY291bnQgPSAwXG5cbiAgICBmb3IgKGNvbnN0IFtrZXksIGRlZl0gb2YgT2JqZWN0LmVudHJpZXMoQ09MTEVDVElPTlMpKSB7XG4gICAgICBpZiAoIVsnZXZlbnRzJywgJ3N0dWRlbnRzJywgJ2Fubm91bmNlbWVudHMnLCAnZnJpZW5kLWxpbmtzJ10uaW5jbHVkZXMoa2V5KSkgY29udGludWVcbiAgICAgIGNvbnN0IHsgcmVzdWx0cyB9ID0gYXdhaXQgYy5lbnYuREIucHJlcGFyZShgU0VMRUNUICogRlJPTSAke2RlZi50YWJsZX1gKS5hbGw8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+KClcbiAgICAgIGNvbnN0IGRyYWZ0cyA9IHNjYW5Db2xsZWN0aW9uKGtleSwgcmVzdWx0cylcblxuICAgICAgLy8g5YWI5riF5ZCMIGNvbGxlY3Rpb24g5pen5om55qyh77yM5YaN5YaZ5paw5om55qyhXG4gICAgICBhd2FpdCBjLmVudi5EQi5wcmVwYXJlKCdERUxFVEUgRlJPTSBjb250ZW50X3F1YWxpdHlfaXNzdWVzIFdIRVJFIGNvbGxlY3Rpb24gPSA/MScpLmJpbmQoa2V5KS5ydW4oKVxuXG4gICAgICBmb3IgKGNvbnN0IGRyYWZ0IG9mIGRyYWZ0cykge1xuICAgICAgICBhd2FpdCBjLmVudi5EQi5wcmVwYXJlKFxuICAgICAgICAgIGBJTlNFUlQgSU5UTyBjb250ZW50X3F1YWxpdHlfaXNzdWVzIChpc3N1ZV90eXBlLCBjb2xsZWN0aW9uLCB0YXJnZXRfZG9jdW1lbnRfaWQsIGRldGFpbF9qc29uLCBiYXRjaF9pZCwgY3JlYXRlZF9hdClcbiAgICAgICAgICAgVkFMVUVTICg/MSwgPzIsID8zLCA/NCwgPzUsID82KWBcbiAgICAgICAgKVxuICAgICAgICAgIC5iaW5kKGRyYWZ0Lmlzc3VlVHlwZSwgZHJhZnQuY29sbGVjdGlvbiwgZHJhZnQudGFyZ2V0RG9jdW1lbnRJZCwgSlNPTi5zdHJpbmdpZnkoeyBzZXZlcml0eTogZHJhZnQuc2V2ZXJpdHkgPz8gJ3dhcm5pbmcnLCBtZXNzYWdlOiBkcmFmdC5tZXNzYWdlIH0pLCBiYXRjaElkLCBEYXRlLm5vdygpKVxuICAgICAgICAgIC5ydW4oKVxuICAgICAgICBjb3VudCsrXG4gICAgICB9XG4gICAgfVxuXG4gICAgYXdhaXQgcmVjb3JkQXVkaXRMb2coYyBhcyBuZXZlciwge1xuICAgICAgYWN0aW9uOiAndXBkYXRlJyxcbiAgICAgIHRhcmdldENvbGxlY3Rpb246ICdjb250ZW50LXF1YWxpdHktaXNzdWVzJyxcbiAgICAgIHBheWxvYWRTdW1tYXJ5OiBg5YaF5a656LSo6YeP5omr5o+P5a6M5oiQ77yM5Y+R546wICR7Y291bnR9IOS4qumXrumimGAsXG4gICAgfSlcblxuICAgIHJldHVybiBvayh7IHN1Y2Nlc3M6IHRydWUsIGNvdW50IH0pXG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgcmV0dXJuIGZhaWwoNDAwLCBgc2Nhbl9mYWlsZWQ6JHsoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2V9YClcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlUXVhbGl0eUlzc3Vlc0xpc3QoXG4gIGM6IENvbnRleHQ8eyBCaW5kaW5nczogeyBEQjogRDFEYXRhYmFzZSB9OyBWYXJpYWJsZXM6IFJlY29yZDxzdHJpbmcsIG5ldmVyPiB9PlxuKTogUHJvbWlzZTxSZXNwb25zZT4ge1xuICBjb25zdCBwYWdlID0gTWF0aC5tYXgoMSwgTnVtYmVyKGMucmVxLnF1ZXJ5KCdwYWdlJykgfHwgJzEnKSB8fCAxKVxuICBjb25zdCBwYWdlU2l6ZSA9IE1hdGgubWluKDEwMCwgTWF0aC5tYXgoMSwgTnVtYmVyKGMucmVxLnF1ZXJ5KCdwYWdlU2l6ZScpIHx8ICcyMCcpIHx8IDIwKSlcblxuICBjb25zdCB3aGVyZTogc3RyaW5nW10gPSBbXVxuICBjb25zdCBiaW5kczogdW5rbm93bltdID0gW11cbiAgY29uc3QgY29sbGVjdGlvbkZpbHRlciA9IGMucmVxLnF1ZXJ5KCdjb2xsZWN0aW9uJylcbiAgaWYgKGNvbGxlY3Rpb25GaWx0ZXIgJiYgY29sbGVjdGlvbkZpbHRlciAhPT0gJ2FsbCcpIHtcbiAgICB3aGVyZS5wdXNoKGBjb2xsZWN0aW9uID0gPyR7YmluZHMubGVuZ3RoICsgMX1gKVxuICAgIGJpbmRzLnB1c2goY29sbGVjdGlvbkZpbHRlcilcbiAgfVxuICBjb25zdCBpc3N1ZVR5cGUgPSBjLnJlcS5xdWVyeSgnaXNzdWVUeXBlJylcbiAgaWYgKGlzc3VlVHlwZSAmJiBpc3N1ZVR5cGUgIT09ICdhbGwnKSB7XG4gICAgd2hlcmUucHVzaChgaXNzdWVfdHlwZSA9ID8ke2JpbmRzLmxlbmd0aCArIDF9YClcbiAgICBiaW5kcy5wdXNoKGlzc3VlVHlwZSlcbiAgfVxuICBjb25zdCB3aGVyZVNxbCA9IHdoZXJlLmxlbmd0aCA+IDAgPyBgV0hFUkUgJHt3aGVyZS5qb2luKCcgQU5EICcpfWAgOiAnJ1xuXG4gIGNvbnN0IHRvdGFsUm93ID0gYXdhaXQgYy5lbnYuREIucHJlcGFyZShgU0VMRUNUIENPVU5UKCopIEFTIG4gRlJPTSBjb250ZW50X3F1YWxpdHlfaXNzdWVzICR7d2hlcmVTcWx9YClcbiAgICAuYmluZCguLi5iaW5kcylcbiAgICAuZmlyc3Q8eyBuOiBudW1iZXIgfT4oKVxuICBjb25zdCB0b3RhbCA9IHRvdGFsUm93Py5uID8/IDBcblxuICBjb25zdCB7IHJlc3VsdHMgfSA9IGF3YWl0IGMuZW52LkRCLnByZXBhcmUoXG4gICAgYFNFTEVDVCAqIEZST00gY29udGVudF9xdWFsaXR5X2lzc3VlcyAke3doZXJlU3FsfSBPUkRFUiBCWSBjcmVhdGVkX2F0IERFU0MgTElNSVQgPyR7YmluZHMubGVuZ3RoICsgMX0gT0ZGU0VUID8ke2JpbmRzLmxlbmd0aCArIDJ9YFxuICApXG4gICAgLmJpbmQoLi4uYmluZHMsIHBhZ2VTaXplLCAocGFnZSAtIDEpICogcGFnZVNpemUpXG4gICAgLmFsbDx7XG4gICAgICBpZDogbnVtYmVyXG4gICAgICBpc3N1ZV90eXBlOiBzdHJpbmdcbiAgICAgIHNldmVyaXR5OiBzdHJpbmcgfCBudWxsXG4gICAgICBzdGF0dXM6IHN0cmluZyB8IG51bGxcbiAgICAgIGNvbGxlY3Rpb246IHN0cmluZ1xuICAgICAgdGFyZ2V0X2RvY3VtZW50X2lkOiBzdHJpbmcgfCBudWxsXG4gICAgICBkZXRhaWxfanNvbjogc3RyaW5nIHwgbnVsbFxuICAgICAgYmF0Y2hfaWQ6IHN0cmluZyB8IG51bGxcbiAgICAgIGNyZWF0ZWRfYXQ6IG51bWJlclxuICAgIH0+KClcblxuICBpbnRlcmZhY2UgUXVhbGl0eUlzc3VlUm93IHtcbiAgICBpc3N1ZVR5cGU6IHN0cmluZ1xuICAgIHNldmVyaXR5OiBzdHJpbmdcbiAgICBzdGF0dXM6IHN0cmluZ1xuICAgIGNvbGxlY3Rpb246IHN0cmluZ1xuICAgIG1lc3NhZ2U6IHN0cmluZ1xuICB9XG5cblxuXG4gIGNvbnN0IGRhdGEgPSByZXN1bHRzLm1hcCgocm93KTogUXVhbGl0eUlzc3VlUm93ICYgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPT4ge1xuICAgIGxldCBzZXZlcml0eSA9IHJvdy5zZXZlcml0eSA/PyAnd2FybmluZydcbiAgICBsZXQgbWVzc2FnZSA9ICcnXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRldGFpbCA9IHJvdy5kZXRhaWxfanNvbiA/IChKU09OLnBhcnNlKHJvdy5kZXRhaWxfanNvbikgYXMgeyBzZXZlcml0eT86IHN0cmluZzsgbWVzc2FnZT86IHN0cmluZyB9KSA6IG51bGxcbiAgICAgIGlmIChkZXRhaWw/LnNldmVyaXR5KSBzZXZlcml0eSA9IGRldGFpbC5zZXZlcml0eVxuICAgICAgaWYgKGRldGFpbD8ubWVzc2FnZSkgbWVzc2FnZSA9IGRldGFpbC5tZXNzYWdlXG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBkZXRhaWwg6Z2e5rOV5pe25L+d5oyB6buY6K6kXG4gICAgfVxuICAgIGNvbnN0IHBheWxvYWQ6IFF1YWxpdHlJc3N1ZVJvdyAmIFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge1xuICAgICAgaXNzdWVUeXBlOiByb3cuaXNzdWVfdHlwZSxcbiAgICAgIHNldmVyaXR5LFxuICAgICAgc3RhdHVzOiByb3cuc3RhdHVzID8/ICdvcGVuJyxcbiAgICAgIGNvbGxlY3Rpb246IHJvdy5jb2xsZWN0aW9uLFxuICAgICAgbWVzc2FnZSxcbiAgICAgIGlkOiBTdHJpbmcocm93LmlkKSxcbiAgICAgIGRvY3VtZW50SWQ6IHJvdy5iYXRjaF9pZCA/PyBTdHJpbmcocm93LmlkKSxcbiAgICAgIHRhcmdldERvY3VtZW50SWQ6IHJvdy50YXJnZXRfZG9jdW1lbnRfaWQsXG4gICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKHJvdy5jcmVhdGVkX2F0KS50b0lTT1N0cmluZygpLFxuICAgIH1cbiAgICByZXR1cm4gcGF5bG9hZFxuICB9KVxuXG4gIHJldHVybiBva1BhZ2luYXRlZChkYXRhLCBwYWdpbmF0aW9uT2YocGFnZSwgcGFnZVNpemUsIHRvdGFsKSlcbn1cbiJdLCJmaWxlIjoiL1VzZXJzL2thcmEvQ29kZS9TY2hhbGUtTGlicmFyeS9zZXJ2ZXIvc3JjL3BhbmVsL3F1YWxpdHkudHMifQ==
