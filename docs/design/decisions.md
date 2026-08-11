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

## 10. 参考資料

### 外部ドキュメント

- [Inkdrop Plugin Docs](https://developer.inkdrop.app/) - プラグイン API・ディレクトリ規約
- [Inkdrop Plugin: Configuration](https://developer.inkdrop.app/guides/config) - `config` スキーマの定義方法
- [Electron BrowserWindow.setOpacity](https://www.electronjs.org/docs/latest/api/browser-window#winsetopacityopacity-windows-macos) - `inkdrop.window.setOpacity()` の基盤 API

### 関連リンク

- [GitHub Releases](https://github.com/ban367/inkdrop-transparency/releases) - 各バージョンの変更内容
