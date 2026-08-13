<!-- このファイルは docs/design-doc.md の一部です -->

# 詳細設計: データモデル・API仕様・エラーハンドリング

## 5. 詳細設計

### データモデル

プラグインが保持する永続データは Inkdrop の設定値 4 つのみで、内部状態は持たない。

```json
// package.json
"configSchema": {
  "sidebarOpacity":  { "type": "number", "default": 40,  "minimum": 0, "maximum": 200 },
  "noteListOpacity": { "type": "number", "default": 40,  "minimum": 0, "maximum": 200 },
  "editorOpacity":   { "type": "number", "default": 40,  "minimum": 0, "maximum": 200 },
  "menuOpacity":     { "type": "number", "default": 100, "minimum": 0, "maximum": 200 }
}
```

| 設定キー                          | 対象領域                             | 既定値 | 範囲   |
| --------------------------------- | ------------------------------------ | ------ | ------ |
| `transparency.sidebarOpacity`     | サイドバー                           | 40     | 0〜200 |
| `transparency.noteListOpacity`    | ノート一覧                           | 40     | 0〜200 |
| `transparency.editorOpacity`      | エディタ領域                         | 40     | 0〜200 |
| `transparency.menuOpacity`        | メニュー・ドロップダウン・ドロワー   | 100    | 0〜200 |

いずれも **Inkdrop 既定の不透明度に対する倍率（%）** であり、100 で Inkdrop 既定と完全に一致する
（＝透過を追加しない）。値を下げるほど Inkdrop 既定より透過が強くなる。

主要3領域の既定を 40 としているのは、実機で確認した結果 100 付近では体感的な変化が乏しく、
40 前後でようやく「透過が効いている」と感じられたため。メニュー類は Inkdrop が可読性のため
不透明にしており、既定では透過を追加しない。

**倍率として持つ理由。** Inkdrop の既定値は領域ごとにもライト／ダークごとにも大きく異なる
（サイドバーはライト 2% / ダーク 10%、ノート一覧はライト 80% / ダーク 50%）。
絶対値で指定させると、ある領域に合わせた値が別の領域では破綻し、
一律の値で上書きすれば素の acrylic より不透明になって「上げるほど透ける」逆転が起きる。
倍率であれば Inkdrop 側の調整を保ったまま、1つの値で両テーマを破綻なく動かせる。

上限は 200 とし、算出後の不透明度は 100% で丸める。

**スキーマは `package.json` の `configSchema` で宣言しなければならない。**
Inkdrop 6 の登録経路は2つあり、呼ばれるタイミングが異なる。

| 宣言方法                         | 登録するメソッド                       | 呼ばれるタイミング     |
| -------------------------------- | -------------------------------------- | ---------------------- |
| `package.json` の `configSchema` | `registerConfigSchemaFromMetadata()`   | `preload()` / `load()` |
| メインモジュールの `config`      | `registerConfigSchemaFromMainModule()` | `activateNow()`        |

設定画面は別ウィンドウでプラグインを `loadPackage` するだけで activate しないため、
後者では設定項目が設定画面に表示されない。

### 透過の実現方式

Inkdrop 6 には `inkdrop.window.setOpacity()` が存在しない（`@electron/remote` も削除済み）。
ウィンドウの不透明度を直接操作する手段は公開 API に無い。

代わりに acrylic ウィンドウを利用する。`core.mainWindow.acrylicEnabled` が有効な場合、
ウィンドウは Electron の `transparent: true` / `vibrancy: 'under-window'` で生成され、
`body` に `acrylic-window` クラスが付く。このとき背景色は CSS カスタムプロパティで
制御されているため、`inkdrop.styles.addStyleSheet()` で上書きして不透明度を変更する。

#### 上書きする変数と Inkdrop 既定値

| 変数                               | 対象領域             | 設定キー          | light                  | dark                     |
| ---------------------------------- | -------------------- | ----------------- | ---------------------- | ------------------------ |
| `--sidebar-background`             | サイドバー           | `sidebarOpacity`  | `--hsl-white` 2%       | `--hsl-black` 10%        |
| `--note-list-bar-background`       | ノート一覧           | `noteListOpacity` | `--hsl-stone-100` 80%  | `--hsl-neutral-900` 50%  |
| `--editor-background`              | エディタ領域         | `editorOpacity`   | `--hsl-white` 70%      | `--hsl-neutral-950` 60%  |
| `--editor-drawer-background`       | エディタのドロワー   | `menuOpacity`     | `--hsl-white` 100%     | `--hsl-neutral-800` 100% |
| `--inline-dropdown-menu-background`| ドロップダウン       | `menuOpacity`     | `--hsl-white` 100%     | `--hsl-neutral-900` 100% |
| `--vertical-menu-background`       | 縦メニュー           | `menuOpacity`     | `--hsl-white` 100%     | `--hsl-neutral-900` 100% |

#### 上書きしない変数

- `--page-background` / `--editor-background-color` — acrylic 時に Inkdrop が `transparent` にしており、
  倍率をかけても透明のままで調整の余地がない

メニュー系は Inkdrop が可読性のため不透明にしている。既定 100 では見た目を変えないが、
統一感を優先したい利用者のために設定は開けてある。

