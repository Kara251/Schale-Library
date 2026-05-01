# 安全说明

[English](../en/security.md) | [日本語](../ja/security.md)

## 依赖审计状态

`pnpm audit --prod --audit-level moderate` 目前会报告 Strapi 依赖链中的传递性安全提示：

- `lodash`：来自 `@strapi/plugin-users-permissions > @strapi/design-system`
- `vite`：来自 `@strapi/strapi`
- `uuid`：来自 `@strapi/plugin-users-permissions > grant > request-oauth`

审计数据库标记的修复版本目前无法在这条依赖树中安全解析：`lodash >=4.18.0`、`vite 6.4.2`、`uuid >=14.0.0`。不要强行 override，除非 Strapi 上游支持，并且前后端构建全部通过。

## 补偿控制

- 自研后台在生产环境默认 fail-closed，必须配置 `ADMIN_PANEL_ALLOWED_ROLES`。
- 内部限流接口生产环境必须使用 `PANEL_INTERNAL_TOKEN`。
- 公开图片代理仅允许 HTTPS Bilibili 图片 CDN host、图片类型响应、大小上限和请求超时。
- 自研后台 API 中同步日志和审计日志保持只读。
- RSSHub 同步使用有限并发和基于 parser 的 RSS 处理。

每次升级 Strapi 后都应重新检查这些 advisories。
