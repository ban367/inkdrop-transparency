<!-- このファイルは docs/design-doc.md の一部です -->

# 設計判断: 代替案・参考資料

## 8. 検討した代替案

### 代替案1: CSS による透過（v1 では不採用、v2 で採用）

**概要**: スタイルシートで Inkdrop の背景色を半透明にする。

**v1 での不採用理由**:
- Inkdrop 本体の DOM 構造・クラス名に依存し、本体更新で壊れやすい
- Electron のウィンドウが不透明なままだと背後が透けず、期待した見た目にならない
- `inkdrop.window.setOpacity()` を使えば数行で目的を達成できる

**v2 で採用に転じた理由**:
- Inkdrop 6 で `inkdrop.window.setOpacity()` が削除され、`@electron/remote` も利用できなくなったため、
  ウィンドウの不透明度を直接操作する手段が公開 API に存在しない
- Inkdrop 6 の acrylic ウィンドウは `transparent: true` で生成されるため、
  「ウィンドウが不透明で背後が透けない」という不採用理由が解消された
- 背景色が CSS カスタムプロパティ（`--page-background` 等）で定義されており、
  DOM 構造やクラス名ではなく変数を上書きするだけで済むため、当初懸念した脆さが小さい

---

### 代替案1-2: Inkdrop 6 対応を見送り、`setOpacity` のまま v4 / v5 のみを対象とする

**概要**: `engines` を `<6.0.0` に制限し、Inkdrop 6 は非対応とする。

**メリット**:
- 実装を変更しなくてよい
- 既存利用者への影響がない

**デメリット・不採用理由**:
- macOS で Inkdrop 6 が既定になっており、対象利用者がいなくなっていく
- 透過度を調整したいという要求自体は Inkdrop 6 でも変わらず存在する

---

### 代替案2: 透過度の状態をプラグイン側で保持し、トグルコマンドにする

**概要**: `transparency:toggle` を1つ用意し、現在の有効／無効をモジュール変数で管理する。

**メリット**:
- キーバインドが1つで済む

**デメリット・不採用理由**:
- ウィンドウ間・再起動をまたぐと内部状態と実際の表示がずれる
- 「今どちらの状態か」がユーザーから見えず、意図しない側に切り替わる
- active / deactive を分けると常に結果が確定し、状態を持たずに済む

---

### 代替案3: 設定値を 0〜1 の小数で保持する

**概要**: 不透明度を 0〜1 の小数で設定させる。

**メリット**:
- v1 では `setOpacity()` の引数にそのまま渡せた

**デメリット・不採用理由**:
- ユーザーにとって「85%」の方が直感的
- 下限を設けないと 0 に近い値で操作不能になりうるため、いずれにせよ範囲制約は必要
- v2 では CSS の `%` 表記にそのまま使えるため、パーセント保持の利点がさらに大きい

---

### 代替案4: PR タイトルからタグを自動生成する（テンプレートの `tag-version.yaml`）

**概要**: main への PR タイトルが `vX.X.X` 形式のときに、ワークフローが同名タグを自動付与する。

**メリット**:
- タグの打ち忘れ・打ち間違いが起きない
- テンプレート (ban367/template) と構成が揃う

**デメリット・不採用理由**:
- `GITHUB_TOKEN` で作成・push されたタグは他のワークフローを起動しない（GitHub の再帰実行防止仕様）ため、
  `on: push: tags` のリリースワークフローが発火しない
- タグ作成をオーナーのみに制限する ruleset と両立しない（bot が弾かれる）
- リリースの起点が「PR のマージ」と「タグ」の2箇所に分かれ、責任の所在が曖昧になる

テンプレート由来の構成だが、本リポジトリのリリース要件と両立しないため削除した。

---

### 代替案5: CI で `ipm publish` (CLI) をそのまま実行する

**概要**: `@inkdropapp/ipm-cli` をインストールし、ワークフローから `ipm publish` を実行する。

**メリット**:
- ローカルでの手順とコマンドが完全に一致する
- 独自スクリプトを持たなくて済む

**デメリット・不採用理由**:
- CLI は認証情報を OS キーリングからのみ読み、未設定だと対話的な設定フローに入るため CI で停止する
- キーリングを CI 上で用意する回避策は、ランナー環境に依存し壊れやすい
- ライブラリ `@inkdropapp/ipm` は環境変数の認証情報を優先するため、
  数行のスクリプトから呼ぶだけで CI 要件を満たせる

---

### 代替案6: リリース成果物を GitHub Release のみとする

**概要**: タグ契機で GitHub Release だけを作成し、レジストリへの公開は従来どおり手元で行う。

**メリット**:
- Secrets の管理が不要で、認証情報の漏洩リスクを持ち込まない
- ワークフローが単純

**デメリット・不採用理由**:
- 利用者は `ipm install transparency` で導入するため、
  GitHub Release を作ってもレジストリには何も反映されず、リリースが自動化されたことにならない
- 「タグ = 公開済み」という不変条件が保てず、公開漏れに気付けない

---

## 10. 参考資料

### 外部ドキュメント

- [inkdropapp/ipm](https://github.com/inkdropapp/ipm) - `publish` の実装（tarball 化とレジストリ登録のみで git 操作は行わない）と環境変数による認証
- [inkdropapp/ipm-cli](https://github.com/inkdropapp/ipm-cli) - CLI の認証フロー（キーリング参照）と `files` allowlist の仕様
- [Inkdrop Plugin Docs](https://developer.inkdrop.app/) - プラグイン API・ディレクトリ規約
- [Inkdrop Plugin: Configuration](https://developer.inkdrop.app/guides/config) - `config` スキーマの定義方法
- [@inkdropapp/types](https://www.npmjs.com/package/@inkdropapp/types) - Inkdrop 6 の API 型定義。`IPCWindow` に `setOpacity` が無いことの根拠
- [CSS Cascade Layers](https://developer.mozilla.org/docs/Web/CSS/@layer) - レイヤーなしの宣言が `@layer` より優先される規則（本体スタイルを上書きする根拠）

### 関連リンク

- [GitHub Releases](https://github.com/ban367/inkdrop-transparency/releases) - 各バージョンの変更内容
