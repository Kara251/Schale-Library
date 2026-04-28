# バックアップと復元

[简体中文](../zh-Hans/backup-restore.md) | [English](../en/backup-restore.md)

## PostgreSQL/Supabase バックアップ

本番環境では Supabase の自動バックアップを優先します。手動バックアップでは schema と data をまとめて出力します。

```bash
pg_dump "$DATABASE_URL" --format=custom --file=schale-library.dump
```

本番へ戻す前に、一度一時データベースへ復元して確認します。

```bash
pg_restore --clean --if-exists --no-owner --dbname "$RESTORE_DATABASE_URL" schale-library.dump
```

## 復元後チェック

- Strapi が起動し、`pnpm verify:deploy` が通ることを確認します。
- `/{locale}/manage` にログインし、管理ユーザーが `ADMIN_PANEL_ALLOWED_ROLES` のロールを持つことを確認します。
- 作品、生徒、お知らせ、オンラインイベント、オフラインイベントの件数を確認します。
- Cloudinary またはアップロード済みメディア URL が表示できることを確認します。

## 基本シードデータ

空のデモ DB には、少量の生徒データを投入できます。

```bash
SEED_STRAPI_URL=https://api.example.com SEED_API_TOKEN=... pnpm seed:basics
```

このスクリプトは生徒名で冪等に作成し、既存コンテンツを上書きしません。
