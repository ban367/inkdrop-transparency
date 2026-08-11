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
    PLG -->|setOpacity| WIN[inkdrop.window]
```

### データフロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Inkdrop as Inkdrop本体
    participant Plugin as lib/transparency.js
    participant Config as inkdrop.config
    participant Window as inkdrop.window

    Inkdrop->>Plugin: activate()
    Plugin->>Inkdrop: commands.add(active / deactive)
    alt メインウィンドウ
        Plugin->>Config: get('transparency.transparencySetting')
        Config-->>Plugin: 85
        Plugin->>Window: setOpacity(0.85)
    end

    User->>Inkdrop: transparency:active
    Inkdrop->>Plugin: ハンドラ呼び出し
    Plugin->>Config: get('transparency.transparencySetting')
    Config-->>Plugin: 設定値
    Plugin->>Window: setOpacity(設定値 / 100)

    User->>Inkdrop: transparency:deactive
    Inkdrop->>Plugin: ハンドラ呼び出し
    Plugin->>Window: setOpacity(1.0)
```

### 主要コンポーネント

| コンポーネント             | 役割                                                           | 技術                         |
| -------------------------- | -------------------------------------------------------------- | ---------------------------- |
| `lib/transparency.js`      | 設定スキーマ定義、コマンド登録、透過度の適用／解除             | JavaScript (ES Modules)      |
| `keymaps/transparency.json`| キーバインドとコマンドの対応付け                               | Inkdrop keymap 定義          |
| `menus/transparency.json`  | Plugins メニューへの項目追加                                   | Inkdrop menu 定義            |
| `inkdrop.config`           | 透過度設定値の保持（プラグイン設定画面のUIも自動生成される）   | Inkdrop API                  |
| `inkdrop.window`           | ウィンドウ透過度の実適用                                       | Inkdrop API (Electron ラッパ)|
