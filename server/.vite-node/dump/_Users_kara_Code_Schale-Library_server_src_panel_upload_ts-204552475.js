// /Users/kara/Code/Schale-Library/server/src/panel/upload.ts
const __vite_ssr_import_0__ = await __vite_ssr_import__("/src/lib/respond.ts", {"importedNames":["fail","ok"]});
const __vite_ssr_import_1__ = await __vite_ssr_import__("/src/panel/audit.ts", {"importedNames":["recordAuditLog"]});


const MB = 1024 * 1024;
function limitForField(fieldName) {
  if (fieldName === "avatar") return 4 * MB;
  if (fieldName === "coverImage" || fieldName === "cover_image") return 12 * MB;
  return 8 * MB;
}
function sniffImageType(bytes) {
  if (bytes.length < 12) return null;
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpeg";
  if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) return "png";
  if (bytes[0] === 71 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 56) return "gif";
  if (bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70 && bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80) {
    return "webp";
  }
  return null;
}
const EXT_BY_TYPE = { jpeg: "jpg", png: "png", webp: "webp", gif: "gif" };
async function handleUpload(c) {
  let form;
  try {
    form = await c.req.formData();
  } catch {
    return __vite_ssr_import_0__.fail(400, "invalid_multipart");
  }
  const files = form.getAll("files").filter(
    (entry) => typeof entry === "object" && entry !== null && "arrayBuffer" in entry
  );
  if (files.length === 0) return __vite_ssr_import_0__.fail(400, "no_file");
  const fieldNameRaw = form.get("fieldName");
  const fieldName = typeof fieldNameRaw === "string" ? fieldNameRaw : void 0;
  const collectionRaw = form.get("collection");
  const targetCollection = typeof collectionRaw === "string" ? collectionRaw : "upload";
  const maxBytes = limitForField(fieldName);
  const assets = [];
  for (const file of files) {
    if (file.size > maxBytes) {
      await __vite_ssr_import_1__.recordAuditLog(c, {
        action: "upload",
        targetCollection,
        payloadSummary: `上传失败：文件 ${file.name} 超过 ${Math.round(maxBytes / MB)} MB 限制`
      });
      return __vite_ssr_import_0__.fail(400, "file_too_large");
    }
    const buffer = new Uint8Array(await file.arrayBuffer());
    const imageType = sniffImageType(buffer);
    if (!imageType) {
      await __vite_ssr_import_1__.recordAuditLog(c, {
        action: "upload",
        targetCollection,
        payloadSummary: `上传失败：文件 ${file.name} 类型不被允许`
      });
      return __vite_ssr_import_0__.fail(400, "unsupported_media_type");
    }
    if (!c.env.UPLOADS) {
      return __vite_ssr_import_0__.fail(500, "r2_not_configured");
    }
    const key = `panel/${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.${EXT_BY_TYPE[imageType]}`;
    await c.env.UPLOADS.put(key, buffer, {
      httpMetadata: { contentType: `image/${imageType}` }
    });
    assets.push({
      id: key,
      url: `/media/${key}`,
      name: file.name,
      alternativeText: null
    });
  }
  await __vite_ssr_import_1__.recordAuditLog(c, {
    action: "upload",
    targetCollection,
    payloadSummary: `上传 ${assets.length} 个文件${fieldName ? `（字段 ${fieldName}）` : ""}`
  });
  return __vite_ssr_import_0__.ok(assets);
}
Object.defineProperty(__vite_ssr_exports__, "handleUpload", { enumerable: true, configurable: true, get(){ return handleUpload }});

