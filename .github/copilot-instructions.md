# copilot.instructions.md

本リポジトリの実装において、Copilot（あなた）は「優秀なフルスタックエンジニア」として振る舞い、
以下の要件・制約・規約を満たすコード／設定を生成してください。

---

## 1. ゴール（必須要件）

- Node.js でフロントエンドとバックエンドを実装し、**1つの Docker コンテナ**としてホストすること。
- **複数ページ（MPA: Multi-Page Application）**を持つWebアプリを実装すること（SPA限定にしない）。
- 接続先クラウドサービスは **必ず Azure** を利用すること（例：Cosmos DB / Storage / Key Vault / App Insights など）。
- デプロイ先は **Azure Container Services** を目標とし、実装・構成は **Azure Container Apps** を第一候補として設計すること。
- CSS フレームワークとして **Tailwind CSS** を使用すること。

---

## 2. 推奨アーキテクチャ（このリポジトリの標準）

**Next.js（Node.js）を採用し、フロント（ページ）＋バック（API）を同一プロセスで提供する。**

- ルーティング：Next.js App Router（複数ページ）
- API：`/api/*` でバックエンド機能を提供（必要なら Azure SDK へ接続）
- 1コンテナで `next start` を実行し、HTTP を公開する

> 理由：MPA を自然に実現でき、同一 Node.js ランタイムでフロント／バックを統合しやすい。

---

## 3. 技術スタック（固定）

- Runtime: Node.js 20 LTS 以上
- Language: TypeScript（必須）
- Web: Next.js（App Router）
- Styling: Tailwind CSS（PostCSS 経由）
- Backend SDK: Azure SDK for JavaScript/TypeScript
- AuthN/AuthZ（推奨）: Microsoft Entra ID（OIDC）またはアプリ独自ログイン（ただし secrets 管理必須）
- Logging/Tracing: Application Insights（推奨）
- Container Hosting: Azure Container Apps（ACA）

---

## 4. リポジトリ構成（例）

- `src/`
  - `app/` # Next.js pages (App Router)
  - `app/api/` # API routes（バックエンド）
  - `lib/azure/` # Azure 接続（Cosmos/Storage/KeyVault等）
  - `lib/config/` # 設定読み込み（env + validation）
  - `components/` # UIコンポーネント
- `public/`
- `tests/` # unit/e2e（任意）
- `Dockerfile`
- `.dockerignore`
- `infra/` # Bicep/Terraform（推奨）
- `.github/workflows/` # CI/CD（推奨）
- `.env.template` # ローカル実行用の環境変数ファイルのテンプレート

---

## 5. 実装規約（必須）

### 5.1 コーディング規約

- TypeScript の `strict` を前提にし、型安全に実装する。
- エラーハンドリングは「ユーザー向けエラー」と「診断ログ」を分離する。
- UI はアクセシビリティ（最低限 aria / label）に配慮する。
- ページは複数用意する（例：`/` `/about` `/settings` `/items` 等）。リンクで遷移できること。

### 5.2 ログ

- 開発時に有用なログを `console.log` / `console.error` で適切に出力する。
- 重要な分岐・外部呼び出し・例外時にログを残す（過剰に個人情報は出さない）。
- 本番は Application Insights への出力を可能にする（環境変数でON/OFF）。

### 5.3 記載されていない要件

- 明示されていない要件は、合理的に推測して補完して実装する。
- 補完した仕様・判断は README またはコメントに残す。

---

## 6. Azure 連携（必須ルール）

### 6.1 認証（シークレットの扱い）

- **ローカル開発**：Azure CLI ログイン済みを前提に `DefaultAzureCredential` を利用する。
- **本番（Azure Container Apps）**：Managed Identity（システム割当またはユーザー割当）で `DefaultAzureCredential` を利用する。
- 認証情報（client secret / key）はリポジトリにコミットしない。
- 必要に応じて Key Vault を利用し、アプリ起動時に読み込む。

### 6.2 使う Azure サービス（例：最低1つは実装に含める）

必要に応じて以下のような Azure のサービスを利用する :

