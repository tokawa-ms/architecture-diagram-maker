# nodejs-app-template

日本語 | [English](README-en.md)

## 概要

このリポジトリは、**Next.js + TypeScript + Tailwind CSS** を用いたアプリを **単一コンテナー** でホストし、**Azure Container Apps** にデプロイできる構成を生成するための **テンプレート** です。
Copilot 用の指示ファイル [.github/copilot-instructions.md](.github/copilot-instructions.md) が含まれており、プロジェクト要件（MPA、Azure 連携、Docker、README など）を満たす実装を生成できるように設計されています。

## 想定ユースケース

- Next.js (App Router) による **MPA** を作りたい
- フロントと API を **同一プロセス** で提供したい
- Azure SDK を使った **Azure サービス連携** を組み込みたい
- **Azure Container Apps** に 1 コンテナーでデプロイしたい

## テンプレートの使い方（Copilot で生成）

1. 本リポジトリをクローンする
2. Copilot に以下のような依頼を行う

例:

- 「copilot-instructions.md に従い、Next.js + Tailwind の初期構成と複数ページ、API ルートを作成して」
- 「Azure Cosmos DB に接続する `/api/items` を実装して」
- 「Dockerfile と README を整備して」

## 生成される想定構成（例）

```
src/
	app/           # Next.js pages (App Router)
	app/api/       # API routes
	components/    # UI コンポーネント
	lib/azure/     # Azure 接続
	lib/config/    # 環境変数の検証
public/
Dockerfile
.dockerignore
.env.template
README.md
README-en.md
```

## 必要な環境

- Node.js 20 LTS 以上
- Docker
- （推奨）Azure CLI (ローカル開発時に `DefaultAzureCredential` を使う場合)

## ローカル実行（生成後のアプリ）

1. 環境変数テンプレートを作成

```
cp .env.template .env
```

2. 依存関係をインストール

```
npm install
```

3. 開発サーバー起動

```
npm run dev
```

## Docker 実行（生成後のアプリ）

```
docker build -t my-app .
docker run --rm -p 3000:3000 -e PORT=3000 my-app
```

## Azure Container Apps へのデプロイ概要

以下は一般的な流れの概要です。実際の手順は生成される README に記載します。

1. Azure リソースの準備（Container Apps 環境、ログ基盤、必要な Azure サービス）
2. イメージのビルドとレジストリへの push
3. Container Apps へのデプロイ（Ingress 設定、環境変数の設定）

## このテンプレートが前提とする Azure サービス（例）

- Azure Container Apps（ホスティング）
- Azure Cosmos DB（データ永続化）
- Azure Storage（必要に応じて）
- Azure Key Vault / App Configuration（設定・シークレット）
- Application Insights（ログ・監視）

## 備考

- このリポジトリ自体は **テンプレート** のため、アプリ本体は含まれません。
- 具体的な実装は Copilot によって生成されます。
