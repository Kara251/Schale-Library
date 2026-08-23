// /Users/kara/Code/Schale-Library/server/src/panel/bulk.ts
const __vite_ssr_import_0__ = await __vite_ssr_import__("/src/lib/respond.ts", {"importedNames":["fail","ok"]});
const __vite_ssr_import_1__ = await __vite_ssr_import__("/src/panel/collections.ts", {"importedNames":["COLLECTIONS"]});
const __vite_ssr_import_2__ = await __vite_ssr_import__("/src/panel/audit.ts", {"importedNames":["recordAuditLog"]});



async function handleBulkAction(c) {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return __vite_ssr_import_0__.fail(400, "invalid_request");
  }
  const collectionKey = typeof body.collection === "string" ? body.collection : "";
  if (!Object.hasOwn(__vite_ssr_import_1__.COLLECTIONS, collectionKey)) return __vite_ssr_import_0__.fail(404, "unknown_collection");
  const def = __vite_ssr_import_1__.COLLECTIONS[collectionKey];
  if (def.readOnly) return __vite_ssr_import_0__.fail(400, "read_only_collection");
  const action = typeof body.action === "string" ? body.action : "";
  if (!["publish", "unpublish", "delete", "set-student-organization"].includes(action)) {
    return __vite_ssr_import_0__.fail(400, "unsupported_bulk_action");
  }
  if ((action === "publish" || action === "unpublish") && !def.supportsDraft) {
    return __vite_ssr_import_0__.fail(400, "collection_does_not_support_draft");
  }
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return __vite_ssr_import_0__.fail(400, "ids_required");
  }
  const documentIds = body.ids.filter((id) => typeof id === "string" && id.length > 0);
  if (documentIds.length === 0) {
    return __vite_ssr_import_0__.fail(400, "ids_invalid");
  }
  const organization = action === "set-student-organization" ? typeof body.organization === "string" ? body.organization : "" : void 0;
  if (action === "set-student-organization" && collectionKey !== "students") {
    return __vite_ssr_import_0__.fail(400, "action_only_for_students");
  }
  const now = Date.now();
  const errors = [];
  let updated = 0;
  for (const documentId of documentIds) {
    try {
      if (action === "delete") {
        const result = await c.env.DB.prepare(`DELETE FROM ${def.table} WHERE document_id = ?1`).bind(documentId).run();
        if (!result.meta.changes) throw new Error("not_found");
      } else if (action === "set-student-organization") {
        await c.env.DB.prepare(`UPDATE ${def.table} SET organization = ?1, updated_at = ?2 WHERE document_id = ?3`).bind(organization, now, documentId).run();
        updated++;
      } else {
        const published = action === "publish" ? now : null;
        await c.env.DB.prepare(`UPDATE ${def.table} SET published_at = ?1, updated_at = ?2 WHERE document_id = ?3`).bind(published, now, documentId).run();
        updated++;
      }
    } catch (error) {
      errors.push(`#${documentId}: ${error.message}`);
    }
  }
  const auditAction = action === "publish" ? "publish" : action === "delete" ? "delete" : "update";
  await __vite_ssr_import_2__.recordAuditLog(c, {
    action: auditAction,
    targetCollection: collectionKey,
    payloadSummary: `批量 ${action}: 成功 ${updated}/${documentIds.length}`
  });
  return __vite_ssr_import_0__.ok({
    success: errors.length === 0,
    updated,
    failed: errors.length,
    errors
  });
}
Object.defineProperty(__vite_ssr_exports__, "handleBulkAction", { enumerable: true, configurable: true, get(){ return handleBulkAction }});

