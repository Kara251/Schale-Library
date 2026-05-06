# 本番リリース準備

[简体中文](../zh-Hans/production-readiness.md) | [English](../en/production-readiness.md)

## 自動チェック

本プロジェクトには、デプロイ前のチェックが 2 つあります。

```bash
pnpm verify:deploy
pnpm audit:prod
```

`verify:deploy` は、本番環境変数、PostgreSQL、デフォルトではない Strapi Admin パス、HTTPS CORS、Cloudinary、デプロイ層の WAF 確認を検査します。

`audit:prod` は `pnpm audit --prod --json` を実行し、現在記録済みの Strapi 上流の推移的 advisory だけを許可します。新しい advisory、依存パスの変化、深刻度の変化は gate で失敗します。`STRAPI_ADMIN_PUBLIC=true` を設定した場合、high advisory が 1 つでも残ると失敗するため、現時点では Strapi Admin を公開しないでください。

## Staging 受け入れ確認

正式な本番公開前に、一時的な Supabase データベースと staging ドメインで実行します。

```bash
NODE_ENV=production pnpm verify:staging
```

`verify:deploy` の要件に加えて、以下を明示的に確認します。

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

これらの変数はセキュリティ回避ではなく、手動確認を失敗可能なデプロイ gate にするためのものです。ローカルの dry run の場合のみ `STAGING_ALLOW_LOCAL_URLS=true` を使用してください。

## 現時点の公開判断

- フロントエンドと独自管理パネルはデモ環境として公開できます。
- 正式な本番環境では SQLite ではなく PostgreSQL/Supabase を使用します。
- Cloudinary 変数が欠けている場合は正式本番として扱いません。
- `pnpm audit:prod` に上流 lodash high advisory が残っている間、Strapi Admin は公開しないでください。
