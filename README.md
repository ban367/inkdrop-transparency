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

Releases are driven by version tags, which only the repository owner can create.

1. Open a pull request that bumps `version` in `package.json` / `package-lock.json`, and merge it into `main`
2. Tag the merge commit and push the tag

   ```sh
   git tag -a v1.2.5 -m "v1.2.5"
   git push origin v1.2.5
   ```

3. The `release.yaml` workflow then checks the tag against `package.json`, publishes the plugin to the Inkdrop registry, and creates a GitHub release

> The workflow fails when the tag name does not match the `version` in `package.json`, so no half-released version reaches the registry.

## Changelog

See the [GitHub releases](https://github.com/ban367/inkdrop-transparency/releases) for an overview of what changed in each update.

## Documentation

- [Design Doc](docs/design-doc.md) - Entry point for the design documents (written in Japanese)
