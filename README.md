# Architecture Diagram Maker

日本語 | [English](README-en.md)

## 概要

アーキテクチャダイアグラムを素早く作成し、JSON 形式で保存できる軽量エディターです。まずは UI とローカルストレージ保存にフォーカスし、将来的に Azure Cosmos DB などの保存先を追加する前提で設計しています。

## 主な機能

- アイコンパレットから配置（`public/icons` に配置したアイコンを利用する想定）
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

現在はローカルストレージ保存のみを実装しています。将来的に Azure Cosmos DB などへ保存する際は、`/api/diagrams` を通じて Azure SDK を利用する設計に拡張する予定です。

## 多言語対応

ヘッダーの言語ドロップダウンから日本語/英語を切り替えできます。URL パラメータ `?lang=ja` / `?lang=en` で保持します。
