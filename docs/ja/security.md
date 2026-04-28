# セキュリティメモ

## 依存関係監査の状態

`pnpm audit --prod --audit-level moderate` は、現在 Strapi の依存関係を経由した推移的な advisory を報告します。

- `lodash`: `@strapi/plugin-users-permissions > @strapi/design-system` 経由
- `vite`: `@strapi/strapi` 経由
- `uuid`: `@strapi/plugin-users-permissions > grant > request-oauth` 経由

監査データベースが示す修正版は、この依存ツリーでは現時点で安全に解決できません: `lodash >=4.18.0`、`vite 6.4.2`、`uuid >=14.0.0`。Strapi が対応し、フロントエンドとバックエンドのビルドが通るまでは、強制的な override は行わないでください。

## 補償的コントロール

- 独自管理パネルは、本番環境で `ADMIN_PANEL_ALLOWED_ROLES` が設定されていない場合 fail-closed になります。
- 内部レート制限エンドポイントは、本番環境で `PANEL_INTERNAL_TOKEN` を必須とします。
- 公開画像プロキシは HTTPS の Bilibili 画像 CDN host、画像 Content-Type、サイズ上限、リクエストタイムアウトに制限されています。
- 独自管理パネル API では、同期ログと監査ログは読み取り専用です。
- RSSHub 同期は制限付き並行処理と parser ベースの RSS 処理を使用します。

Strapi をアップグレードするたびに、これらの advisory を再確認してください。
