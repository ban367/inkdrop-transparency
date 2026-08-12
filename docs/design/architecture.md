<!-- このファイルは docs/design-doc.md の一部です -->

# 設計概要: アーキテクチャ・データフロー

## 4. 設計概要

### アーキテクチャ図

```mermaid
graph TD
    U[ユーザー] -->|キーマップ cmd-t / alt-cmd-t| KM[keymaps/transparency.json]
    U -->|Plugins メニュー| MN[menus/transparency.json]
    U -->|設定画面で透過度を入力| CFG[(inkdrop.config)]

    KM -->|コマンド発行| CMD[inkdrop.commands]
    MN -->|コマンド発行| CMD
    CMD --> PLG[lib/transparency.js]

    CFG -->|transparency.transparencySetting| PLG
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
    Plugin->>Config: onDidChange(transparencySetting)
    alt メインウィンドウ
        Plugin->>Config: get('transparency.transparencySetting')
        Config-->>Plugin: 85
        Plugin->>Styles: addStyleSheet(不透明度85%のCSS)
        Styles-->>Plugin: Disposable
    end

    User->>Inkdrop: transparency:active
    Inkdrop->>Plugin: ハンドラ呼び出し
    Plugin->>Styles: 既存のスタイルを dispose
    Plugin->>Config: get('transparency.transparencySetting')
    Config-->>Plugin: 設定値
    Plugin->>Styles: addStyleSheet(設定値のCSS)

    User->>Inkdrop: transparency:deactive
    Inkdrop->>Plugin: ハンドラ呼び出し
    Plugin->>Styles: Disposable.dispose()
    Note over Styles: Inkdrop 既定の背景色に戻る
```

### 主要コンポーネント

| コンポーネント             | 役割                                                           | 技術                         |
| -------------------------- | -------------------------------------------------------------- | ---------------------------- |
| `lib/transparency.js`      | 設定スキーマ定義、コマンド登録、スタイルシートの適用／解除     | JavaScript (CommonJS)        |
| `keymaps/transparency.json`| キーバインドとコマンドの対応付け                               | Inkdrop keymap 定義          |
| `menus/transparency.json`  | Plugins メニューへの項目追加                                   | Inkdrop menu 定義            |
| `inkdrop.config`           | 透過度設定値の保持と変更通知（設定画面のUIも自動生成される）   | Inkdrop API                  |
| `inkdrop.styles`           | スタイルシートの追加・削除（Disposable で解除）                | Inkdrop API (StyleManager)   |
| `inkdrop.notifications`    | acrylic 無効時の警告表示                                       | Inkdrop API                  |
