# inkdrop-transparency

![Preferences](https://raw.githubusercontent.com/ban367/inkdrop-transparency/main/docs/preferences.png)

This plugin allows you to change [Inkdrop](https://www.inkdrop.app/) window transparency. You can set it in the plugin’s settings.

## Install

```sh
ipm install transparency
```

## Init

### Claude Code 設定

Anthropic 公式のスキルを利用するため、Claude Code にて以下を実行しておく。

```sh
/plugin marketplace add anthropics/skills
```

## リリースフロー

バージョンタグは GitHub Actions で自動生成されます。

1. リリース用ブランチを作成し、`package.json` / `package-lock.json` のバージョンを更新してコミットする
2. main ブランチへの PR を作成し、**タイトルを `vX.X.X` 形式**（例: `v1.2.3`）にする
3. PR をマージすると、`tag-version.yaml` ワークフローがそのコミットに同名タグを自動付与する

> タイトルが `vX.X.X` 形式でない PR をマージしてもタグは作成されません。

## Changelog

See the [GitHub releases](https://github.com/ban367/inkdrop-transparency/releases) for an overview of what changed in each update.

## 詳細ドキュメント

- [Design Doc](docs/design-doc.md) - 設計ドキュメントのエントリポイント
