<!-- このファイルは docs/design-doc.md の一部です -->

# 詳細設計: データモデル・API仕様・エラーハンドリング

## 5. 詳細設計

### データモデル

プラグインが保持する永続データは Inkdrop の設定値 1 つのみで、内部状態は持たない。

```javascript
// lib/transparency.js
export const config = {
  transparencySetting: {
    title: 'Transparency',
    description: 'Can be set with a number from 40 to 100',
    type: 'number',
    default: 85,
    minimum: 40,
    maximum: 100
  }
};
```

| 設定キー                            | 型     | 既定値 | 範囲   | 説明                                     |
| ----------------------------------- | ------ | ------ | ------ | ---------------------------------------- |
| `transparency.transparencySetting`  | number | 85     | 40〜100 | ウィンドウの不透明度（%）。100 で不透明 |

> 下限を 40 としているのは、透過しすぎてウィンドウの視認・操作が困難になることを防ぐため。

### API設計

Inkdrop のコマンドがプラグインの公開インターフェースとなる。

#### コマンド一覧

| コマンド                 | 説明                                     | 適用される不透明度                  |
| ------------------------ | ---------------------------------------- | ----------------------------------- |
| `transparency:active`    | 設定値の透過度をウィンドウに適用する     | `transparencySetting / 100`         |
| `transparency:deactive`  | 透過を解除し不透明に戻す                 | `1.0`                               |

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

### 処理ロジック

#### `activate()`

1. `inkdrop.commands.add(document.body, ...)` で `transparency:active` / `transparency:deactive` を登録する
2. `inkdrop.isMainWindow` が真の場合のみ、起動直後に透過を適用する
   - サブウィンドウ（プレビュー等）まで透過させないための条件分岐

#### `deactivate()`

プラグイン無効化時に `setOpacity(1.0)` を呼び、ウィンドウを不透明に戻す。

#### 透過度の算出

設定値はパーセント（40〜100）で保持し、`inkdrop.window.setOpacity()` が受け取る 0〜1 の値へ
100 で除算して変換する。

### エラーハンドリング

本プラグインは外部 I/O を持たず、例外を明示的に捕捉する箇所はない。

| 事象                             | 発生条件                                       | 挙動・対処                                                             |
| -------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| 設定値が範囲外                   | 設定画面で 40〜100 以外を入力                  | Inkdrop の設定スキーマ（`minimum` / `maximum`）が入力段階で弾く         |
| 設定値が未設定                   | 初回起動時                                     | スキーマの `default: 85` が適用される                                   |
| サブウィンドウでの起動時自動適用 | メインウィンドウ以外でプラグインが読み込まれる | `inkdrop.isMainWindow` の判定により適用しない                           |
