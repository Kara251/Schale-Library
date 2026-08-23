// /Users/kara/Code/Schale-Library/server/src/panel/system-health.ts
const __vite_ssr_import_0__ = await __vite_ssr_import__("/src/lib/respond.ts", {"importedNames":["ok"]});
const __vite_ssr_import_1__ = await __vite_ssr_import__("/src/panel/collections.ts", {"importedNames":["COLLECTIONS"]});


async function handleSystemHealth(c) {
  const checks = [];
  try {
    await c.env.DB.prepare("SELECT 1 AS probe").first();
    checks.push({ key: "database", label: "Database", status: "ok", message: "D1 reachable." });
  } catch (error) {
    checks.push({ key: "database", label: "Database", status: "error", message: `D1 unreachable: ${error.message}` });
  }
  const counts = {};
  for (const [key, def] of Object.entries(__vite_ssr_import_1__.COLLECTIONS)) {
    try {
      const row = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM ${def.table}`).first();
      counts[key] = row?.n ?? 0;
    } catch (error) {
      checks.push({
        key: `collection:${key}`,
        label: `Collection ${key}`,
        status: "warning",
        message: `Count failed: ${error.message}`
      });
      counts[key] = -1;
    }
  }
  const hasError = checks.some((check) => check.status === "error");
  const hasWarning = checks.some((check) => check.status === "warning");
  return __vite_ssr_import_0__.ok(
    {
      status: hasError ? "error" : hasWarning ? "warning" : "ok",
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      environment: c.env.ENVIRONMENT ?? "development",
      collectionCounts: counts,
      checks
    }
  );
}
Object.defineProperty(__vite_ssr_exports__, "handleSystemHealth", { enumerable: true, configurable: true, get(){ return handleSystemHealth }});

//# sourceMappingSource=vite-node
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQTs7QUFLbUI7QUFDUztBQVM1QixlQUFzQixtQkFDcEIsR0FDbUI7QUFDbkIsUUFBTSxTQUF3QixDQUFDO0FBRy9CLE1BQUk7QUFDRixVQUFNLEVBQUUsSUFBSSxHQUFHLFFBQVEsbUJBQW1CLEVBQUUsTUFBTTtBQUNsRCxXQUFPLEtBQUssRUFBRSxLQUFLLFlBQVksT0FBTyxZQUFZLFFBQVEsTUFBTSxTQUFTLGdCQUFnQixDQUFDO0FBQUEsRUFDNUYsU0FBUyxPQUFPO0FBQ2QsV0FBTyxLQUFLLEVBQUUsS0FBSyxZQUFZLE9BQU8sWUFBWSxRQUFRLFNBQVMsU0FBUyxtQkFBb0IsTUFBZ0IsT0FBTyxHQUFHLENBQUM7QUFBQSxFQUM3SDtBQUdBLFFBQU0sU0FBaUMsQ0FBQztBQUN4QyxhQUFXLENBQUMsS0FBSyxHQUFHLEtBQUssT0FBTyxRQUFRLGlDQUFXLEdBQUc7QUFDcEQsUUFBSTtBQUNGLFlBQU0sTUFBTSxNQUFNLEVBQUUsSUFBSSxHQUFHLFFBQVEsNkJBQTZCLElBQUksS0FBSyxFQUFFLEVBQUUsTUFBcUI7QUFDbEcsYUFBTyxHQUFHLElBQUksS0FBSyxLQUFLO0FBQUEsSUFDMUIsU0FBUyxPQUFPO0FBQ2QsYUFBTyxLQUFLO0FBQUEsUUFDVixLQUFLLGNBQWMsR0FBRztBQUFBLFFBQ3RCLE9BQU8sY0FBYyxHQUFHO0FBQUEsUUFDeEIsUUFBUTtBQUFBLFFBQ1IsU0FBUyxpQkFBa0IsTUFBZ0IsT0FBTztBQUFBLE1BQ3BELENBQUM7QUFDRCxhQUFPLEdBQUcsSUFBSTtBQUFBLElBQ2hCO0FBQUEsRUFDRjtBQUVBLFFBQU0sV0FBVyxPQUFPLEtBQUssQ0FBQyxVQUFVLE1BQU0sV0FBVyxPQUFPO0FBQ2hFLFFBQU0sYUFBYSxPQUFPLEtBQUssQ0FBQyxVQUFVLE1BQU0sV0FBVyxTQUFTO0FBRXBFLFNBQU87QUFBQSxJQUNMO0FBQUEsTUFDRSxRQUFRLFdBQVcsVUFBVSxhQUFhLFlBQVk7QUFBQSxNQUN0RCxjQUFhLG9CQUFJLEtBQUssR0FBRSxZQUFZO0FBQUEsTUFDcEMsYUFBYSxFQUFFLElBQUksZUFBZTtBQUFBLE1BQ2xDLGtCQUFrQjtBQUFBLE1BQ2xCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRjsrSUFBQSIsIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsic3lzdGVtLWhlYWx0aC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIOezu+e7n+WBpeW6t++8mkdFVCAvcGFuZWwvc3lzdGVtLWhlYWx0aFxuICogREIg6L+e6YCaICsg5ZCE6ZuG5ZCI6K6h5pWw77ybUlNTSHViIOW3sumAgOW9ue+8jOaXoOivpemhueOAglxuICovXG5pbXBvcnQgdHlwZSB7IENvbnRleHQgfSBmcm9tICdob25vJ1xuaW1wb3J0IHsgb2sgfSBmcm9tICcuLi9saWIvcmVzcG9uZCdcbmltcG9ydCB7IENPTExFQ1RJT05TIH0gZnJvbSAnLi9jb2xsZWN0aW9ucydcblxuaW50ZXJmYWNlIEhlYWx0aENoZWNrIHtcbiAga2V5OiBzdHJpbmdcbiAgbGFiZWw6IHN0cmluZ1xuICBzdGF0dXM6ICdvaycgfCAnd2FybmluZycgfCAnZXJyb3InXG4gIG1lc3NhZ2U6IHN0cmluZ1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlU3lzdGVtSGVhbHRoKFxuICBjOiBDb250ZXh0PHsgQmluZGluZ3M6IHsgREI6IEQxRGF0YWJhc2U7IEVOVklST05NRU5UPzogc3RyaW5nIH07IFZhcmlhYmxlczogUmVjb3JkPHN0cmluZywgbmV2ZXI+IH0+XG4pOiBQcm9taXNlPFJlc3BvbnNlPiB7XG4gIGNvbnN0IGNoZWNrczogSGVhbHRoQ2hlY2tbXSA9IFtdXG5cbiAgLy8gREIg6L+e6YCa5oCnXG4gIHRyeSB7XG4gICAgYXdhaXQgYy5lbnYuREIucHJlcGFyZSgnU0VMRUNUIDEgQVMgcHJvYmUnKS5maXJzdCgpXG4gICAgY2hlY2tzLnB1c2goeyBrZXk6ICdkYXRhYmFzZScsIGxhYmVsOiAnRGF0YWJhc2UnLCBzdGF0dXM6ICdvaycsIG1lc3NhZ2U6ICdEMSByZWFjaGFibGUuJyB9KVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNoZWNrcy5wdXNoKHsga2V5OiAnZGF0YWJhc2UnLCBsYWJlbDogJ0RhdGFiYXNlJywgc3RhdHVzOiAnZXJyb3InLCBtZXNzYWdlOiBgRDEgdW5yZWFjaGFibGU6ICR7KGVycm9yIGFzIEVycm9yKS5tZXNzYWdlfWAgfSlcbiAgfVxuXG4gIC8vIOWQhOmbhuWQiOiuoeaVsO+8iOihqOe8uuWkseaMiSB3YXJuaW5nIOWkhOeQhu+8jOS4jeS4reaWreaVtOS9k+ajgOafpe+8iVxuICBjb25zdCBjb3VudHM6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fVxuICBmb3IgKGNvbnN0IFtrZXksIGRlZl0gb2YgT2JqZWN0LmVudHJpZXMoQ09MTEVDVElPTlMpKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJvdyA9IGF3YWl0IGMuZW52LkRCLnByZXBhcmUoYFNFTEVDVCBDT1VOVCgqKSBBUyBuIEZST00gJHtkZWYudGFibGV9YCkuZmlyc3Q8eyBuOiBudW1iZXIgfT4oKVxuICAgICAgY291bnRzW2tleV0gPSByb3c/Lm4gPz8gMFxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjaGVja3MucHVzaCh7XG4gICAgICAgIGtleTogYGNvbGxlY3Rpb246JHtrZXl9YCxcbiAgICAgICAgbGFiZWw6IGBDb2xsZWN0aW9uICR7a2V5fWAsXG4gICAgICAgIHN0YXR1czogJ3dhcm5pbmcnLFxuICAgICAgICBtZXNzYWdlOiBgQ291bnQgZmFpbGVkOiAkeyhlcnJvciBhcyBFcnJvcikubWVzc2FnZX1gLFxuICAgICAgfSlcbiAgICAgIGNvdW50c1trZXldID0gLTFcbiAgICB9XG4gIH1cblxuICBjb25zdCBoYXNFcnJvciA9IGNoZWNrcy5zb21lKChjaGVjaykgPT4gY2hlY2suc3RhdHVzID09PSAnZXJyb3InKVxuICBjb25zdCBoYXNXYXJuaW5nID0gY2hlY2tzLnNvbWUoKGNoZWNrKSA9PiBjaGVjay5zdGF0dXMgPT09ICd3YXJuaW5nJylcblxuICByZXR1cm4gb2soXG4gICAge1xuICAgICAgc3RhdHVzOiBoYXNFcnJvciA/ICdlcnJvcicgOiBoYXNXYXJuaW5nID8gJ3dhcm5pbmcnIDogJ29rJyxcbiAgICAgIGdlbmVyYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICBlbnZpcm9ubWVudDogYy5lbnYuRU5WSVJPTk1FTlQgPz8gJ2RldmVsb3BtZW50JyxcbiAgICAgIGNvbGxlY3Rpb25Db3VudHM6IGNvdW50cyxcbiAgICAgIGNoZWNrcyxcbiAgICB9XG4gIClcbn1cbiJdLCJmaWxlIjoiL1VzZXJzL2thcmEvQ29kZS9TY2hhbGUtTGlicmFyeS9zZXJ2ZXIvc3JjL3BhbmVsL3N5c3RlbS1oZWFsdGgudHMifQ==
