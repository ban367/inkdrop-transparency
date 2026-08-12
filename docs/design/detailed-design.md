<!-- このファイルは docs/design-doc.md の一部です -->

# 詳細設計: データモデル・API仕様・エラーハンドリング

## 5. 詳細設計

### データモデル

プラグインが保持する永続データは Inkdrop の設定値 1 つのみで、内部状態は持たない。

```json
// package.json
"configSchema": {
  "transparencySetting": {
    "title": "Transparency",
    "description": "Window opacity in percent, from 40 to 100. ...",
    "type": "number",
    "default": 85,
    "minimum": 40,
    "maximum": 100
  }
}
```

| 設定キー                            | 型     | 既定値 | 範囲   | 説明                                     |
| ----------------------------------- | ------ | ------ | ------ | ---------------------------------------- |
| `transparency.transparencySetting`  | number | 85     | 40〜100 | ウィンドウの不透明度（%）。100 で不透明 |

> 下限を 40 としているのは、透過しすぎてウィンドウの視認・操作が困難になることを防ぐため。

**スキーマは `package.json` の `configSchema` で宣言しなければならない。**
メインモジュールから `config` をエクスポートする方式もあるが、Inkdrop 6 では登録経路が異なる。

| 宣言方法                        | 登録するメソッド                      | 呼ばれるタイミング |
| ------------------------------- | ------------------------------------- | ------------------ |
| `package.json` の `configSchema`| `registerConfigSchemaFromMetadata()`  | `preload()` / `load()` |
| メインモジュールの `config`     | `registerConfigSchemaFromMainModule()`| `activateNow()`    |

設定画面は別ウィンドウでプラグインを `loadPackage` するだけで activate しないため、
後者では設定項目が設定画面に表示されない。

### API設計

Inkdrop のコマンドがプラグインの公開インターフェースとなる。

#### コマンド一覧

| コマンド                 | 説明                                             | 背景の不透明度              |
| ------------------------ | ------------------------------------------------ | --------------------------- |
| `transparency:active`    | 設定値をもとにスタイルシートを適用する           | `transparencySetting` %     |
| `transparency:deactive`  | スタイルシートを外し Inkdrop 既定の背景に戻す    | Inkdrop 既定値              |

#### キーマップ

`keymaps/transparency.json` で `body` に対して定義する。

| キー         | コマンド                |
| ------------ | ----------------------- |
| `cmd-t`      | `transparency:active`   |
| `alt-cmd-t`  | `transparency:deactive` |

#### メニュー

`menus/transparency.json` で `Plugins > Transparency` に以下を追加する。

| ラベル       | コマンド                |
| ------------ | ----------------------- |
| `Activate`   | `transparency:active`   |
| `Deactivate` | `transparency:deactive` |

### 透過の実現方式

Inkdrop 6 では `inkdrop.window.setOpacity()` が存在しない（`@electron/remote` も削除済み）ため、
ウィンドウの不透明度を直接操作する手段がない。

代わりに、Inkdrop 6 が持つ acrylic ウィンドウを利用する。
`core.mainWindow.acrylicEnabled` が有効な場合、ウィンドウは Electron の
`transparent: true` / `vibrancy: 'under-window'` で生成され、`body` に `acrylic-window` クラスが付く。
このとき背景色は CSS カスタムプロパティで制御されているため、
`inkdrop.styles.addStyleSheet()` でこれらを上書きすることで透過度を変更する。

#### 適用対象

`body.acrylic-window` に `opacity` を指定する。設定値をそのままパーセントとして用いるため、
`setOpacity()` と同じ意味論（100 で不透明、下げるほど透過）を保つ。

`body` を対象とするのは、アプリ本体 (`#app-container`) と `body` 直下に差し込まれる
オーバーレイの双方を一度に覆えるため。

セレクタを `.acrylic-window` に限定しているのは、acrylic が無効なウィンドウでは背景が
不透明で背後が見えず、透過させても色が薄くなるだけになるため。

スタイルシートは `layer` を指定せずに追加する。CSS のカスケードでは
レイヤーなしの宣言が `@layer` 内の宣言より優先されるため、Inkdrop 本体の `@layer` に勝つ。

#### 背景色変数を個別に薄くする方式を採らない理由

`--sidebar-background` などの背景色変数を領域ごとに薄くする実装も試したが、
実用に耐える見た目にならなかった。

- Inkdrop 既定の不透明度が領域ごとに大きく異なり（サイドバー 2%、ノート一覧 80%）、
  一律の値で上書きすると素の acrylic より不透明になって挙動が逆転する
- 既定値を按分する方式に直しても、変数で制御されていない要素が不透明のまま残り、
  まだらな見た目になる
- 透過するのが背景のみのため、`setOpacity()` の見た目とは印象が大きく異なる

#### 見え方の制約

macOS の acrylic ウィンドウは `vibrancy: 'under-window'` で描画される。これは背後を
ぼかした半透明マテリアルであり、背後のウィンドウが素通しで見えるわけではない。
この点は Inkdrop 6 の提供する仕組みの範囲では変更できない。

### 処理ロジック

#### `activate()`

1. `inkdrop.commands.add(document.body, ...)` で `transparency:active` / `transparency:deactive` を登録する
2. `inkdrop.config.onDidChange()` と `inkdrop.window.onFocus()` を登録し、
   透過中に設定が変わっていたら貼り直す
3. `inkdrop.isMainWindow` が真の場合のみ、起動直後に透過を適用する
   - サブウィンドウ（プレビュー等）まで透過させないための条件分岐

設定画面は `windowType: 'preferences'` の**別ウィンドウ**として開かれ、そこではプラグインは
`loadPackage` されるだけで `activate` されない。設定変更もそのウィンドウで発生するため、
`onDidChange` だけではメインウィンドウに届かないことがある。
`onFocus` でも設定を読み直すことで、設定画面から戻った時点で必ず反映されるようにしている。
適用済みの値を `appliedPercentage` に保持し、変化がなければ貼り直さない。

#### `transparency:active`

既存のスタイルシートを破棄してから、設定値をもとに生成したスタイルシートを追加する。
戻り値の Disposable をモジュール変数に保持し、これが `null` かどうかで透過中の判定を兼ねる。

#### `deactivate()`

スタイルシートを dispose し、`activate()` で登録した購読をすべて解除する。
スタイルシートを外すと Inkdrop 既定の背景色に戻る。

### エラーハンドリング

本プラグインは外部 I/O を持たず、例外を明示的に捕捉する箇所はない。

| 事象                             | 発生条件                                       | 挙動・対処                                                             |
| -------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| 設定値が範囲外                   | 設定画面で 40〜100 以外を入力                  | Inkdrop の設定スキーマ（`minimum` / `maximum`）が入力段階で弾く         |
| 設定値が未設定                   | 初回起動時                                     | スキーマの `default: 85` が適用される                                   |
| サブウィンドウでの起動時自動適用 | メインウィンドウ以外でプラグインが読み込まれる | `inkdrop.isMainWindow` の判定により適用しない                           |
| acrylic が無効                   | `core.mainWindow.acrylicEnabled` が false      | 背景色は薄くなるがウィンドウ自体は不透明なため背後は見えない。`inkdrop.notifications.addWarning()` で有効化と再起動を促す |
