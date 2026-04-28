# 备份与恢复

[English](../en/backup-restore.md) | [日本語](../ja/backup-restore.md)

## PostgreSQL/Supabase 备份

生产环境优先使用 Supabase 自动备份。手动备份时建议同时导出 schema 和 data：

```bash
pg_dump "$DATABASE_URL" --format=custom --file=schale-library.dump
```

恢复到临时库验证：

```bash
pg_restore --clean --if-exists --no-owner --dbname "$RESTORE_DATABASE_URL" schale-library.dump
```

## 恢复后校验

- 确认 Strapi 可以启动，且 `pnpm verify:deploy` 通过。
- 登录 `/{locale}/manage`，确认维护账号仍属于 `ADMIN_PANEL_ALLOWED_ROLES` 中的角色。
- 检查作品、学生、公告、线上活动、线下活动数量。
- 检查 Cloudinary 或上传目录中的媒体 URL 是否仍可访问。

## 基础种子数据

空演示库可用以下命令写入少量学生基础数据：

```bash
SEED_STRAPI_URL=https://api.example.com SEED_API_TOKEN=... pnpm seed:basics
```

脚本按学生名幂等创建，不会覆盖已有内容。
