<!-- このファイルは docs/design-doc.md の一部です -->

# 実装方針: 技術スタック・ディレクトリ・規約・テスト

## 6. 実装方針

### 技術スタック

| 層               | 技術                        | バージョン | 選定理由                                             |
| ---------------- | --------------------------- | ---------- | ---------------------------------------------------- |
| 実行環境         | Inkdrop                     | `>=4.0.0 <7.0.0` | 対象アプリケーション（`package.json` の `engines`）。既存の v4 / v5 利用者を維持しつつ 6 を対象に含める。未リリースの 7 は検証できないため上限を設ける |
| 言語             | JavaScript (ES Modules)     | -          | Inkdrop プラグインの標準的な記述形式                 |
| トランスパイル   | `'use babel'` プラグマ      | -          | Inkdrop 本体の Babel 変換に委譲し、ビルド構成を持たない |
| 依存パッケージ   | なし                        | -          | Inkdrop API のみで要件を満たせるため                 |
| 配布             | ipm (Inkdrop Package Manager) | -        | Inkdrop 標準のプラグイン配布経路                     |

### ディレクトリ構成

```text
.
├── lib/
│   └── transparency.js        # プラグイン本体（package.json の main）
├── keymaps/
│   └── transparency.json      # キーバインド定義
├── menus/
│   └── transparency.json      # メニュー定義
├── docs/
│   ├── design-doc.md          # 設計ドキュメントのエントリポイント
│   ├── design/                # 分割された設計ドキュメント
│   └── preferences.png        # README 用のスクリーンショット
├── .github/
│   ├── workflows/             # GitHub Actions
│   ├── scripts/
│   │   └── publish.mjs        # レジストリ公開スクリプト（CIから実行）
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
└── package.json               # プラグインのメタデータ・バージョン・配布対象
```

- `lib/` `keymaps/` `menus/` のディレクトリ名は Inkdrop の規約で固定されている
- ファイル名はプラグイン名 `transparency` に揃える
- 配布対象は `package.json` の `files` で `lib` / `keymaps` / `menus` に限定している。
  指定しない場合、`ipm publish` は denylist（`node_modules` / `.git` 等）を除く
  ディレクトリ全体を tarball 化するため、`docs/` や `.github/` まで利用者に配布されてしまう
  （`package.json` / `README*` / `LICENSE*` / `main` のエントリポイントは常に含まれる）

### コーディング規約（機能固有）

<!-- プロジェクト横断の規約は AGENTS.md および .github/instructions/ を参照。 -->

- ユーザーに表示される文字列（設定項目の `title` / `description`、メニューラベル）は英語で記述する
  - ipm 経由で公開されるプラグインのため
- Inkdrop API 以外の依存を追加しない
- 透過度の状態をモジュール変数として保持せず、必要時に `inkdrop.config.get()` で都度取得する
- コマンド名は `transparency:<動作>` 形式とし、`keymaps/` `menus/` と一致させる
- 新しいコマンドを追加する場合は `activate()` での登録・キーマップ・メニュー・本ドキュメントを同時に更新する

### テスト方針

自動テストは未整備（テストランナー・依存パッケージを持たない）。
変更時は Inkdrop 上での手動確認を行う。

| 確認項目                 | 手順                                                             |
| ------------------------ | ---------------------------------------------------------------- |
| 起動時の自動適用         | Inkdrop を再起動し、メインウィンドウが設定値どおり透過すること   |
| 有効化                   | `cmd-t` またはメニューの Activate で透過すること                 |
| 無効化                   | `alt-cmd-t` またはメニューの Deactivate で不透明に戻ること       |
| 設定変更の反映           | 設定値を変更後、`transparency:active` で新しい値が反映されること |
| プラグイン無効化         | プラグインを無効にするとウィンドウが不透明に戻ること             |

### リリース手順

タグの作成を起点に `.github/workflows/release.yaml` が自動実行される。

1. `package.json` / `package-lock.json` の `version` を更新する PR を main にマージする
2. オーナーがマージコミットに `vX.X.X` のタグを作成して push する
3. ワークフローが以下を順に実行する
   1. タグ名と `package.json` の `version` の一致を検証（不一致なら失敗して以降を実行しない）
   2. `@inkdropapp/ipm` でレジストリへ公開
   3. `gh release create --generate-notes` で GitHub Release を作成

`workflow_dispatch` でタグを指定すると dry-run のみを実行でき、
レジストリへ反映せずに認証情報とパッケージ内容を検証できる。

#### 前提となるリポジトリ設定

| 種別    | 名前                          | 用途                                        |
| ------- | ----------------------------- | ------------------------------------------- |
| Secret  | `INKDROP_ACCESS_KEY_ID`       | レジストリ認証（Inkdrop のアクセスキー）    |
| Secret  | `INKDROP_SECRET_ACCESS_KEY`   | レジストリ認証（同上）                      |
| Ruleset | タグ `v*` の Restrict creations | タグ作成をオーナーのみに制限                |

アクセスキーは Inkdrop アプリの `application:display-access-key` コマンドで表示できる。

#### 公開処理を CLI ではなくライブラリから呼ぶ理由

`@inkdropapp/ipm-cli` の `ipm publish` は実行前に OS キーリングを参照し、
未設定の場合は対話的な設定フロー（デスクトップアプリの起動と stdin 入力）に入るため CI では利用できない。
ライブラリ `@inkdropapp/ipm` は環境変数
`INKDROP_ACCESS_KEY_ID` / `INKDROP_SECRET_ACCESS_KEY` を優先して読むため、
`.github/scripts/publish.mjs` から直接呼び出している。
