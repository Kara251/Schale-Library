// /Users/kara/Code/Schale-Library/server/src/panel/router.ts
const __vite_ssr_import_0__ = await __vite_ssr_import__("hono", {"importedNames":["Hono"]});
const __vite_ssr_import_1__ = await __vite_ssr_import__("/src/auth/bootstrap.ts", {"importedNames":["ensureBootstrapAdmin"]});
const __vite_ssr_import_2__ = await __vite_ssr_import__("/src/auth/session.ts", {"importedNames":["pruneExpiredSessions"]});
const __vite_ssr_import_3__ = await __vite_ssr_import__("/src/auth/middleware.ts", {"importedNames":["requirePanelSession"]});
const __vite_ssr_import_4__ = await __vite_ssr_import__("/src/panel/auth-routes.ts", {"importedNames":["authRoutes"]});
const __vite_ssr_import_5__ = await __vite_ssr_import__("/src/panel/crud.ts", {"importedNames":["registerCrudRoutes"]});
const __vite_ssr_import_6__ = await __vite_ssr_import__("/src/panel/bulk.ts", {"importedNames":["handleBulkAction"]});
const __vite_ssr_import_7__ = await __vite_ssr_import__("/src/panel/quality.ts", {"importedNames":["handleQualityScan","handleQualityIssuesList"]});
const __vite_ssr_import_8__ = await __vite_ssr_import__("/src/panel/system-health.ts", {"importedNames":["handleSystemHealth"]});
const __vite_ssr_import_9__ = await __vite_ssr_import__("/src/panel/audit-routes.ts", {"importedNames":["handleAuditLogList","handleAuditLogExport"]});
const __vite_ssr_import_10__ = await __vite_ssr_import__("/src/panel/upload.ts", {"importedNames":["handleUpload"]});











function createPanelRoutes() {
  const panel = new __vite_ssr_import_0__.Hono();
  panel.use("*", async (c, next) => {
    await __vite_ssr_import_1__.ensureBootstrapAdmin(
      c.env.DB,
      c.env.BOOTSTRAP_ADMIN_USERNAME,
      c.env.BOOTSTRAP_ADMIN_PASSWORD
    );
    if (Math.random() < 0.05) {
      await __vite_ssr_import_2__.pruneExpiredSessions(c.env.DB);
    }
    await next();
  });
  panel.route("/", __vite_ssr_import_4__.authRoutes);
  panel.use("/panel/*", async (c, next) => {
    const errorResponse = await __vite_ssr_import_3__.requirePanelSession(c, next);
    return errorResponse ?? void 0;
  });
  panel.post("/panel/bulk-action", (c) => __vite_ssr_import_6__.handleBulkAction(c));
  panel.get("/panel/content-quality-issues", (c) => __vite_ssr_import_7__.handleQualityIssuesList(c));
  panel.post("/panel/quality-scan", (c) => __vite_ssr_import_7__.handleQualityScan(c));
  panel.get("/panel/system-health", (c) => __vite_ssr_import_8__.handleSystemHealth(c));
  panel.get("/panel/admin-audit-logs/export", (c) => __vite_ssr_import_9__.handleAuditLogExport(c));
  panel.get("/panel/admin-audit-logs", (c) => __vite_ssr_import_9__.handleAuditLogList(c));
  panel.post("/panel/upload", (c) => __vite_ssr_import_10__.handleUpload(c));
  __vite_ssr_import_5__.registerCrudRoutes(panel);
  return panel;
}
Object.defineProperty(__vite_ssr_exports__, "createPanelRoutes", { enumerable: true, configurable: true, get(){ return createPanelRoutes }});

