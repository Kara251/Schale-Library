# デプロイ解説

## アーキテクチャ（2026-08 移行後）

```
bakivo.com (Cloudflare zone)
├── フロントエンド   Next.js 16（OpenNext on Workers; 移行準備は完了、下記参照）
├── コンテンツ API   server/ Hono Worker + D1（公開 REST + /panel パネル API）
├── アップロード     R2 バケット schale-uploads
├── リソースページ   drive.bakivo.com（OpenList、iframe 埋め込み）
└── DNS/CDN          Cloudflare
```

Strapi / PostgreSQL(Neon) / Cloudinary / Render / Vercel / RSSHub はすべて廃止済み。

## 初回デプロイ手順

### 1. D1 と R2 の作成

```bash
cd server
wrangler d1 create schale_db          # database_id を控えて wrangler.toml に記入
wrangler r2 bucket create schale-uploads
wrangler d1 migrations apply schale_db --remote
```

### 2. シークレットの設定

```bash
cd server
wrangler secret put SESSION_SECRET        # ランダム 32+ バイト
wrangler secret put PANEL_INTERNAL_TOKEN  # フロント/バック共有トークン（内部レート制限を有効にする場合）
```

### 3. Worker のデプロイ

```bash
cd server && wrangler deploy
# workers.dev ドメインを控え、bakivo.com/api サブパスまたは独立サブドメインにバインド（ルーティングは CF Dashboard で設定）
```

### 4. 最初のメンテナ アカウント

一回限りの環境変数を設定した後、任意のリクエストを発生させる（bootstrap は冪等）:

```bash
wrangler secret put BOOTSTRAP_ADMIN_USERNAME
wrangler secret put BOOTSTRAP_ADMIN_PASSWORD   # 16 文字以上
# /panel リクエストを一度発生させた後、2 つのシークレットを削除
```

### 5. データ移行（旧 Strapi → D1）

```bash
# a. 旧 Neon PG からエクスポート（旧スタックが稼働中の間に実行）
# b. 変換 + 301/外部リダイレクト マップテーブルを生成
cd server && node --experimental-strip-types scripts/transform.ts <エクスポートディレクトリ> /tmp/out
# c. D1 へ投入
node --experimental-strip-types scripts/load-d1.ts /tmp/out --remote
```

### 6. フロントエンド

```bash
cd frontend
# OpenNext 移行には確認済みのブロッカーあり: proxy.ts は Node runtime middleware であり、
# OpenNext v1.20 は未対応。Edge runtime に切り替えた上で実行:
pnpm deploy
```

移行完了までの過渡期: フロントエンドは引き続き Vercel にデプロイでき、`NEXT_PUBLIC_API_URL` を新 Worker に向ける。

## バックアップ

- D1 time travel: 30 日間の時点復元（CF Dashboard → D1 → Time Travel）
- コールドバックアップ: `wrangler d1 export schale_db --remote --output backup-$(date +%F).sql`、cron による週次バックアップを推奨

## 環境変数とシークレット一覧

| 変数 | 配置場所 | 説明 |
|------|----------|------|
| SESSION_SECRET | Worker secret | セッション署名 |
| PANEL_INTERNAL_TOKEN | Worker secret | 内部レート制限トークン（任意） |
| BOOTSTRAP_ADMIN_USERNAME/PASSWORD | 一時 secret | 最初のメンテナ |
| NEXT_PUBLIC_API_URL | フロントエンド env | コンテンツ API ベース URL |
| NEXT_PUBLIC_SITE_URL | フロントエンド env | サイト URL（sitemap/OG） |

## セキュリティ基準ライン（監査対応の結果を引き継ぎ）

- セッション cookie: httpOnly + Secure + SameSite=Strict、TTL 8h、テーブル照会による即時失効
- パスワード: PBKDF2-SHA256 10 万回反復（100000 は Workers WebCrypto の反復上限で、超えると NotSupportedError）
- セッション: sessions テーブルにはトークンの SHA-256 ダイジェストのみを保存する
- ログイン レート制限: CF-Connecting-IP、10 分あたり 30 回
- アップロード: マジックナンバー スニッフィング（jpeg/png/webp/gif）、SVG 無効、4/8/12MB の段階制限
- CSV エクスポート: 数式インジェクションの無効化
