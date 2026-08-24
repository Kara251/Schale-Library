# Schale Library - シャーレ図書館

**本プロジェクトは Claude、ChatGPT、Gemini などの AI ツールを使用して開発されています。**

[简体中文](../zh-Hans/README.md) | [English](../en/README.md)

## 概要

Schale Library は、ゲーム作品『ブルーアーカイブ』に関連する内容や、ゲーム外の作品、イベント、資料を整理するためのシステムです。

図書館 URL：[https://bakivo.com](https://bakivo.com)

## 技術スタック

- **フルスタックフレームワーク:** [React](https://github.com/facebook/react) + [Next.js](https://github.com/vercel/next.js) App Router + [TypeScript](https://github.com/microsoft/TypeScript)
- **スタイル:** [Shadcn/UI](https://github.com/shadcn-ui/ui) + [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss)
- **バックエンド:** [Hono](https://github.com/honojs/hono) on Cloudflare Workers
- **データベース:** Cloudflare D1 (SQLite)
- **データ処理:** Next.js Route Handlers
- **オブジェクトストレージ:** Cloudflare R2
- **ドライブ:** [OpenList](https://github.com/OpenListTeam/OpenList) + OneDrive

## ローカル開発

- このプロジェクトは pnpm workspace を使用しており、Docker は不要です。
- 依存関係のインストール：`pnpm install`
- バックエンドの起動（ローカル Workers）：`pnpm dev:server`
- フロントエンドの起動：`pnpm dev:frontend`
- バックエンドのテスト：`pnpm test:server`
- 管理パネルは `/{locale}/manage` にあります。同一オリジンの Next.js Route Handlers と HttpOnly Cookie セッションを通じてバックエンドにアクセスし、コンテンツ管理、ユーザー管理、アップロード、監査ログの確認を行えます。

## デプロイ

デプロイ、データベース、メンテナーアカウント復旧については [デプロイ説明](deployment.md) を参照してください。

セキュリティの補償的コントロールと依存関係監査については [セキュリティメモ](security.md) を参照してください。

データベースのインデックスについては [データベースインデックス](database-indexes.md) を参照してください。

## 権利表記

- **コード:** このリポジトリ内のソースコードは [MIT License](../../LICENSE) の下で公開されています。
- **素材:** 本プロジェクトで使用されるゲーム由来または公式派生の素材、キャラクター画像、アイコン、音声、テキスト、UI デザインなどの権利は、**Nexon Games**、**Yostar** および関連する権利者に帰属します。本プロジェクトは公式の二次創作ガイドラインを尊重します。
- **非営利声明:** 本プロジェクトは関連コンテンツの整理と表示を目的とした非営利のファンプロジェクトです。権利者から削除要請があった場合は対応します。
- **フォント:** BlueakaBeta2GBK は [キヴォトス古書館](https://kivo.wiki)、Noto Sans JP は [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+JP) に由来します。
