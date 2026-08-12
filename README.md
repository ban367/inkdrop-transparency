# inkdrop-transparency

![Preferences](https://raw.githubusercontent.com/ban367/inkdrop-transparency/main/docs/preferences.png)

This plugin allows you to change [Inkdrop](https://www.inkdrop.app/) window transparency. You can set it in the plugin’s settings.

## Requirements

- **Inkdrop 6.** Version 2 targets Inkdrop 6 only. On Inkdrop 4 and 5, stay on 1.2.x
- **Acrylic Window enabled** in Preferences > General. Inkdrop only makes the window itself see-through in that mode, so the plugin has nothing to show through otherwise. It is on by default on macOS; changing it needs a restart

## Install

```sh
ipm install transparency
```

## Usage

Set a value between 40 and 100 in the plugin settings — it is the background opacity in percent, so 100 is fully opaque. Transparency is applied to the main window on startup, and changing the value while it is active takes effect right away.

| Action | Keymap | Menu |
| --- | --- | --- |
| Activate | `cmd-t` | Plugins > Transparency > Activate |
| Deactivate | `alt-cmd-t` | Plugins > Transparency > Deactivate |

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
