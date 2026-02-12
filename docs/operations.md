# 運用ガイド

日本語 | [English](operations-en.md)

## ローカル開発

1. `.env.template` を `.env` にコピー
2. `npm install` で依存関係を導入
3. `npm run dev` で起動
4. `http://localhost:3000/editor` にアクセス

## アイコン管理

- 本番アイコンは `public/icons` 配下に配置
- `public/icons` は Git 管理外 ( `.gitignore` )
- `ICONS_SAMPLE_ENABLED` で `public/icons-sample` の表示を切り替え

## 保存と復元

- 既定はブラウザのローカルストレージ
- Cosmos DB が有効な場合は `/api/diagrams` 経由でクラウド保存
- JSON のエクスポート/インポートで簡易バックアップが可能
- 履歴スナップショットはローカル保存され `/history` で復元可能

## 設定

- `/settings` で履歴保持件数と PNG エクスポート倍率を調整
- 既定値は環境変数で上書き可能
  - `NEXT_PUBLIC_HISTORY_LIMIT` (10〜1000)
  - `NEXT_PUBLIC_EXPORT_SCALE` (1〜8)
- 変更した値はローカルストレージに保存

## 簡易認証

- `USER_NAME` / `USER_PASS` を設定すると `/login` でログインが必要になる
- ログインは `/api/auth/login` で Cookie を発行し、`/api/auth/logout` で破棄する

## Microsoft Entra ID (MSAL) 認証

- Entra ID でアプリ登録 (SPA) を作成し、リダイレクト URI に `http://localhost:3000` と本番 URL を登録
- 環境変数に次を設定
  - `NEXT_PUBLIC_AZURE_AD_CLIENT_ID`
  - `NEXT_PUBLIC_AZURE_AD_TENANT_ID`
  - `NEXT_PUBLIC_AZURE_AD_REDIRECT_URI`
- MSAL が有効な場合は `/api/diagrams` へ ID トークンが送信され、メールアドレス単位で Cosmos DB のデータが分離される
- MSAL 有効時は `/account` でアカウント情報を確認できる

## Azure Container Apps でのホスト手順 (詳細)

1. Azure Container Registry (ACR) を作成
2. イメージをビルドして ACR に push
3. Azure Container Apps 環境とアプリを作成
4. 環境変数を設定
   - `PORT` (既定 3000)
   - `NODE_ENV=production`
   - Cosmos DB 利用時は `COSMOS_ENDPOINT` / `COSMOS_DATABASE` / `COSMOS_CONTAINER`
5. ヘルスチェックに `/api/health` を設定
6. アプリのマネージド ID を有効化
7. ログは Log Analytics / Application Insights に接続

> このアプリは単一コンテナで `next start` を実行する構成です。

## Cosmos DB の設定 (詳細)

### リソース準備

- Azure Cosmos DB (SQL API) のアカウントを作成
- データベースとコンテナを作成
  - パーティションキー: `/id`
  - 予測スループットに応じて RU を設定

### 認証 (AAD)

- ローカル: `az login` 済みの Azure CLI 資格情報を利用
- 本番: Container Apps のマネージド ID を利用
- RBAC で次のいずれかを付与
  - 読み書き: `Cosmos DB Built-in Data Contributor`
  - 読み取りのみ: `Cosmos DB Built-in Data Reader`

### 接続設定

- `.env` もしくは ACA の環境変数に以下を設定
  - `COSMOS_ENDPOINT`
  - `COSMOS_DATABASE`
  - `COSMOS_CONTAINER`

> Cosmos DB は 2 MB のアイテム上限があるため、1 図が極端に大きくならないよう注意してください。

## トラブルシューティング

- Cosmos DB 接続エラー時はサーバーログの `diagnostics` を確認
- Cosmos DB の接続確認は GET `/api/diagnostics`
- 429 が発生する場合は RU を引き上げるか保存頻度を調整
- API から 501 が返る場合は Cosmos DB の環境変数が未設定
