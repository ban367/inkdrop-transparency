# inkdrop-transparency

## 言語設定

- すべての応答・コードコメント・エラーメッセージは日本語で記述
- **コミットメッセージは英語**（Conventional Commits形式: `feat:`, `fix:`, `refactor:` 等）
- 技術用語は不自然な日本語訳を避け英語併記可

> ただし `README.md` および `lib/` 配下のユーザー向け文字列（設定項目のタイトル・説明、メニューラベル等）は
> ipm で公開されるプラグインの表示物のため英語のままとする。

## プロジェクト概要

このプロジェクトは [Inkdrop](https://www.inkdrop.app/) のプラグイン `transparency` です。
Inkdrop のウィンドウ透過度を設定画面から変更でき、コマンド・キーマップ・メニューから
透過の有効化／無効化を切り替えられます。

## ディレクトリ構造

- `lib/` - プラグイン本体（エントリポイントは `lib/transparency.js`）
- `keymaps/` - キーバインド定義
- `menus/` - メニュー定義
- `docs/` - 詳細ドキュメント

## 開発コマンド

ビルド・テスト・Lint のスクリプトは未設定です（依存パッケージなしの素の JavaScript）。
CLI は `npm install -g @inkdropapp/ipm-cli` で導入する。

- 動作確認: `ipm link` で本リポジトリを Inkdrop にリンクし、Inkdrop を再起動する
- 公開内容の確認: `ipm publish --dry-run`（レジストリには反映されない）
- 配布: `ipm install transparency`（利用者向け）

## リリース

タグ契機で `.github/workflows/release.yaml` が自動実行される。手順は README の Release flow を参照。

- タグ (`v*`) の作成はリポジトリオーナーのみに ruleset で制限している
- ワークフローはタグ名と `package.json` の `version` の一致を検証し、不一致なら失敗する
- レジストリへの公開には Secrets `INKDROP_ACCESS_KEY_ID` / `INKDROP_SECRET_ACCESS_KEY` が必要
- 配布物は `package.json` の `files` で `lib` / `keymaps` / `menus` に限定している。
  配布に含めるファイルを増やす場合はここを更新する

## 設計方針

- 依存パッケージを持たず、Inkdrop が提供する API (`inkdrop.config` / `inkdrop.commands` / `inkdrop.styles` / `inkdrop.notifications`) のみを使用する
- Inkdrop 6 には `inkdrop.window.setOpacity()` が存在しない。透過は acrylic ウィンドウの背景色変数を
  スタイルシートで上書きして実現する。利用可能な API は `@inkdropapp/types` で確認する
- `lib/` は CommonJS で記述する（`global.require()` で読み込まれるため）
- 機能は「透過度の設定」と「有効化／無効化」に限定し、過剰な機能追加を避ける
- 透過度の値は設定 (`transparency.transparencySetting`) を単一の情報源とし、内部状態を持たない

## 詳細ドキュメント

- [Design Doc](docs/design-doc.md) - 設計ドキュメントのエントリポイント

## 設計ドキュメント

- エントリポイントは `docs/design-doc.md`（ドキュメント構成表あり）
- 実装タスクでは以下を優先参照する:
  - `docs/design/detailed-design.md` - データモデル・API仕様
  - `docs/design/implementation.md` - ファイル配置・コーディング規約
- アーキテクチャ全体の確認が必要な場合は `docs/design/architecture.md` を参照する
- 機能の背景・スコープを確認する場合のみ `docs/design/overview.md` を参照する
- 設計の意図・判断・制約が変わった場合は、実装と同時に該当ドキュメントを更新する:
  - データモデル・APIの変更 → `docs/design/detailed-design.md`
  - ディレクトリ構成・技術スタック・規約の変更 → `docs/design/implementation.md`
  - コンポーネント構成・データフローの変更 → `docs/design/architecture.md`
  - 採用しなかった代替案・トレードオフ → `docs/design/decisions.md`
- ドキュメントと実装の乖離を発見した場合は、ドキュメントを実態に合わせて修正する