いずれも `light-dark()` でライト／ダーク双方の色を指定する。
スタイルシートは `layer` を指定せずに追加する。CSS のカスケードでは
レイヤーなしの宣言が `@layer` 内の宣言より優先されるため、Inkdrop 本体の `@layer theme.ui` に勝つ。

### API設計

Inkdrop のコマンドがプラグインの公開インターフェースとなる。

#### コマンド一覧

| コマンド                 | 説明                                                    |
| ------------------------ | ------------------------------------------------------- |
| `transparency:toggle`    | 適用状態を反転する                                      |
| `transparency:active`    | 設定値からスタイルシートを生成して適用する              |
| `transparency:deactive`  | スタイルシートを外し Inkdrop 既定の見た目に戻す         |

#### キーマップ

`keymaps/transparency.json` で `body` に対して定義する。

| キー               | コマンド                |
| ------------------ | ----------------------- |
| `ctrl-alt-cmd-t`   | `transparency:toggle`   |

> `cmd-t` は Inkdrop 6 で `core:choose-template` に割り当て済みのため使用しない。

#### メニュー

`menus/transparency.json` で `Plugins > Transparency` に以下を追加する。

| ラベル       | コマンド                |
| ------------ | ----------------------- |
| `Toggle`     | `transparency:toggle`   |
| `Activate`   | `transparency:active`   |
| `Deactivate` | `transparency:deactive` |

#### ツールバー

`editor-toolbar` レイアウトに `TransparencyToolbarButton` を登録する。
このレイアウトは Inkdrop 本体では空で、エディタのツールバー右端に描画される。

- `inkdrop.components.registerClass()` でコンポーネントを登録し、
  `inkdrop.layouts.addComponentToLayout()` でレイアウトに追加する
- React は Inkdrop がバンドルしており、`Module._nodeModulePaths` のパッチにより
  プラグインからも `require('react')` で解決できる。ビルド構成を持たないため JSX は使わず
  `React.createElement()` で記述する
- 見た目は本体のツールバー項目と同じ `mde-toolbar-item` / `focus-outline` クラスで揃え、
  適用中は `active` クラスを付ける
- アイコンは本体のアイコン機構に依存せずインライン SVG で持つ
- `mousedown` を抑止し、ボタン操作でエディタのフォーカスを奪わない
- エディタのツールバーは `localConfig.editor.toolbarHidden` で非表示にできる。
  その場合はボタンも出ないため、キーマップとメニューを代替手段として残している

### 処理ロジック

#### `activate()`

1. `inkdrop.commands.add(document.body, ...)` で `toggle` / `active` / `deactive` を登録する
2. ツールバーのコンポーネントを登録し、`editor-toolbar` レイアウトに追加する
3. 設定キー4つそれぞれに `inkdrop.config.onDidChange()` を登録する
4. `inkdrop.window.onFocus()` を登録する
5. `inkdrop.isMainWindow` が真の場合のみ、起動直後に適用する
   - サブウィンドウまで対象にしないための条件分岐

設定画面は `windowType: 'preferences'` の**別ウィンドウ**として開かれ、そこではプラグインは
`loadPackage` されるだけで activate されない。設定変更もそのウィンドウで発生するため、
`onDidChange` だけではメインウィンドウに届かないことがある。
`onFocus` でも設定を読み直すことで、設定画面から戻った時点で必ず反映される。
適用済みの値を `appliedScales` に保持し、変化がなければ貼り直さない。

#### `transparency:active`

既存のスタイルシートを破棄してから、設定値をもとに生成したスタイルシートを追加する。
戻り値の Disposable をモジュール変数に保持し、これが `null` かどうかで適用中の判定を兼ねる。

#### `transparency:toggle`

適用中なら解除し、そうでなければ適用する。
適用状態はスタイルシートの Disposable の有無で判定するため、独自の状態変数を持たない。

#### 適用状態の通知

ツールバーのボタンは適用状態に応じて `active` クラスを付け外しする必要がある。
`event-kit` に依存せず、モジュール内の `Set` に購読関数を保持し、
適用・解除のたびに呼び出す最小限の仕組みで実現する。
ボタン側は `useEffect` で購読・解除する。

#### `deactivate()`

ツールバーからコンポーネントを取り除いて登録を解除し、スタイルシートを dispose し、
`activate()` で登録した購読をすべて解除する。

### エラーハンドリング

本プラグインは外部 I/O を持たず、例外を明示的に捕捉する箇所はない。

| 事象                             | 発生条件                                       | 挙動・対処                                                             |
| -------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| 設定値が範囲外                   | 設定画面で 0〜200 以外を入力                   | Inkdrop の設定スキーマ（`minimum` / `maximum`）が入力段階で弾く         |
| 設定値が未設定                   | 初回起動時                                     | スキーマの既定値（主要3領域は 40、メニューは 100）が適用される          |
| 算出結果が 100% を超える         | 倍率を 100 より大きくした場合                  | `Math.min(100, ...)` で丸める                                           |
| サブウィンドウでの起動時適用     | メインウィンドウ以外でプラグインが読み込まれる | `inkdrop.isMainWindow` の判定により適用しない                           |
| acrylic が無効                   | `core.mainWindow.acrylicEnabled` が false      | 背景は薄くなるがウィンドウ自体は不透明なため背後は見えない。`inkdrop.notifications.addWarning()` で有効化と再起動を促す |
