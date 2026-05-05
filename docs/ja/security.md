# セキュリティメモ

[简体中文](../zh-Hans/security.md) | [English](../en/security.md)

## 依存関係監査の状態

`pnpm audit --prod` の axios high advisory は、最小限の pnpm override で対応済みです。現在の監査では、Strapi の依存関係を経由した以下の推移的 advisory が残っています。

- `lodash`: `@strapi/plugin-users-permissions > @strapi/design-system` 経由。
- `vite`: `@strapi/strapi` 経由。
- `uuid`: `@strapi/plugin-users-permissions > grant > request-oauth` 経由。
- `elliptic`: `@strapi/plugin-users-permissions > jwk-to-pem` 経由。

適用済みの override:

- `@strapi/admin > axios` を `1.16.0` に固定しています。
- `@strapi/cloud-cli > axios` を `1.16.0` に固定しています。

監査データベースが示す一部の修正版は、この依存ツリーでは現時点で安全に解決できません: `lodash >=4.18.0`、`vite 6.4.2`、`uuid >=14.0.0`。`elliptic` も上流の依存関係に制約されています。`vite@7.2.7` はビルド可能ですが新しい Vite high advisory を発生させ、`vite@7.3.2` は現在解決できないため、Vite override は保持していません。Strapi が対応し、Strapi Admin、フロントエンド、バックエンドのビルドがすべて通るまでは、強制的な override は行わないでください。

正式な本番環境では、high advisory が残っている間は Strapi Admin を公開しないでください。上流修正を待つか、安全な override を確認するか、Strapi Admin をネットワークアクセス制御で保護された内部入口に降格してください。

## 補償的コントロール

- 独自管理パネルは、本番環境で `ADMIN_PANEL_ALLOWED_ROLES` が設定されていない場合 fail-closed になります。
- 内部レート制限エンドポイントは、本番環境で `PANEL_INTERNAL_TOKEN` を必須とします。
- 公開画像プロキシは HTTPS の Bilibili 画像 CDN host、画像 Content-Type、サイズ上限、リクエストタイムアウトに制限されています。
- 独自管理パネル API では、同期ログと監査ログは読み取り専用です。
- RSSHub 同期は制限付き並行処理と parser ベースの RSS 処理を使用します。
- Strapi Admin を公開する場合は、デフォルトではない `ADMIN_PATH` を使用し、デプロイ層の WAF / rate limit を設定したうえで `STRAPI_ADMIN_WAF_CONFIRMED=true` にします。
- 本番 CORS は `STRAPI_CORS_ORIGINS` で明示的に制御し、開放的なデフォルト値は使用しません。

Strapi をアップグレードするたびに、これらの advisory を再確認してください。
