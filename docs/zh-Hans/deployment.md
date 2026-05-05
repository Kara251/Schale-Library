# 部署说明

[English](../en/deployment.md) | [日本語](../ja/deployment.md)

## 后端运行环境

- Strapi 后端应运行在 Node.js runtime，并使用 PostgreSQL。
- Next.js 前端可以单独部署到兼容的平台。
- 不建议将 Strapi 后端部署到 Cloudflare Workers 或 D1。Strapi 需要 Node.js 服务端运行环境和受支持的 SQL 客户端，D1 不是本项目的 Strapi 数据库目标。
- SQLite 仅用于本地开发和临时环境。后端默认禁止生产环境 SQLite，除非显式设置 `ALLOW_PRODUCTION_SQLITE=true`。

## PostgreSQL

Strapi 后端使用 PostgreSQL：

```env
DATABASE_CLIENT=postgres
DATABASE_URL=postgres://...
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false
DATABASE_POOL_MIN=0
DATABASE_POOL_MAX=5
```

小型 serverless 实例应保持较小连接池。如果数据库供应商提供连接池地址，应使用池化连接地址，并保持 `DATABASE_POOL_MIN=0`。

## 生产环境必需密钥

生产环境启动时，如果以下变量缺失或仍为占位值，后端会拒绝启动：

```env
APP_KEYS=
API_TOKEN_SALT=
ADMIN_JWT_SECRET=
TRANSFER_TOKEN_SALT=
JWT_SECRET=
ENCRYPTION_KEY=
ADMIN_PANEL_ALLOWED_ROLES=maintainer,admin
PANEL_INTERNAL_TOKEN=
RATE_LIMIT_HASH_SECRET=
CRON_ENABLED=false
ADMIN_PATH=/strapi-console-<random>
STRAPI_CORS_ORIGINS=https://bakivo.com,https://www.bakivo.com
STRAPI_ADMIN_WAF_CONFIRMED=true
CLOUDINARY_NAME=
CLOUDINARY_KEY=
CLOUDINARY_SECRET=
```

`PANEL_INTERNAL_TOKEN` 必须在后端和前端环境中保持一致。
生产环境必须显式设置 `CRON_ENABLED`。多实例 serverless 部署通常只应有一个后端实例开启 cron。
正式生产必须完整配置 Cloudinary 三项；缺失时只适合演示站，不应作为正式生产通过。

部署前可运行：

```bash
NODE_ENV=production pnpm verify:deploy
```

备份、恢复和空库种子数据见 [backup-restore.md](./backup-restore.md)。

## 自研后台维护账号恢复

`/{locale}/manage` 自研后台使用 Strapi users-permissions 用户表，不使用 Strapi 内置 admin 用户表。

如需创建或恢复维护账号，可在一次部署中临时设置：

```env
ADMIN_PANEL_BOOTSTRAP_EMAIL=you@example.com
ADMIN_PANEL_BOOTSTRAP_USERNAME=maintainer
ADMIN_PANEL_BOOTSTRAP_PASSWORD=use-a-long-random-password
```

启动时 Strapi 会：

- 确保 `ADMIN_PANEL_ALLOWED_ROLES` 中的角色存在；
- 创建或更新对应 users-permissions 用户；
- 将第一个允许角色分配给该用户；
- 解除 blocked 状态并设为 confirmed。

确认登录可用后，应移除 `ADMIN_PANEL_BOOTSTRAP_PASSWORD`。

## Strapi 内置管理面板

Strapi 内置管理面板使用独立的 admin 用户表。跨部署应保持 `ADMIN_JWT_SECRET`、`TRANSFER_TOKEN_SALT` 和 `ENCRYPTION_KEY` 稳定。如果重建了空数据库，需要重新从 Strapi 管理界面创建第一个 Strapi admin 用户。

如果 Strapi Admin 公网开放：

- 生产环境必须设置非默认 `ADMIN_PATH`，不能使用 `/admin`；
- `STRAPI_CORS_ORIGINS` 必须只包含正式前端、预览域名和必要的自研面板域名；
- 部署层必须为 Strapi Admin 登录、`/api/auth/local` 和异常静态资源请求配置 WAF / rate limit；
- 完成部署层防护后才设置 `STRAPI_ADMIN_WAF_CONFIRMED=true`；
- Strapi Admin 管理员密码和自研后台 bootstrap 密码都应至少 16 位，并删除默认或临时账号；
- 如果 `pnpm audit --prod` 仍残留 high advisory，不应公网开放 Strapi Admin。

## Cloudflare

Cloudflare 适合用于：

- DNS 和 CDN；
- 静态资源；
- 不依赖不兼容 Node API 的 Next.js 前端；
- 轻量 edge route handlers。

Cloudflare Workers 和 D1 不是本项目 Strapi 后端的受支持目标。Strapi 后端应保留 Node.js + PostgreSQL 架构，Cloudflare 仅用于适合其 runtime 模型的部分。
