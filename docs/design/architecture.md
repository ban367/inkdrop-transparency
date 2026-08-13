<!-- このファイルは docs/design-doc.md の一部です -->

# 設計概要: アーキテクチャ・データフロー

## 4. 設計概要

### アーキテクチャ図

```mermaid
graph TD
    U[ユーザー] -->|キーマップ| KM[keymaps/transparency.json]
    U -->|Plugins メニュー| MN[menus/transparency.json]
    U -->|設定画面で領域ごとの倍率を入力| CFG[(inkdrop.config)]

    KM -->|コマンド発行| CMD[inkdrop.commands]
    MN -->|コマンド発行| CMD
    CMD --> PLG[lib/transparency.js]

    CFG -->|4つの倍率設定| PLG
    SCH[package.json の configSchema] -->|load時にスキーマ登録| CFG
    PLG -->|addStyleSheet| STY[inkdrop.styles]
    STY -->|背景色変数の上書き| WIN[acrylic ウィンドウ]
    CORE[(core.mainWindow.acrylicEnabled)] -->|透過可能かの前提| WIN
```

### データフロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Inkdrop as Inkdrop本体
    participant Plugin as lib/transparency.js
    participant Config as inkdrop.config
    participant Styles as inkdrop.styles

    Inkdrop->>Plugin: activate()
    Plugin->>Inkdrop: commands.add(active / deactive)
    Plugin->>Config: onDidChange(設定キー4つ)
    Plugin->>Inkdrop: window.onFocus(再適用の判定)
    alt メインウィンドウ
        Plugin->>Config: get(倍率 x4)
        Config-->>Plugin: 100, 100, 100, 100
        Plugin->>Styles: addStyleSheet(領域ごとの不透明度)
        Styles-->>Plugin: Disposable
    end

    User->>Inkdrop: 設定画面(別ウィンドウ)で倍率を変更
    User->>Inkdrop: メインウィンドウに戻る
    Inkdrop->>Plugin: onFocus
    Plugin->>Config: get(倍率 x4)
    alt 適用済みの値と異なる
        Plugin->>Styles: 既存を dispose して貼り直す
    end

    User->>Inkdrop: transparency:deactive
    Inkdrop->>Plugin: ハンドラ呼び出し
    Plugin->>Styles: Disposable.dispose()
    Note over Styles: Inkdrop 既定の背景に戻る
```

### 主要コンポーネント

| コンポーネント              | 役割                                                           | 技術                       |
| --------------------------- | -------------------------------------------------------------- | -------------------------- |
| `lib/transparency.js`       | コマンド登録、スタイルシートの生成・適用・解除                 | JavaScript (CommonJS)      |
| `package.json` の `configSchema` | 設定スキーマの宣言（load 時に登録される）                 | Inkdrop パッケージ定義     |
| `keymaps/transparency.json` | キーバインドとコマンドの対応付け                               | Inkdrop keymap 定義        |
| `menus/transparency.json`   | Plugins メニューへの項目追加                                   | Inkdrop menu 定義          |
| `inkdrop.config`            | 倍率設定の保持と変更通知                                       | Inkdrop API                |
| `inkdrop.styles`            | スタイルシートの追加・削除（Disposable で解除）                | Inkdrop API (StyleManager) |
| `inkdrop.notifications`     | acrylic 無効時の警告表示                                       | Inkdrop API                |
