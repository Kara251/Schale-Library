-- spoiler_tiers 补齐通用 CRUD 依赖的时间戳列。
--
-- 该表建表时漏了 created_at / updated_at / published_at，而面板集合注册表把它
-- 声明为 supportsDraft:true、默认按 updated_at 排序 —— 列表查询的 ORDER BY 直接
-- SQL 报错，返回 500。/manage 首页对每个集合取一次总数，被这一个集合带崩整页。
--
-- DEFAULT 0 只为满足 ALTER TABLE ADD COLUMN 对 NOT NULL 的约束；
-- 通用 CRUD 的 insert/update 一律显式写入这两列，不依赖该默认值。

ALTER TABLE spoiler_tiers ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE spoiler_tiers ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE spoiler_tiers ADD COLUMN published_at INTEGER;

-- 存量行按「已发布」回填：公开端点即将开始按 published_at 过滤，
-- 不回填的话现有剧透等级会在前台整体消失。
UPDATE spoiler_tiers
SET created_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    published_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE created_at = 0;
