# 生产上线验收

[English](../en/production-readiness.md) | [日本語](../ja/production-readiness.md)

## 自动检查

本项目现在有两层上线前检查：

```bash
pnpm verify:deploy
pnpm audit:prod
```

`verify:deploy` 检查生产环境变量、PostgreSQL、非默认 Strapi Admin 路径、HTTPS CORS、Cloudinary 和部署层 WAF 确认。

`audit:prod` 运行 `pnpm audit --prod --json`，只允许当前已记录的 Strapi 上游传递性 advisory。新出现的 advisory、路径变化、严重级别变化都会失败。若设置 `STRAPI_ADMIN_PUBLIC=true`，任何 high advisory 都会失败，因此当前不应公网开放 Strapi Admin。

## Staging 验收

正式上线前，用 Supabase 临时库和 staging 域名运行：

```bash
NODE_ENV=production pnpm verify:staging
```

除了 `verify:deploy` 的要求外，必须显式确认：

```env
STAGING_STRAPI_ADMIN_LOGIN_VERIFIED=true
STAGING_CUSTOM_PANEL_LOGIN_VERIFIED=true
STAGING_CONTENT_CREATE_VERIFIED=true
STAGING_MEDIA_UPLOAD_VERIFIED=true
STAGING_RSS_SYNC_VERIFIED=true
STAGING_BACKUP_EXPORT_VERIFIED=true
STAGING_BACKUP_RESTORE_VERIFIED=true
STAGING_ADMIN_RECOVERY_VERIFIED=true
STAGING_CRON_SINGLE_INSTANCE_VERIFIED=true
```

这些变量不是安全绕过，而是把人工验收结果变成可失败的部署 gate。只有本地干跑时才设置 `STAGING_ALLOW_LOCAL_URLS=true`。

## 当前上线判断

- 前端和自研后台可以作为演示站上线。
- 正式生产必须使用 PostgreSQL/Supabase，不使用 SQLite。
- Cloudinary 三项缺失时，不应视为正式生产。
- `pnpm audit:prod` 仍包含上游 lodash high advisory 时，Strapi Admin 不应公网开放。
