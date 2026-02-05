# アーキテクチャ概要

日本語 | [English](architecture-en.md)

## 目的

Architecture Diagram Maker は、アーキテクチャ図を素早く作成し、JSON として保存・共有できる軽量エディターです。ローカル保存に加え、Azure Cosmos DB を設定するとクラウド保存も利用できます。

## 主要コンポーネント

- Next.js (App Router, TypeScript)
  - 画面: `/`, `/editor`, `/items`, `/settings`, `/about`
  - API: `/api/health`, `/api/icons`, `/api/diagrams`
- UI コンポーネント
  - ヘッダー/フッター、ツールパネル、パレット、インスペクターなど
- データ層
  - 既定はブラウザのローカルストレージ
  - Cosmos DB が有効な場合は API 経由でクラウド保存

## データフロー

1. ユーザーがキャンバスで図を作成/更新
2. 保存時に `/api/diagrams` へ POST で送信
3. Cosmos DB が未設定の場合はローカルストレージへフォールバック
4. 一覧/読み込み/削除は `/api/diagrams` の GET/DELETE を利用

## Cosmos DB 連携の要点

- SDK: `@azure/cosmos` + `DefaultAzureCredential`
- 必須環境変数: `COSMOS_ENDPOINT`, `COSMOS_DATABASE`, `COSMOS_CONTAINER`
- パーティションキー: `/id` を前提
- 取得一覧は `SELECT c.id, c.name, c.updatedAt FROM c` を利用
- 例外時は診断情報をログ出力して原因特定を補助

> Cosmos DB のアイテムサイズは 2 MB 制限のため、1 図のデータが肥大化しすぎないように運用してください。

## 多言語対応

- 言語は `?lang=ja` / `?lang=en` のクエリで保持
- ヘッダーの言語ドロップダウンで切り替え
- 文字列は `src/lib/i18n.ts` で一元管理

## 設定と環境変数

- `PORT`: ACA でのリッスンポート (既定 3000)
- `NODE_ENV`: development / production
- `ICONS_SAMPLE_ENABLED`: `public/icons-sample` をパレットに表示するか
- Cosmos DB 用の 3 変数は設定時のみ有効

## セキュリティと認証

- ローカル開発: Azure CLI (`az login`) による AAD 認証
- 本番: Azure Container Apps のマネージド ID を利用
- 接続文字列や秘密情報はコードに含めない

## 関連ドキュメント

- [docs/architecture-diagram.md](architecture-diagram.md): アーキテクチャダイアグラム
- [docs/technology.md](technology.md): 利用技術の解説
- [docs/features.md](features.md): 実装済み機能一覧
- [docs/operations.md](operations.md): 運用手順 (詳細)
