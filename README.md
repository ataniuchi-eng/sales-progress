# 営業ダッシュボード

Cell Promote 社内用営業進捗管理ダッシュボード

## セットアップ手順

### 1. 依存パッケージのインストール

```bash
cd sales-dashboard
npm install
```

### 2. Vercel にデプロイ

#### A. GitHub リポジトリに Push

```bash
git init
git add .
git commit -m "初回コミット"
git remote add origin https://github.com/YOUR_ORG/sales-dashboard.git
git push -u origin main
```

#### B. Vercel でプロジェクト作成

1. [vercel.com](https://vercel.com) にログイン
2. 「New Project」→ GitHub リポジトリを選択
3. そのままデプロイ

#### C. Vercel Postgres の設定

1. Vercel ダッシュボード → プロジェクト → **Storage** タブ
2. **Create Database** → **Postgres** を選択
3. データベースを作成（リージョンは **Tokyo** 推奨）
4. 「Connect」をクリック → 環境変数が自動設定されます

#### D. 認証用の環境変数を設定

Vercel ダッシュボード → **Settings** → **Environment Variables** で以下を追加：

| 変数名 | 値 |
|---|---|
| `AUTH_EMAIL` | `ites@cellpromote.biz` |
| `AUTH_PASSWORD_HASH` | 下記コマンドで生成 |
| `JWT_SECRET` | ランダムな文字列（`openssl rand -hex 32` で生成） |

パスワードハッシュの生成：

```bash
node lib/setup-db.mjs
```

出力されたハッシュ値を `AUTH_PASSWORD_HASH` に設定してください。

#### E. 再デプロイ

環境変数設定後、Vercel で **Redeploy** を実行

### 3. ローカル開発

```bash
# .env.local を作成（.env.local.example を参考に）
cp .env.local.example .env.local
# 環境変数を編集
# Vercel Postgres の接続情報は `vercel env pull` で取得可能

npm run dev
```

## 技術構成

- **フロントエンド**: Next.js 14 (App Router) + React 18
- **バックエンド**: Next.js API Routes
- **データベース**: Vercel Postgres (PostgreSQL)
- **認証**: JWT (jose) + Cookie ベース
- **デプロイ**: Vercel

## ログイン情報

- **ID**: ites@cellpromote.biz
- **パスワード**: 環境変数で管理
