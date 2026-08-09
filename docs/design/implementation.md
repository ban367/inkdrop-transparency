<!-- このファイルは docs/design-doc.md の一部です -->

# 実装方針: 技術スタック・ディレクトリ・規約・テスト

## 6. 実装方針

### 技術スタック

| 層               | 技術                        | バージョン | 選定理由                                             |
| ---------------- | --------------------------- | ---------- | ---------------------------------------------------- |
| 実行環境         | Inkdrop                     | `^4.x`     | 対象アプリケーション（`package.json` の `engines`）   |
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
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
└── package.json               # プラグインのメタデータ・バージョン
```

- `lib/` `keymaps/` `menus/` のディレクトリ名は Inkdrop の規約で固定されている
- ファイル名はプラグイン名 `transparency` に揃える

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

1. `package.json` / `package-lock.json` の `version` を更新する
2. main ブランチへの PR をタイトル `vX.X.X` で作成する
3. マージすると `.github/workflows/tag-version.yaml` が同名タグを自動付与する