//# sourceMappingSource=vite-node
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQTs7Ozs7Ozs7Ozs7QUFJcUI7QUFFZ0I7QUFDQTtBQUNEO0FBQ1Q7QUFDUTtBQUNGO0FBQzBCO0FBQ3hCO0FBQ3NCO0FBQzVCO0FBRXRCLFNBQVMsb0JBQStCO0FBQzdDLFFBQU0sUUFBbUIsSUFBSSwyQkFBSztBQUdsQyxRQUFNLElBQUksS0FBSyxPQUFPLEdBQUcsU0FBUztBQUNoQyxVQUFNO0FBQUEsTUFDSixFQUFFLElBQUk7QUFBQSxNQUNOLEVBQUUsSUFBSTtBQUFBLE1BQ04sRUFBRSxJQUFJO0FBQUEsSUFDUjtBQUVBLFFBQUksS0FBSyxPQUFPLElBQUksTUFBTTtBQUN4QixZQUFNLDJDQUFxQixFQUFFLElBQUksRUFBRTtBQUFBLElBQ3JDO0FBQ0EsVUFBTSxLQUFLO0FBQUEsRUFDYixDQUFDO0FBR0QsUUFBTSxNQUFNLEtBQUssZ0NBQVU7QUFHM0IsUUFBTSxJQUFJLFlBQVksT0FBTyxHQUFHLFNBQVM7QUFDdkMsVUFBTSxnQkFBZ0IsTUFBTSwwQ0FBb0IsR0FBWSxJQUFJO0FBQ2hFLFdBQU8saUJBQWlCO0FBQUEsRUFDMUIsQ0FBQztBQUVELFFBQU0sS0FBSyxzQkFBc0IsQ0FBQyxNQUFNLHVDQUFpQixDQUFVLENBQUM7QUFDcEUsUUFBTSxJQUFJLGlDQUFpQyxDQUFDLE1BQU0sOENBQXdCLENBQVUsQ0FBQztBQUNyRixRQUFNLEtBQUssdUJBQXVCLENBQUMsTUFBTSx3Q0FBa0IsQ0FBVSxDQUFDO0FBQ3RFLFFBQU0sSUFBSSx3QkFBd0IsQ0FBQyxNQUFNLHlDQUFtQixDQUFVLENBQUM7QUFDdkUsUUFBTSxJQUFJLGtDQUFrQyxDQUFDLE1BQU0sMkNBQXFCLENBQVUsQ0FBQztBQUNuRixRQUFNLElBQUksMkJBQTJCLENBQUMsTUFBTSx5Q0FBbUIsQ0FBVSxDQUFDO0FBQzFFLFFBQU0sS0FBSyxpQkFBaUIsQ0FBQyxNQUFNLG9DQUFhLENBQVUsQ0FBQztBQUUzRCwyQ0FBbUIsS0FBSztBQUV4QixTQUFPO0FBQ1Q7NklBQUEiLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbInJvdXRlci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIC9wYW5lbCDpnaLmnb/ot6/nlLHmgLvoo4XjgIJcbiAqIOS4remXtOS7tumhuuW6j++8mmJvb3RzdHJhcO+8iOW5guetie+8ieKGkiBsb2dpbi9zZXNzaW9uL2xvZ291dCDnmb3lkI3ljZXmlL7ooYwg4oaSIOWFtuS9meWFqOmDqOS8muivneagoemqjCBmYWlsLWNsb3NlZOOAglxuICovXG5pbXBvcnQgeyBIb25vIH0gZnJvbSAnaG9ubydcbmltcG9ydCB0eXBlIHsgSG9ub1BhbmVsIH0gZnJvbSAnLi90eXBlcydcbmltcG9ydCB7IGVuc3VyZUJvb3RzdHJhcEFkbWluIH0gZnJvbSAnLi4vYXV0aC9ib290c3RyYXAnXG5pbXBvcnQgeyBwcnVuZUV4cGlyZWRTZXNzaW9ucyB9IGZyb20gJy4uL2F1dGgvc2Vzc2lvbidcbmltcG9ydCB7IHJlcXVpcmVQYW5lbFNlc3Npb24gfSBmcm9tICcuLi9hdXRoL21pZGRsZXdhcmUnXG5pbXBvcnQgeyBhdXRoUm91dGVzIH0gZnJvbSAnLi9hdXRoLXJvdXRlcydcbmltcG9ydCB7IHJlZ2lzdGVyQ3J1ZFJvdXRlcyB9IGZyb20gJy4vY3J1ZCdcbmltcG9ydCB7IGhhbmRsZUJ1bGtBY3Rpb24gfSBmcm9tICcuL2J1bGsnXG5pbXBvcnQgeyBoYW5kbGVRdWFsaXR5U2NhbiwgaGFuZGxlUXVhbGl0eUlzc3Vlc0xpc3QgfSBmcm9tICcuL3F1YWxpdHknXG5pbXBvcnQgeyBoYW5kbGVTeXN0ZW1IZWFsdGggfSBmcm9tICcuL3N5c3RlbS1oZWFsdGgnXG5pbXBvcnQgeyBoYW5kbGVBdWRpdExvZ0xpc3QsIGhhbmRsZUF1ZGl0TG9nRXhwb3J0IH0gZnJvbSAnLi9hdWRpdC1yb3V0ZXMnXG5pbXBvcnQgeyBoYW5kbGVVcGxvYWQgfSBmcm9tICcuL3VwbG9hZCdcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVBhbmVsUm91dGVzKCk6IEhvbm9QYW5lbCB7XG4gIGNvbnN0IHBhbmVsOiBIb25vUGFuZWwgPSBuZXcgSG9ubygpXG5cbiAgLy8gYm9vdHN0cmFwIOe7tOaKpOi0puWPt++8mueOr+Wig+WPmOmHj+WtmOWcqOS4lCB1c2VycyDooajnqbrml7bliJvlu7rvvIjluYLnrYnvvIzor7fmsYLnuqfop6blj5HvvIlcbiAgcGFuZWwudXNlKCcqJywgYXN5bmMgKGMsIG5leHQpID0+IHtcbiAgICBhd2FpdCBlbnN1cmVCb290c3RyYXBBZG1pbihcbiAgICAgIGMuZW52LkRCLFxuICAgICAgYy5lbnYuQk9PVFNUUkFQX0FETUlOX1VTRVJOQU1FLFxuICAgICAgYy5lbnYuQk9PVFNUUkFQX0FETUlOX1BBU1NXT1JEXG4gICAgKVxuICAgIC8vIOmhuuaJi+a4heeQhui/h+acn+S8muivne+8iOS9jumikeWGmei3r+W+hOWPr+aOpeWPl++8iVxuICAgIGlmIChNYXRoLnJhbmRvbSgpIDwgMC4wNSkge1xuICAgICAgYXdhaXQgcHJ1bmVFeHBpcmVkU2Vzc2lvbnMoYy5lbnYuREIpXG4gICAgfVxuICAgIGF3YWl0IG5leHQoKVxuICB9KVxuXG4gIC8vIOiupOivgei3r+eUse+8muaXoOmcgOS8muivnVxuICBwYW5lbC5yb3V0ZSgnLycsIGF1dGhSb3V0ZXMpXG5cbiAgLy8g5YW25L2ZIC9wYW5lbC8qIOWFqOmDqOS8muivneagoemqjCBmYWlsLWNsb3NlZFxuICBwYW5lbC51c2UoJy9wYW5lbC8qJywgYXN5bmMgKGMsIG5leHQpID0+IHtcbiAgICBjb25zdCBlcnJvclJlc3BvbnNlID0gYXdhaXQgcmVxdWlyZVBhbmVsU2Vzc2lvbihjIGFzIG5ldmVyLCBuZXh0KVxuICAgIHJldHVybiBlcnJvclJlc3BvbnNlID8/IHVuZGVmaW5lZFxuICB9KVxuXG4gIHBhbmVsLnBvc3QoJy9wYW5lbC9idWxrLWFjdGlvbicsIChjKSA9PiBoYW5kbGVCdWxrQWN0aW9uKGMgYXMgbmV2ZXIpKVxuICBwYW5lbC5nZXQoJy9wYW5lbC9jb250ZW50LXF1YWxpdHktaXNzdWVzJywgKGMpID0+IGhhbmRsZVF1YWxpdHlJc3N1ZXNMaXN0KGMgYXMgbmV2ZXIpKVxuICBwYW5lbC5wb3N0KCcvcGFuZWwvcXVhbGl0eS1zY2FuJywgKGMpID0+IGhhbmRsZVF1YWxpdHlTY2FuKGMgYXMgbmV2ZXIpKVxuICBwYW5lbC5nZXQoJy9wYW5lbC9zeXN0ZW0taGVhbHRoJywgKGMpID0+IGhhbmRsZVN5c3RlbUhlYWx0aChjIGFzIG5ldmVyKSlcbiAgcGFuZWwuZ2V0KCcvcGFuZWwvYWRtaW4tYXVkaXQtbG9ncy9leHBvcnQnLCAoYykgPT4gaGFuZGxlQXVkaXRMb2dFeHBvcnQoYyBhcyBuZXZlcikpXG4gIHBhbmVsLmdldCgnL3BhbmVsL2FkbWluLWF1ZGl0LWxvZ3MnLCAoYykgPT4gaGFuZGxlQXVkaXRMb2dMaXN0KGMgYXMgbmV2ZXIpKVxuICBwYW5lbC5wb3N0KCcvcGFuZWwvdXBsb2FkJywgKGMpID0+IGhhbmRsZVVwbG9hZChjIGFzIG5ldmVyKSlcblxuICByZWdpc3RlckNydWRSb3V0ZXMocGFuZWwpXG5cbiAgcmV0dXJuIHBhbmVsXG59XG5cbiJdLCJmaWxlIjoiL1VzZXJzL2thcmEvQ29kZS9TY2hhbGUtTGlicmFyeS9zZXJ2ZXIvc3JjL3BhbmVsL3JvdXRlci50cyJ9