- Azure AI Foundry (LLM, 音声認識、音声合成、OCR など）
- Azure Cosmos DB（推奨：データ永続化）
- Azure Storage（Blob/Table/Queue など）
- Azure Key Vault（秘密情報）
- Azure App Configuration（設定）
- Azure Application Insights（観測）

---

## 7. 設定（環境変数）

### 7.1 必須

- `PORT`（ACA でのリッスンポート。既定 3000）
- `NODE_ENV`（development / production）
- `AZURE_TENANT_ID` 等は原則不要（DefaultAzureCredential 前提。必要ならオプション）

### 7.2 推奨（例）

- `COSMOS_ENDPOINT`
- `COSMOS_DATABASE`
- `STORAGE_ACCOUNT_URL`
- `APPLICATIONINSIGHTS_CONNECTION_STRING`

### 7.3 バリデーション

- 起動時に env を検証し、必須値が欠けている場合は分かりやすく失敗させる。

### 7.4 環境変数の読み込み

- Docker Container 内で実行する際には、コンテナの環境変数から読み込む
- ローカルでのデバッグ実行時には、dotenv モジュールなどを利用して .env ファイルから読み込む

### 7.5 環境変数の設定ファイル

- ローカル実行時には .env から環境変数を読み込ませるが、そのファイルは .gitignore に含めておいてシークレットなどが漏洩しないようにする
- 一方、.env のテンプレートとしての .env.template はプレースホルダーのみ配置したテンプレートファイルとして、 .gitignore に含めずにリポジトリを通じてユーザーに提供する

---

## 8. Docker（必須）

### 8.1 1コンテナで動かす

- フロント＋バックを同一コンテナに含める（Next.js の `next start` で提供）。
- マルチステージビルドを採用し、イメージのサイズ削減に努める（build と runtime を分離し、サイズ削減）。
- `HEALTHCHECK` を実装する（例：`/api/health` を追加）。

### 8.2 Linux/非root

- Linux コンテナを前提にする（ACA は Linux イメージが標準）。
- 可能なら non-root ユーザーで起動する。

---

## 9. Azure Container Apps（デプロイ前提）

- Ingress は HTTP を利用（必要ならカスタムドメイン/TLS を想定）。
- スケールは HTTP / CPU / キューなど将来拡張できる設計にする（KEDA トリガーを考慮）。
- ログは Log Analytics / App Insights と連携できるようにする。

---

## 10. README（必須）

- ローカル実行手順（環境変数設定、依存関係インストール、起動コマンドなど）。
- Docker ビルド・実行手順。
- Azure Container Apps へのデプロイ概要（必要なリソース、設定例など）。
- 使用している Azure サービスとその目的の説明。
- 日本語版をプライマリとして生成し、その英訳を -en のプリフィックスを付けたマークダウンに記述する
- 日本語ドキュメントと英語ドキュメントはお互いに切り替えられるようにする

---

## 11. Tailwind CSS（必須）

- Tailwind を導入し、基本的なレイアウト（ヘッダー/ナビ/フッター）を Tailwind の utility で構築する。
- ページ間の共通 UI（Layout）を作る。
- ダークモード（任意）を追加するなら Tailwind の `dark:` を使う。

---

## 12. 多言語対応

- 表示されている文字列はすべてリソース化し、多言語対応の準備を行う
- 画面ヘッダー部分に言語切り替えドロップダウンを設置し、言語リソースの切り替えが可能なようにする
- 言語リソースとしては、日本語がプライマリで、いまのところセカンダリで英語を実装しておく
- 今後他の言語も追加できるような設計にする
- 実装時には、今後 deprecate になる middleware ではなく proxy を使って実装する

---

## 13. 実装タスク（Copilot が生成すべき成果物）

最低限、以下を生成する：

1. Next.js + TypeScript + Tailwind の初期構成
2. 複数ページ（例：`/` `/about` `/items` `/settings`）とナビゲーション
3. API ルート（例：`/api/health` と Azure サービスにアクセスする `/api/items`）
4. Azure SDK を使った実装（例：Azure AI Foundry への接続）
5. Dockerfile（マルチステージ、1コンテナ、`next start`、`PORT` 対応）
6. README（ローカル実行、Docker 実行、Azure Container Apps へのデプロイ概要）

---

## 14. 禁止事項（重要）

- secrets（鍵・トークン・接続文字列）をコードやサンプルに直書きしない。
- Azure 以外のクラウドサービス（AWS/GCP 等）を前提にしない。
- 1コンテナ要件を破る構成（フロント別コンテナ、バック別コンテナ）にしない。
- 要件を満たすために無理な推測をせず、必要なら「前提」を明記して実装する。

---

## 15. あなたに対する期待

- あなたは優秀なフルスタックエンジニアです。
- 仕様が曖昧な場合は、最も一般的で安全な選択を行い、README に前提として明記してください。
