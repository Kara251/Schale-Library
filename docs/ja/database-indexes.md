# データベースインデックス解説

## D1（SQLite）インデックスの現状

インデックスはマイグレーション `server/migrations/0001_baseline.sql` で定義:

| テーブル | インデックス | 用途 |
|----------|--------------|------|
| creators | idx_creators_featured(is_featured, featured_priority) | トップページ特集/一覧の並び替え |
| events | idx_events_start(kind, start_time DESC) | イベント一覧の並び替え |
| events | idx_events_published_start(published_at, start_time DESC) | 公開フィルタ + 並び替え |
| announcements | idx_announcements_created(created_at DESC) | お知らせ一覧 |
| research_entries | idx_research_entries_slug(slug) | slug 詳細クエリ |
| admin_audit_logs | idx_audit_created(created_at) | cron/手動クリーンアップ |
| rate_limit_records | idx_rate_limit_reset(reset_at)、idx_rate_limit_scope_key(scope, identifier, key) | レート制限ウィンドウの照会 + クリーンアップ |
| sessions | idx_sessions_expires(expires_at) | 期限切れセッションのクリーンアップ |
| works | idx_works_published / idx_works_featured / idx_works_author | works 稼働中のクエリ（W5 後にテーブルごと廃止） |

## 設計原則（パフォーマンス監査の結論を引き継ぎ）

- クリーンアップ系クエリ（created_at / reset_at / expires_at）には単一カラムインデックスが必須
- 一覧クエリは浅い読み込み、詳細は深い読み込みに分離（populate はルートで明示的に制御）
- FTS 不使用: 検索は LIKE containsi（このコンテンツ量では十分、CJK の分かち書きには効果なし）

## バックアップとリストア

- time travel: 30 日間の時点復元（CF Dashboard）
- コールドバックアップ: `wrangler d1 export schale_db --remote --output backup.sql`
