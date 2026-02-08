# 技術スタック

日本語 | [English](technology-en.md)

## フロントエンド

- Next.js App Router + React 19 + TypeScript
- 画面: `/`, `/editor`, `/items`, `/history`, `/settings`, `/about`
- 多言語: `src/lib/i18n.ts` で文言を一元管理し、`?lang=` で切り替え

## UI / スタイル

- Tailwind CSS v4 (PostCSS)
- 共通 UI: `SiteHeader` / `SiteFooter` をベースに構成

## バックエンド / API

- Next.js Route Handlers (Node.js 20)
- `/api/health`, `/api/icons`, `/api/diagrams`, `/api/auth/login`, `/api/auth/logout`

## データ保存

- 既定はブラウザのローカルストレージ (保存・履歴・ドラフト)
- Azure Cosmos DB (SQL API) が設定されている場合は `@azure/cosmos` と `DefaultAzureCredential` を利用

## エクスポート

- `html2canvas` により PNG 画像を生成
- JSON 形式のエクスポート / インポート

## コンテナ / ホスティング

- Docker マルチステージビルド
- Azure Container Apps で `next start` を実行する構成

## ログ / 監視

- 例外や診断情報は `console` に出力
- Container Apps のログは Log Analytics / Application Insights に接続する想定
