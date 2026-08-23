# 备份与恢复

## D1 备份

### 时点恢复（首选）

Cloudflare D1 内置 time travel：任意 30 天内时点恢复。

```
CF Dashboard → Storage & Databases → D1 → schale_db → Time Travel
# 或 CLI：
wrangler d1 time-travel restore schale_db --remote --timestamp="2026-08-22T12:00:00Z"
```

### 冷备（周备建议）

```bash
wrangler d1 export schale_db --remote --output backup-$(date +%F).sql
# 恢复：
wrangler d1 execute schale_db --remote --file=backup-2026-08-22.sql
```

## R2 媒体备份

上传对象在 `schale-uploads` 桶。开启 R2 版本控制或定期 `rclone sync` 到第二桶。

## 恢复演练清单

1. `wrangler d1 execute schale_db --remote --file=<backup>.sql`（先对 staging 库演练）
2. 抽查：creators/students/research_entries 行数、redirect_map 完整性
3. 前端冒烟：首页/creators/考据档案/搜索各一页
