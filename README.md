# socloudy

軽量でかわいい、ちょっと風変わりな Bluesky (AT Protocol) クライアント。
A lightweight, cute, quirky Bluesky client.

投稿・通知・検索・プロフィールを、青空にふわふわ浮かぶ雲のカードとして表示します。
bun + React 19 + React Router (SPA) + Tailwind v4。PWA / iOS (Capacitor) 対応。

## スタック

| 領域 | 採用 |
| --- | --- |
| ランタイム / パッケージ管理 | bun |
| ビルド | Vite 6 |
| UI | React 19 + Tailwind CSS v4 |
| ルーティング | React Router v7 (library / SPA モード) |
| サーバー状態 | TanStack Query (無限スクロール・楽観的更新) |
| クライアント状態 | Jotai (認証セッション / コンポーザ / テーマ) |
| Bluesky SDK | `@atproto/api` |
| i18n | i18next + react-i18next (ja / en) |
| Lint / Format | Biome |

## セットアップ

```bash
bun install
bun run dev      # 開発サーバー
bun run build    # 型チェック + 本番ビルド
bun run preview  # ビルド結果をプレビュー
bun run lint     # Biome チェック
bun run format   # Biome フォーマット
```

## ログイン

`bsky.social`（または任意の PDS）の **アプリパスワード** でログインします。
通常のパスワードではなく、Bluesky の設定で発行したアプリパスワードを使ってください。
セッションは `localStorage` に保存され、再読み込みしても維持されます。

## 機能 (MVP)

- ログイン / ログアウト（セッション復元つき）
- ホームタイムライン（無限スクロール）
- 投稿の作成・返信
- いいね / リポスト（楽観的更新）
- プロフィール表示と投稿一覧
- スレッド表示
- ダークモード（light / dark / system）
- 多言語（日本語 / 英語）

## 構成

```
src/
  atoms/        Jotai アトム (auth, composer)
  components/   UI コンポーネント
  i18n/         i18next 設定と ja/en リソース
  lib/          agent (ATProto), queries (TanStack), auth, theme, util
  routes/       画面 (Login, Home, Profile, Thread)
  router.tsx    ルート定義
  main.tsx      エントリ
```

## 設計メモ

- **agent.ts**: `@atproto/api` の `AtpAgent` をアプリ単一インスタンスで保持。`persistSession`
  で localStorage と同期。PDS を切り替えると ESM live binding で `agent` を差し替える。
- **queries.ts**: いいね/リポストはキャッシュ済みポストをその場でパッチして楽観的に反映。
- **PostCard**: "stretched link" パターンでカード全体をスレッドへのリンクにしつつ、
  内部のボタン/リンクを前面 (`z-10`) に出してクリックを両立。
