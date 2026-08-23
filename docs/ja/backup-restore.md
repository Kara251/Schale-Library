# バックアップとリストア

## D1 バックアップ

### 時点復元（推奨）

Cloudflare D1 には time travel が組み込まれており、30 日以内の任意の時点へ復元できる。

```
CF Dashboard → Storage & Databases → D1 → schale_db → Time Travel
# または CLI:
wrangler d1 time-travel restore schale_db --remote --timestamp="2026-08-22T12:00:00Z"
```

### コールドバックアップ（週次推奨）

```bash
wrangler d1 export schale_db --remote --output backup-$(date +%F).sql
# リストア:
wrangler d1 execute schale_db --remote --file=backup-2026-08-22.sql
```

## R2 メディアのバックアップ

アップロード オブジェクトは `schale-uploads` バケットに格納される。R2 のバージョニングを有効にするか、定期的に `rclone sync` で第二バケットへ同期する。

## リストア訓練チェックリスト

1. `wrangler d1 execute schale_db --remote --file=<backup>.sql`（まず staging DB で訓練）
2. 抜き取り検証: creators/students/research_entries の行数、redirect_map の完全性
3. フロントエンド スモークテスト: トップページ/クリエイター/考証アーカイブ/検索を各 1 ページずつ
