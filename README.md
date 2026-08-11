# inkdrop-transparency

![Preferences](https://raw.githubusercontent.com/ban367/inkdrop-transparency/main/docs/preferences.png)

This plugin allows you to change [Inkdrop](https://www.inkdrop.app/) window transparency. You can set it in the plugin’s settings.

## Install

```sh
ipm install transparency
```

## Init

### Claude Code setup

Run the following in Claude Code to make Anthropic's official skills available.

```sh
/plugin marketplace add anthropics/skills
```

## Release flow

Version tags are created automatically by GitHub Actions.

1. Create a release branch and bump `version` in `package.json` / `package-lock.json`
2. Open a pull request against `main` with a **title in `vX.X.X` format** (e.g. `v1.2.3`)
3. Merging the pull request runs the `tag-version.yaml` workflow, which tags that commit with the same name

> No tag is created when the merged pull request's title is not in `vX.X.X` format.

## Changelog

See the [GitHub releases](https://github.com/ban367/inkdrop-transparency/releases) for an overview of what changed in each update.

## Documentation

- [Design Doc](docs/design-doc.md) - Entry point for the design documents (written in Japanese)
