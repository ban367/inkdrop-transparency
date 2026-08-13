<!-- このファイルは docs/design-doc.md の一部です -->

# 設計判断: 代替案・参考資料

## 8. 検討した代替案

### 代替案1: CSS によるエディタ領域のみの透過

**概要**: `styles/` にスタイルシートを追加し、Inkdrop の各 UI 要素の `background-color` を半透明にする。

**メリット**:
- エディタ・サイドバーなど領域ごとに透過度を変えられる
- ウィンドウ枠は不透明のまま保てる

**デメリット・不採用理由**:
- Inkdrop 本体の DOM 構造・クラス名に依存し、本体更新で壊れやすい
- Electron のウィンドウが不透明なままだと背後が透けず、期待した見た目にならない
- `inkdrop.window.setOpacity()` を使えば数行で目的を達成できる

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

**概要**: `setOpacity()` の引数をそのまま設定値とする。

**メリット**:
- 変換処理が不要

**デメリット・不採用理由**:
- ユーザーにとって「85%」の方が直感的
- 下限を設けないと 0 に近い値で操作不能になりうるため、いずれにせよ範囲制約は必要

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

### 代替案7: Inkdrop 6 に対応する

**概要**: `engines` を Inkdrop 6 まで広げ、透過を別方式で実装する。

**不採用理由**: Inkdrop 6.0.0 を実機調査した結果、**プラグインから透過を制御する手段が存在しない**。
以下はすべて実際のアプリケーション（`app.asar`）と `@inkdropapp/types` で確認した事実。

| 経路                         | 調査結果                                                                 |
| ---------------------------- | ------------------------------------------------------------------------ |
| `inkdrop.window.setOpacity()`| `IPCWindow` の型定義に存在せず、`app.asar` 内の出現も 0 件                |
| `@electron/remote`           | アプリ内に "@electron/remote is removed in v6" の記述があり利用不可       |
| IPC 経由での呼び出し         | `window:` チャンネルは 41 個の固定 allowlist。opacity 系も汎用の method 呼び出し口も無い |
| vibrancy の無効化            | `setVibrancy` / `setBackgroundMaterial` / `setAlphaValue` すべて 0 件。生成時に一度設定されるのみ |
| 設定による制御               | `core.mainWindow` のキーは `acrylicEnabled` 等のみで vibrancy に触れられない |
| acrylic を無効化する         | `transparent: true` は acrylic 分岐の 1 箇所のみ。無効化するとウィンドウが不透明になり透過不能 |
| CSS で背景を透過させる       | 実装して検証したが、背後は `vibrancy: 'under-window'` のすりガラスとして見えるだけで実用にならなかった |

CSS 方式では、全背景を透明にした状態でも不透明な DOM 要素は 0 個であり、
残るぼかしと明るさは OS が Web コンテンツの背後に合成しているマテリアルであることを確認した。
つまり DOM 側に手を入れて解決できる余地が無い。

理論上はネイティブアドオンから `NSWindow` を操作する手段が残るが、
Electron の ABI ごとのビルドが必要で、ipm はソース配布かつビルド工程を持たず、
「依存パッケージを持たない」という本プラグインの方針とも矛盾するため採らない。

検証した実装は `claude/inkdrop6-transparency` ブランチに残している。
本体に透過制御の API が追加されれば再開できる。

---

## 10. 参考資料

### 外部ドキュメント

- [inkdropapp/ipm](https://github.com/inkdropapp/ipm) - `publish` の実装（tarball 化とレジストリ登録のみで git 操作は行わない）と環境変数による認証
- [inkdropapp/ipm-cli](https://github.com/inkdropapp/ipm-cli) - CLI の認証フロー（キーリング参照）と `files` allowlist の仕様
- [Inkdrop Plugin Docs](https://developer.inkdrop.app/) - プラグイン API・ディレクトリ規約
- [Inkdrop Plugin: Configuration](https://developer.inkdrop.app/guides/config) - `config` スキーマの定義方法
- [Electron BrowserWindow.setOpacity](https://www.electronjs.org/docs/latest/api/browser-window#winsetopacityopacity-windows-macos) - `inkdrop.window.setOpacity()` の基盤 API

### 関連リンク

- [GitHub Releases](https://github.com/ban367/inkdrop-transparency/releases) - 各バージョンの変更内容
