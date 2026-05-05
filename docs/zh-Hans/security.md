# 安全说明

[English](../en/security.md) | [日本語](../ja/security.md)

## 依赖审计状态

`pnpm audit --prod` 的 axios high advisory 已通过最小 pnpm override 处理。当前仍会报告 Strapi 依赖链中的传递性安全提示：

- `lodash`：来自 `@strapi/plugin-users-permissions > @strapi/design-system`。
- `vite`：来自 `@strapi/strapi`。
- `uuid`：来自 `@strapi/plugin-users-permissions > grant > request-oauth`。
- `elliptic`：来自 `@strapi/plugin-users-permissions > jwk-to-pem`。

已处理的 override：

- `@strapi/admin > axios` 固定到 `1.16.0`。
- `@strapi/cloud-cli > axios` 固定到 `1.16.0`。

审计数据库标记的部分修复版本目前无法在这条依赖树中安全解析：`lodash >=4.18.0`、`vite 6.4.2`、`uuid >=14.0.0`，并且 `elliptic` 仍受上游链路约束。`vite@7.2.7` 可构建但会引入新的 Vite high advisory，`vite@7.3.2` 当前不可解析，因此未保留 Vite override。不要强行 override，除非 Strapi 上游支持，并且 Strapi Admin、前端和后端构建全部通过。

正式生产如果仍残留 high advisory，不应公网开放 Strapi Admin；应先等待上游修复、确认可安全 override，或把 Strapi Admin 降级为受网络访问控制保护的内部入口。

## 补偿控制

- 自研后台在生产环境默认 fail-closed，必须配置 `ADMIN_PANEL_ALLOWED_ROLES`。
- 内部限流接口生产环境必须使用 `PANEL_INTERNAL_TOKEN`。
- 公开图片代理仅允许 HTTPS Bilibili 图片 CDN host、图片类型响应、大小上限和请求超时。
- 自研后台 API 中同步日志和审计日志保持只读。
- RSSHub 同步使用有限并发和基于 parser 的 RSS 处理。
- Strapi Admin 公网开放时必须使用非默认 `ADMIN_PATH`，并在部署层配置 WAF / rate limit 后设置 `STRAPI_ADMIN_WAF_CONFIRMED=true`。
- 生产 CORS 由 `STRAPI_CORS_ORIGINS` 明确指定，不使用开放默认值。

每次升级 Strapi 后都应重新检查这些 advisories。
