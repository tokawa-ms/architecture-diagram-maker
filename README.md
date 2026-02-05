# Architecture Diagram Maker

日本語 | [English](README-en.md)

## 概要

アーキテクチャダイアグラムを素早く作成し、JSON 形式で保存できる軽量エディターです。ローカルストレージ保存に加え、Azure Cosmos DB を設定するとクラウド保存も利用できます。

## 主な機能

- アイコンパレットから配置（`public/icons` 配下のアイコンを自動検出）
- サンプルアイコン（`public/icons-sample`）は環境変数で表示ON/OFF可能
- ボックス、テキスト、矢印、ラインの作成
- Z-Order 操作（前面/背面）と複製・削除
- ローカルストレージへの JSON 保存・読み込み
- PNG / JSON 形式でエクスポート

## ローカル実行

1. 環境変数ファイルを作成します。

```
cp .env.template .env
```

2. 依存関係をインストールします。

```
npm install
```

3. 開発サーバーを起動します。

```
npm run dev
```

`http://localhost:3000/editor` からエディターにアクセスできます。

### アイコン配置

- 本番用アイコンは `public/icons` 配下にフォルダ構造で配置してください。
  - `public/icons` の中身は `.gitignore` により Git にコミットされません。
  - フォルダ構造はそのままパレットのフォルダ構造として表示されます。
- サンプルアイコンは `public/icons-sample` にあります。
  - パレットに表示するかは `ICONS_SAMPLE_ENABLED` で制御します。

## Docker での実行

```
docker build -t architecture-diagram-maker .
docker run --rm -p 3000:3000 -e PORT=3000 architecture-diagram-maker
```

ヘルスチェックは `/api/health` を利用します。

## Azure Container Apps へのデプロイ概要

1. Azure Container Apps 環境と Log Analytics ワークスペースを用意します。
2. コンテナイメージをビルドして Azure Container Registry に push します。
3. Container Apps を作成し、`PORT` 環境変数を設定します。

## Azure サービスとの連携について

`/api/diagrams` で Azure Cosmos DB への保存・復元に対応しています。環境変数を設定しない場合はローカルストレージにフォールバックします。

### Cosmos DB 設定

以下を設定すると、DefaultAzureCredential を利用して Cosmos DB に接続します。

- `COSMOS_ENDPOINT`
- `COSMOS_DATABASE`
- `COSMOS_CONTAINER`

> コンテナのパーティションキーは `/id` を前提としています。

ローカル開発では `az login` 済みの Azure CLI 資格情報を利用します。本番は Azure Container Apps のマネージド ID で実行する想定です。

## 多言語対応

ヘッダーの言語ドロップダウンから日本語/英語を切り替えできます。URL パラメータ `?lang=ja` / `?lang=en` で保持します。
