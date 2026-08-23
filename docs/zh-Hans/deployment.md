# 部署说明

## 架构（2026-08 迁移后）

```
bakivo.com (Cloudflare zone)
├── 前端      Next.js 16（OpenNext on Workers，schale-library-frontend）
├── 内容 API  server/ Hono Worker + D1（公开 REST + /panel 面板 API）
├── 上传      R2 桶 schale-uploads
├── 资源页    drive.bakivo.com（OpenList，iframe 内嵌）
└── DNS/CDN   Cloudflare
```

Strapi / PostgreSQL(Neon) / Cloudinary / Render / Vercel / RSSHub 均已退役。

## 首次部署步骤

### 1. 创建 D1 与 R2

```bash
cd server
wrangler d1 create schale_db          # 记下 database_id，写入 wrangler.toml
wrangler r2 bucket create schale-uploads
wrangler d1 migrations apply schale_db --remote
```

### 2. 设置密钥

```bash
cd server
wrangler secret put SESSION_SECRET        # 随机 32+ 字节
wrangler secret put PANEL_INTERNAL_TOKEN  # 前后端共享令牌（如启用内部限流）
```

### 3. 部署 Worker

```bash
cd server && wrangler deploy
# 记录 workers.dev 域名，绑定到 bakivo.com/api 子路径或独立子域（路由在 CF Dashboard 配）
```

### 4. 首个维护者账号

一次性设置环境变量后触发任意请求（bootstrap 幂等）：

```bash
wrangler secret put BOOTSTRAP_ADMIN_USERNAME
wrangler secret put BOOTSTRAP_ADMIN_PASSWORD   # ≥16 位
# 触发一次 /panel 请求后删除两个 secret
```

### 5. 数据迁移（旧 Strapi → D1）

```bash
# a. 从旧 Neon PG 导出（保留旧栈期间执行）
# b. 转换 + 生成 301/外跳映射表
cd server && node --experimental-strip-types scripts/transform.ts <导出目录> /tmp/out
# c. 载入 D1
node --experimental-strip-types scripts/load-d1.ts /tmp/out --remote
```

### 6. 前端

```bash
cd frontend
pnpm deploy      # opennextjs-cloudflare build && deploy
```

构建期变量在 `frontend/.env.production`（`NEXT_PUBLIC_*` 会被内联进产物，
放 wrangler vars 无效）；服务端运行时变量在 `wrangler.jsonc` 的 `vars`，
密钥走 `wrangler secret put`。

首次绑定自定义域时，若 www/apex 上已有其他服务商的 DNS 记录，
Cloudflare API 会返回 409。需要在 Dashboard 上确认覆盖一次
（Workers 和 Pages → schale-library-frontend → 域 → 添加域名），
之后 `wrangler deploy` 即可正常匹配。

两条约束曾经是迁移的阻塞项，改动方式记在此以免回退：

- **文件名不能叫 `proxy.ts`。** Next 16 把 `proxy` 这个文件名硬编码成 Node
  runtime（`build/utils.js` 的 `isProxyFile`），加任何 runtime config 都无效，
  而 OpenNext 不支持 Node middleware。必须用 `middleware.ts`（仅有弃用警告）。
- **服务端不能用 jsdom。** 免费版 Worker 体积上限 3 MiB（压缩后）。
  `isomorphic-dompurify` 在服务端拉 jsdom，产物直接超限，且 jsdom 在 Workers
  上本就跑不起来。HTML 消毒改用 `sanitize-html`（htmlparser2，不需要 DOM）。
  注意 DOMPurify 在不受支持的环境里会**静默原样返回输入**，换实现必须实测。

## 备份

- D1 time travel：30 天时点恢复（CF Dashboard → D1 → Time Travel）
- 冷备：`wrangler d1 export schale_db --remote --output backup-$(date +%F).sql`，建议 cron 周备

## 环境变量与密钥清单

| 变量 | 位置 | 说明 |
|------|------|------|
| SESSION_SECRET | Worker secret | 会话签名 |
| PANEL_INTERNAL_TOKEN | Worker secret + 前端 secret | 内部限流令牌，两侧必须一致 |
| BOOTSTRAP_ADMIN_USERNAME/PASSWORD | 临时 secret | 首个维护者，建完即删 |
| ADMIN_PANEL_ALLOWED_ROLES | Worker vars + 前端 vars | 面板角色准入。**生产环境缺省拒绝全部登录**，两侧都必须显式列出 |
| NEXT_PUBLIC_API_URL | 前端 env | 内容 API 基址 |
| NEXT_PUBLIC_SITE_URL | 前端 env | 站点 URL（sitemap/OG） |

## 安全基线（继承自审计整改）

- 会话 cookie：httpOnly + Secure + SameSite=Strict，8h TTL，查表即时吊销
- 密码：PBKDF2-SHA256 100k 迭代（100000 是 Workers WebCrypto 的迭代上限，超过抛 NotSupportedError）
- 登录限流：CF-Connecting-IP，10min/30 次
- 上传：魔数嗅探（jpeg/png/webp/gif），SVG 禁用，4/8/12MB 分级
- CSV 导出：公式注入中和