//# sourceMappingSource=vite-node
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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LElBQUksT0FBTyxXQUFXLEVBQUUsTUFBTSxHQUFHLENBQUMsQ0FBQyxJQUFJLFlBQVksU0FBUyxDQUFDO0FBQ3pHLFVBQU0sRUFBRSxJQUFJLFFBQVEsSUFBSSxLQUFLLFFBQVE7QUFBQSxNQUNuQyxjQUFjLEVBQUUsYUFBYSxTQUFTLFNBQVMsR0FBRztBQUFBLElBQ3BELENBQUM7QUFFRCxXQUFPLEtBQUs7QUFBQSxNQUNWLElBQUk7QUFBQSxNQUNKLEtBQUssVUFBVSxHQUFHO0FBQUEsTUFDbEIsTUFBTSxLQUFLO0FBQUEsTUFDWCxpQkFBaUI7QUFBQSxJQUNuQixDQUFDO0FBQUEsRUFDSDtBQUVBLFFBQU0scUNBQWUsR0FBWTtBQUFBLElBQy9CLFFBQVE7QUFBQSxJQUNSO0FBQUEsSUFDQSxnQkFBZ0IsTUFBTSxPQUFPLE1BQU0sT0FBTyxZQUFZLE9BQU8sU0FBUyxNQUFNLEVBQUU7QUFBQSxFQUNoRixDQUFDO0FBRUQsU0FBTyx5QkFBRyxNQUFNO0FBQ2xCO21JQUFBIiwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJ1cGxvYWQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiDlqpLkvZPkuIrkvKDvvJpQT1NUIC9wYW5lbC91cGxvYWQgbXVsdGlwYXJ044CCXG4gKiDmoKHpqozprZTmlbDvvIhqcGVnL3BuZy93ZWJwL2dpZu+8ie+8jFNWRyDmi5Lnu53vvJtcbiAqIOWkp+Wwj+mZkOmineaMieWtl+auteexu+Wei++8mmF2YXRhciA0TUIgLyDpu5jorqQgOE1CIC8gY292ZXJJbWFnZSAxMk1C77ybXG4gKiDlrZggUjIg6L+U5ZueIHsgZGF0YTogW3sgaWQsIHVybCwgbmFtZSB9XSB944CCXG4gKi9cbmltcG9ydCB0eXBlIHsgQ29udGV4dCB9IGZyb20gJ2hvbm8nXG5pbXBvcnQgeyBmYWlsLCBvayB9IGZyb20gJy4uL2xpYi9yZXNwb25kJ1xuaW1wb3J0IHsgcmVjb3JkQXVkaXRMb2cgfSBmcm9tICcuL2F1ZGl0J1xuXG5jb25zdCBNQiA9IDEwMjQgKiAxMDI0XG5cbmZ1bmN0aW9uIGxpbWl0Rm9yRmllbGQoZmllbGROYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQpOiBudW1iZXIge1xuICBpZiAoZmllbGROYW1lID09PSAnYXZhdGFyJykgcmV0dXJuIDQgKiBNQlxuICBpZiAoZmllbGROYW1lID09PSAnY292ZXJJbWFnZScgfHwgZmllbGROYW1lID09PSAnY292ZXJfaW1hZ2UnKSByZXR1cm4gMTIgKiBNQlxuICByZXR1cm4gOCAqIE1CXG59XG5cbi8qKiDprZTmlbDll4XmjqLvvJrlj6rmlL7ooYwganBlZyAvIHBuZyAvIHdlYnAgLyBnaWbvvJtTVkcg5LiA5b6L5ouS57ud44CCICovXG5mdW5jdGlvbiBzbmlmZkltYWdlVHlwZShieXRlczogVWludDhBcnJheSk6IHN0cmluZyB8IG51bGwge1xuICBpZiAoYnl0ZXMubGVuZ3RoIDwgMTIpIHJldHVybiBudWxsXG4gIC8vIEpQRUc6IEZGIEQ4IEZGXG4gIGlmIChieXRlc1swXSA9PT0gMHhmZiAmJiBieXRlc1sxXSA9PT0gMHhkOCAmJiBieXRlc1syXSA9PT0gMHhmZikgcmV0dXJuICdqcGVnJ1xuICAvLyBQTkc6IDg5IDUwIDRFIDQ3IDBEIDBBIDFBIDBBXG4gIGlmIChieXRlc1swXSA9PT0gMHg4OSAmJiBieXRlc1sxXSA9PT0gMHg1MCAmJiBieXRlc1syXSA9PT0gMHg0ZSAmJiBieXRlc1szXSA9PT0gMHg0NykgcmV0dXJuICdwbmcnXG4gIC8vIEdJRjogNDcgNDkgNDYgMzggKEdJRjgpXG4gIGlmIChieXRlc1swXSA9PT0gMHg0NyAmJiBieXRlc1sxXSA9PT0gMHg0OSAmJiBieXRlc1syXSA9PT0gMHg0NiAmJiBieXRlc1szXSA9PT0gMHgzOCkgcmV0dXJuICdnaWYnXG4gIC8vIFdFQlA6IFJJRkYuLi4uV0VCUFxuICBpZiAoXG4gICAgYnl0ZXNbMF0gPT09IDB4NTIgJiYgYnl0ZXNbMV0gPT09IDB4NDkgJiYgYnl0ZXNbMl0gPT09IDB4NDYgJiYgYnl0ZXNbM10gPT09IDB4NDYgJiZcbiAgICBieXRlc1s4XSA9PT0gMHg1NyAmJiBieXRlc1s5XSA9PT0gMHg0NSAmJiBieXRlc1sxMF0gPT09IDB4NDIgJiYgYnl0ZXNbMTFdID09PSAweDUwXG4gICkge1xuICAgIHJldHVybiAnd2VicCdcbiAgfVxuICByZXR1cm4gbnVsbFxufVxuXG5jb25zdCBFWFRfQllfVFlQRTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHsganBlZzogJ2pwZycsIHBuZzogJ3BuZycsIHdlYnA6ICd3ZWJwJywgZ2lmOiAnZ2lmJyB9XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVVcGxvYWQoXG4gIGM6IENvbnRleHQ8eyBCaW5kaW5nczogeyBEQjogRDFEYXRhYmFzZTsgVVBMT0FEUz86IFIyQnVja2V0IH07IFZhcmlhYmxlczogUmVjb3JkPHN0cmluZywgbmV2ZXI+IH0+XG4pOiBQcm9taXNlPFJlc3BvbnNlPiB7XG4gIGxldCBmb3JtOiBGb3JtRGF0YVxuICB0cnkge1xuICAgIGZvcm0gPSBhd2FpdCBjLnJlcS5mb3JtRGF0YSgpXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBmYWlsKDQwMCwgJ2ludmFsaWRfbXVsdGlwYXJ0JylcbiAgfVxuXG4gIGNvbnN0IGZpbGVzID0gKGZvcm0uZ2V0QWxsKCdmaWxlcycpIGFzIHVua25vd25bXSkuZmlsdGVyKFxuICAgIChlbnRyeSk6IGVudHJ5IGlzIEZpbGUgPT4gdHlwZW9mIGVudHJ5ID09PSAnb2JqZWN0JyAmJiBlbnRyeSAhPT0gbnVsbCAmJiAnYXJyYXlCdWZmZXInIGluIGVudHJ5XG4gIClcbiAgaWYgKGZpbGVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIGZhaWwoNDAwLCAnbm9fZmlsZScpXG5cbiAgY29uc3QgZmllbGROYW1lUmF3ID0gZm9ybS5nZXQoJ2ZpZWxkTmFtZScpXG4gIGNvbnN0IGZpZWxkTmFtZSA9IHR5cGVvZiBmaWVsZE5hbWVSYXcgPT09ICdzdHJpbmcnID8gZmllbGROYW1lUmF3IDogdW5kZWZpbmVkXG4gIGNvbnN0IGNvbGxlY3Rpb25SYXcgPSBmb3JtLmdldCgnY29sbGVjdGlvbicpXG4gIGNvbnN0IHRhcmdldENvbGxlY3Rpb24gPSB0eXBlb2YgY29sbGVjdGlvblJhdyA9PT0gJ3N0cmluZycgPyBjb2xsZWN0aW9uUmF3IDogJ3VwbG9hZCdcblxuICBjb25zdCBtYXhCeXRlcyA9IGxpbWl0Rm9yRmllbGQoZmllbGROYW1lKVxuICBjb25zdCBhc3NldHM6IEFycmF5PFJlY29yZDxzdHJpbmcsIHVua25vd24+PiA9IFtdXG5cbiAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgaWYgKGZpbGUuc2l6ZSA+IG1heEJ5dGVzKSB7XG4gICAgICBhd2FpdCByZWNvcmRBdWRpdExvZyhjIGFzIG5ldmVyLCB7XG4gICAgICAgIGFjdGlvbjogJ3VwbG9hZCcsXG4gICAgICAgIHRhcmdldENvbGxlY3Rpb24sXG4gICAgICAgIHBheWxvYWRTdW1tYXJ5OiBg5LiK5Lyg5aSx6LSl77ya5paH5Lu2ICR7ZmlsZS5uYW1lfSDotoXov4cgJHtNYXRoLnJvdW5kKG1heEJ5dGVzIC8gTUIpfSBNQiDpmZDliLZgLFxuICAgICAgfSlcbiAgICAgIHJldHVybiBmYWlsKDQwMCwgJ2ZpbGVfdG9vX2xhcmdlJylcbiAgICB9XG5cbiAgICBjb25zdCBidWZmZXIgPSBuZXcgVWludDhBcnJheShhd2FpdCBmaWxlLmFycmF5QnVmZmVyKCkpXG4gICAgY29uc3QgaW1hZ2VUeXBlID0gc25pZmZJbWFnZVR5cGUoYnVmZmVyKVxuICAgIGlmICghaW1hZ2VUeXBlKSB7XG4gICAgICAvLyDlkKsgU1ZH77yI5paH5pys5Z6LIGltYWdlLyrvvInlnKjlhoXnmoTpnZ7nmb3lkI3ljZXprZTmlbDkuIDlvovmi5Lnu51cbiAgICAgIGF3YWl0IHJlY29yZEF1ZGl0TG9nKGMgYXMgbmV2ZXIsIHtcbiAgICAgICAgYWN0aW9uOiAndXBsb2FkJyxcbiAgICAgICAgdGFyZ2V0Q29sbGVjdGlvbixcbiAgICAgICAgcGF5bG9hZFN1bW1hcnk6IGDkuIrkvKDlpLHotKXvvJrmlofku7YgJHtmaWxlLm5hbWV9IOexu+Wei+S4jeiiq+WFgeiuuGAsXG4gICAgICB9KVxuICAgICAgcmV0dXJuIGZhaWwoNDAwLCAndW5zdXBwb3J0ZWRfbWVkaWFfdHlwZScpXG4gICAgfVxuXG4gICAgaWYgKCFjLmVudi5VUExPQURTKSB7XG4gICAgICByZXR1cm4gZmFpbCg1MDAsICdyMl9ub3RfY29uZmlndXJlZCcpXG4gICAgfVxuXG4gICAgY29uc3Qga2V5ID0gYHBhbmVsLyR7RGF0ZS5ub3coKS50b1N0cmluZygzNil9LSR7Y3J5cHRvLnJhbmRvbVVVSUQoKS5zbGljZSgwLCA4KX0uJHtFWFRfQllfVFlQRVtpbWFnZVR5cGVdfWBcbiAgICBhd2FpdCBjLmVudi5VUExPQURTLnB1dChrZXksIGJ1ZmZlciwge1xuICAgICAgaHR0cE1ldGFkYXRhOiB7IGNvbnRlbnRUeXBlOiBgaW1hZ2UvJHtpbWFnZVR5cGV9YCB9LFxuICAgIH0pXG5cbiAgICBhc3NldHMucHVzaCh7XG4gICAgICBpZDoga2V5LFxuICAgICAgdXJsOiBgL21lZGlhLyR7a2V5fWAsXG4gICAgICBuYW1lOiBmaWxlLm5hbWUsXG4gICAgICBhbHRlcm5hdGl2ZVRleHQ6IG51bGwsXG4gICAgfSlcbiAgfVxuXG4gIGF3YWl0IHJlY29yZEF1ZGl0TG9nKGMgYXMgbmV2ZXIsIHtcbiAgICBhY3Rpb246ICd1cGxvYWQnLFxuICAgIHRhcmdldENvbGxlY3Rpb24sXG4gICAgcGF5bG9hZFN1bW1hcnk6IGDkuIrkvKAgJHthc3NldHMubGVuZ3RofSDkuKrmlofku7Yke2ZpZWxkTmFtZSA/IGDvvIjlrZfmrrUgJHtmaWVsZE5hbWV977yJYCA6ICcnfWAsXG4gIH0pXG5cbiAgcmV0dXJuIG9rKGFzc2V0cylcbn1cbiJdLCJmaWxlIjoiL1VzZXJzL2thcmEvQ29kZS9TY2hhbGUtTGlicmFyeS9zZXJ2ZXIvc3JjL3BhbmVsL3VwbG9hZC50cyJ9
