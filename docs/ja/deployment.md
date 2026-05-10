# デプロイ説明

[简体中文](../zh-Hans/deployment.md) | [English](../en/deployment.md)

## バックエンド実行環境

- Strapi バックエンドは Node.js runtime 上で実行し、PostgreSQL を使用します。
- Next.js フロントエンドは、互換性のあるプラットフォームに別途デプロイできます。
- Strapi バックエンドを Cloudflare Workers または D1 にデプロイしないでください。Strapi には Node.js サーバー runtime と対応 SQL クライアントが必要であり、D1 は本プロジェクトの Strapi データベース対象ではありません。
- SQLite はローカル開発と一時環境のみを想定しています。`ALLOW_PRODUCTION_SQLITE=true` を明示しない限り、バックエンドは本番環境での SQLite を拒否します。

## PostgreSQL

Strapi バックエンドには PostgreSQL を使用します。

```env
DATABASE_CLIENT=postgres
DATABASE_URL=postgres://...
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false
DATABASE_POOL_MIN=0
DATABASE_POOL_MAX=5
```

小規模な serverless インスタンスでは接続プールを小さく保ちます。データベースプロバイダーがプール済み接続 URL を提供する場合はそれを使用し、`DATABASE_POOL_MIN=0` を維持します。

## 本番環境で必須のシークレット

以下の変数が未設定、またはプレースホルダーのままの場合、本番環境の起動は失敗します。

```env
APP_KEYS=
API_TOKEN_SALT=
ADMIN_JWT_SECRET=
TRANSFER_TOKEN_SALT=
JWT_SECRET=
ENCRYPTION_KEY=
ADMIN_PANEL_ALLOWED_ROLES=maintainer,admin
PANEL_INTERNAL_TOKEN=
RATE_LIMIT_HASH_SECRET=
CRON_ENABLED=false
ADMIN_PATH=/strapi-console-<random>
STRAPI_CORS_ORIGINS=https://bakivo.com,https://www.bakivo.com
STRAPI_ADMIN_WAF_CONFIRMED=true
CLOUDINARY_NAME=
CLOUDINARY_KEY=
CLOUDINARY_SECRET=
```

`PANEL_INTERNAL_TOKEN` はバックエンドとフロントエンドの環境で同一にする必要があります。
本番環境では `CRON_ENABLED` を明示的に設定してください。複数インスタンスの serverless 構成では、通常 cron を有効にするバックエンドは 1 つだけにします。
正式な本番環境では Cloudinary の 3 変数をすべて設定してください。未設定の場合は、正式本番ではなくデモ環境として扱います。

デプロイ前に確認します。

```bash
NODE_ENV=production pnpm verify:deploy
```

バックアップ、復元、空 DB のシードについては [backup-restore.md](./backup-restore.md) を参照してください。

## 無料デプロイ先の候補

推奨する無料デモ構成:

- フロントエンド: Vercel Hobby。
- バックエンド: Render Free Web Service または Koyeb Free Instance のどちらか。
- データベース: Neon Free PostgreSQL。永続的な本番データには Render Free Postgres を使用しないでください。
- メディア: Cloudinary Free。
- RSSHub: 現在の RSSHub デプロイでは Vercel を使用できます。
- DNS/CDN: Cloudflare。

Render Free と Koyeb Free はデモ環境向けであり、厳密な本番環境向けではありません。Render Free Web Service は約 15 分の無通信で sleep し、復帰に時間がかかります。Koyeb Free Instance はより小さく、約 1 時間無通信で scale to zero します。どちらもアップロード保存にローカルファイルシステムを依存しないでください。そのため Cloudinary 変数はすべて設定します。

Render バックエンドでは以下を使用できます。

```bash
corepack enable && pnpm install --frozen-lockfile && pnpm --dir backend build
pnpm --dir backend start
```

Root directory はリポジトリのルートにします。Node.js 20 または 22 を使い、`backend/.env.example` の本番変数を設定します。

より安定した完全無料構成が必要な場合は、Oracle Cloud Always Free VM も候補です。ただし serverless ではなく従来型 VM なので、Linux、Node.js、pnpm、プロセス管理、リバースプロキシ、TLS、セキュリティ更新を自分で管理する必要があります。Oracle のドキュメントでは Always Free リソースはアカウント存続中無料とされていますが、idle 状態の Always Free compute instance は回収される可能性があるため、DB バックアップと再構築手順を必ず残してください。

## 独自管理パネルのメンテナー復旧

`/{locale}/manage` の独自管理パネルは Strapi users-permissions のユーザーテーブルを使用し、Strapi 組み込み admin ユーザーテーブルは使用しません。

メンテナーアカウントを作成または復旧する場合は、1 回のデプロイで一時的に以下を設定します。

```env
ADMIN_PANEL_BOOTSTRAP_EMAIL=you@example.com
ADMIN_PANEL_BOOTSTRAP_USERNAME=maintainer
ADMIN_PANEL_BOOTSTRAP_PASSWORD=use-a-long-random-password
```

起動時に Strapi は以下を行います。

- `ADMIN_PANEL_ALLOWED_ROLES` のロールが存在することを確認する；
- 対応する users-permissions ユーザーを作成または更新する；
- 最初の許可ロールをそのユーザーに割り当てる；
- blocked を解除し、confirmed に設定する。

ログイン確認後、`ADMIN_PANEL_BOOTSTRAP_PASSWORD` は削除してください。

## Strapi 組み込み管理パネル

Strapi 組み込み管理パネルは独立した admin ユーザーテーブルを使用します。デプロイ間で `ADMIN_JWT_SECRET`、`TRANSFER_TOKEN_SALT`、`ENCRYPTION_KEY` を安定させてください。空のデータベースを再構築した場合は、Strapi 管理画面から最初の Strapi admin ユーザーを再作成します。

Strapi Admin を公開する場合:

- 本番環境ではデフォルトではない `ADMIN_PATH` を使い、`/admin` は許可しません；
- `STRAPI_CORS_ORIGINS` には本番フロントエンド、プレビュー環境、必要な独自パネルのドメインだけを設定します；
- デプロイ層で Strapi Admin ログイン、`/api/auth/local`、異常な静的アセットリクエストに WAF / rate limit を設定します；
- それらのデプロイ層の防御を設定した後にのみ `STRAPI_ADMIN_WAF_CONFIRMED=true` を設定します；
- Strapi Admin パスワードと独自パネル bootstrap パスワードは 16 文字以上にし、デフォルトまたは一時アカウントは削除します；
- `pnpm audit --prod` に high advisory が残る場合、Strapi Admin は公開しないでください。

## Cloudflare

Cloudflare は以下に適しています。

- DNS と CDN；
- 静的アセット；
- 互換性のない Node API に依存しない Next.js フロントエンド；
- 軽量な edge route handlers。

Cloudflare Workers と D1 は、本プロジェクトの Strapi バックエンドのサポート対象ではありません。Strapi バックエンドは Node.js + PostgreSQL に保ち、Cloudflare は runtime モデルに合う部分にのみ使用します。