//# sourceMappingSource=vite-node
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUEsSUFDM0I7QUFBQSxJQUNBLFFBQVEsT0FBTztBQUFBLElBQ2Y7QUFBQSxFQUNGLENBQUM7QUFDSDsySUFBQSIsIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiYnVsay50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIOaJuemHj+aTjeS9nO+8mlBPU1QgL3BhbmVsL2J1bGstYWN0aW9uIHtjb2xsZWN0aW9uLCBhY3Rpb24sIGlkc1tdfVxuICogcHVibGlzaCAvIHVucHVibGlzaCAvIGRlbGV0ZSAvIHNldC1zdHVkZW50LW9yZ2FuaXphdGlvblxuICog6L+U5ZueIHsgc3VjY2VzcywgdXBkYXRlZCwgZmFpbGVkLCBlcnJvcnNbXSB977yM6YCQ5p2h5a656ZSZ44CCXG4gKi9cbmltcG9ydCB0eXBlIHsgQ29udGV4dCB9IGZyb20gJ2hvbm8nXG5pbXBvcnQgeyBmYWlsLCBvayB9IGZyb20gJy4uL2xpYi9yZXNwb25kJ1xuaW1wb3J0IHsgQ09MTEVDVElPTlMgfSBmcm9tICcuL2NvbGxlY3Rpb25zJ1xuaW1wb3J0IHsgcmVjb3JkQXVkaXRMb2csIHR5cGUgQXVkaXRBY3Rpb24gfSBmcm9tICcuL2F1ZGl0J1xuXG5pbnRlcmZhY2UgQnVsa0JvZHkge1xuICBjb2xsZWN0aW9uPzogdW5rbm93blxuICBhY3Rpb24/OiB1bmtub3duXG4gIGlkcz86IHVua25vd25cbiAgb3JnYW5pemF0aW9uPzogdW5rbm93blxuICBsb2NhbGU/OiB1bmtub3duXG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVCdWxrQWN0aW9uKFxuICBjOiBDb250ZXh0PHsgQmluZGluZ3M6IHsgREI6IEQxRGF0YWJhc2UgfTsgVmFyaWFibGVzOiBSZWNvcmQ8c3RyaW5nLCBuZXZlcj4gfT5cbik6IFByb21pc2U8UmVzcG9uc2U+IHtcbiAgbGV0IGJvZHk6IEJ1bGtCb2R5XG4gIHRyeSB7XG4gICAgYm9keSA9IChhd2FpdCBjLnJlcS5qc29uKCkpIGFzIEJ1bGtCb2R5XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBmYWlsKDQwMCwgJ2ludmFsaWRfcmVxdWVzdCcpXG4gIH1cblxuICBjb25zdCBjb2xsZWN0aW9uS2V5ID0gdHlwZW9mIGJvZHkuY29sbGVjdGlvbiA9PT0gJ3N0cmluZycgPyBib2R5LmNvbGxlY3Rpb24gOiAnJ1xuICBpZiAoIU9iamVjdC5oYXNPd24oQ09MTEVDVElPTlMsIGNvbGxlY3Rpb25LZXkpKSByZXR1cm4gZmFpbCg0MDQsICd1bmtub3duX2NvbGxlY3Rpb24nKVxuICBjb25zdCBkZWYgPSBDT0xMRUNUSU9OU1tjb2xsZWN0aW9uS2V5XVxuICBpZiAoZGVmLnJlYWRPbmx5KSByZXR1cm4gZmFpbCg0MDAsICdyZWFkX29ubHlfY29sbGVjdGlvbicpXG5cbiAgY29uc3QgYWN0aW9uID0gdHlwZW9mIGJvZHkuYWN0aW9uID09PSAnc3RyaW5nJyA/IGJvZHkuYWN0aW9uIDogJydcbiAgaWYgKCFbJ3B1Ymxpc2gnLCAndW5wdWJsaXNoJywgJ2RlbGV0ZScsICdzZXQtc3R1ZGVudC1vcmdhbml6YXRpb24nXS5pbmNsdWRlcyhhY3Rpb24pKSB7XG4gICAgcmV0dXJuIGZhaWwoNDAwLCAndW5zdXBwb3J0ZWRfYnVsa19hY3Rpb24nKVxuICB9XG4gIGlmICgoYWN0aW9uID09PSAncHVibGlzaCcgfHwgYWN0aW9uID09PSAndW5wdWJsaXNoJykgJiYgIWRlZi5zdXBwb3J0c0RyYWZ0KSB7XG4gICAgcmV0dXJuIGZhaWwoNDAwLCAnY29sbGVjdGlvbl9kb2VzX25vdF9zdXBwb3J0X2RyYWZ0JylcbiAgfVxuXG4gIGlmICghQXJyYXkuaXNBcnJheShib2R5LmlkcykgfHwgYm9keS5pZHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIGZhaWwoNDAwLCAnaWRzX3JlcXVpcmVkJylcbiAgfVxuICBjb25zdCBkb2N1bWVudElkcyA9IGJvZHkuaWRzLmZpbHRlcigoaWQpOiBpZCBpcyBzdHJpbmcgPT4gdHlwZW9mIGlkID09PSAnc3RyaW5nJyAmJiBpZC5sZW5ndGggPiAwKVxuICBpZiAoZG9jdW1lbnRJZHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIGZhaWwoNDAwLCAnaWRzX2ludmFsaWQnKVxuICB9XG5cbiAgY29uc3Qgb3JnYW5pemF0aW9uID1cbiAgICBhY3Rpb24gPT09ICdzZXQtc3R1ZGVudC1vcmdhbml6YXRpb24nXG4gICAgICA/IHR5cGVvZiBib2R5Lm9yZ2FuaXphdGlvbiA9PT0gJ3N0cmluZydcbiAgICAgICAgPyBib2R5Lm9yZ2FuaXphdGlvblxuICAgICAgICA6ICcnXG4gICAgICA6IHVuZGVmaW5lZFxuICBpZiAoYWN0aW9uID09PSAnc2V0LXN0dWRlbnQtb3JnYW5pemF0aW9uJyAmJiBjb2xsZWN0aW9uS2V5ICE9PSAnc3R1ZGVudHMnKSB7XG4gICAgcmV0dXJuIGZhaWwoNDAwLCAnYWN0aW9uX29ubHlfZm9yX3N0dWRlbnRzJylcbiAgfVxuXG4gIGNvbnN0IG5vdyA9IERhdGUubm93KClcbiAgY29uc3QgZXJyb3JzOiBzdHJpbmdbXSA9IFtdXG4gIGxldCB1cGRhdGVkID0gMFxuXG4gIGZvciAoY29uc3QgZG9jdW1lbnRJZCBvZiBkb2N1bWVudElkcykge1xuICAgIHRyeSB7XG4gICAgICBpZiAoYWN0aW9uID09PSAnZGVsZXRlJykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjLmVudi5EQi5wcmVwYXJlKGBERUxFVEUgRlJPTSAke2RlZi50YWJsZX0gV0hFUkUgZG9jdW1lbnRfaWQgPSA/MWApXG4gICAgICAgICAgLmJpbmQoZG9jdW1lbnRJZClcbiAgICAgICAgICAucnVuKClcbiAgICAgICAgaWYgKCFyZXN1bHQubWV0YS5jaGFuZ2VzKSB0aHJvdyBuZXcgRXJyb3IoJ25vdF9mb3VuZCcpXG4gICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gJ3NldC1zdHVkZW50LW9yZ2FuaXphdGlvbicpIHtcbiAgICAgICAgYXdhaXQgYy5lbnYuREIucHJlcGFyZShgVVBEQVRFICR7ZGVmLnRhYmxlfSBTRVQgb3JnYW5pemF0aW9uID0gPzEsIHVwZGF0ZWRfYXQgPSA/MiBXSEVSRSBkb2N1bWVudF9pZCA9ID8zYClcbiAgICAgICAgICAuYmluZChvcmdhbml6YXRpb24sIG5vdywgZG9jdW1lbnRJZClcbiAgICAgICAgICAucnVuKClcbiAgICAgICAgdXBkYXRlZCsrXG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBwdWJsaXNoIOKGkiBwdWJsaXNoZWRfYXQgPSBub3fvvJt1bnB1Ymxpc2gg4oaSIHB1Ymxpc2hlZF9hdCA9IE5VTExcbiAgICAgICAgY29uc3QgcHVibGlzaGVkID0gYWN0aW9uID09PSAncHVibGlzaCcgPyBub3cgOiBudWxsXG4gICAgICAgIGF3YWl0IGMuZW52LkRCLnByZXBhcmUoYFVQREFURSAke2RlZi50YWJsZX0gU0VUIHB1Ymxpc2hlZF9hdCA9ID8xLCB1cGRhdGVkX2F0ID0gPzIgV0hFUkUgZG9jdW1lbnRfaWQgPSA/M2ApXG4gICAgICAgICAgLmJpbmQocHVibGlzaGVkLCBub3csIGRvY3VtZW50SWQpXG4gICAgICAgICAgLnJ1bigpXG4gICAgICAgIHVwZGF0ZWQrK1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBlcnJvcnMucHVzaChgIyR7ZG9jdW1lbnRJZH06ICR7KGVycm9yIGFzIEVycm9yKS5tZXNzYWdlfWApXG4gICAgfVxuICB9XG5cbiAgY29uc3QgYXVkaXRBY3Rpb246IEF1ZGl0QWN0aW9uID1cbiAgICBhY3Rpb24gPT09ICdwdWJsaXNoJyA/ICdwdWJsaXNoJyA6IGFjdGlvbiA9PT0gJ2RlbGV0ZScgPyAnZGVsZXRlJyA6ICd1cGRhdGUnXG4gIGF3YWl0IHJlY29yZEF1ZGl0TG9nKGMgYXMgbmV2ZXIsIHtcbiAgICBhY3Rpb246IGF1ZGl0QWN0aW9uLFxuICAgIHRhcmdldENvbGxlY3Rpb246IGNvbGxlY3Rpb25LZXksXG4gICAgcGF5bG9hZFN1bW1hcnk6IGDmibnph48gJHthY3Rpb259OiDmiJDlip8gJHt1cGRhdGVkfS8ke2RvY3VtZW50SWRzLmxlbmd0aH1gLFxuICB9KVxuXG4gIHJldHVybiBvayh7XG4gICAgc3VjY2VzczogZXJyb3JzLmxlbmd0aCA9PT0gMCxcbiAgICB1cGRhdGVkLFxuICAgIGZhaWxlZDogZXJyb3JzLmxlbmd0aCxcbiAgICBlcnJvcnMsXG4gIH0pXG59XG4iXSwiZmlsZSI6Ii9Vc2Vycy9rYXJhL0NvZGUvU2NoYWxlLUxpYnJhcnkvc2VydmVyL3NyYy9wYW5lbC9idWxrLnRzIn0=
