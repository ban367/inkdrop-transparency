# inkdrop-transparency

![Preferences](https://raw.githubusercontent.com/ban367/inkdrop-transparency/main/docs/preferences.png)

This plugin lets you tune how see-through [Inkdrop](https://www.inkdrop.app/)'s acrylic window is, area by area — the sidebar, the note list, the editor and the menus each get their own setting.

## Requirements

- **Inkdrop 6.** Version 2 targets Inkdrop 6 only; on Inkdrop 4 and 5 the registry keeps serving 1.2.x
- **Acrylic Window enabled** in Preferences > General. Inkdrop only makes the window itself see-through in that mode, so the settings have nothing to show through otherwise. It is on by default on macOS and changing it needs a restart

## Install

```sh
ipm install transparency
```

## Usage

Each setting is a **percentage of the opacity Inkdrop itself uses** for that area, so **100 leaves the window exactly as Inkdrop draws it**. Lower it to see more of what is behind, raise it for a more solid background.

| Setting | Area | Inkdrop default (light / dark) |
| --- | --- | --- |
| Sidebar opacity | Sidebar | 2% / 10% |
| Note list opacity | Note list | 80% / 50% |
| Editor opacity | Editor area | 70% / 60% |
| Menu and dropdown opacity | Menus, dropdowns, editor drawer | opaque |

Because the values are relative, Inkdrop's own light and dark tuning is preserved: one number adjusts both themes sensibly. Opacity is capped at 100%, so values above that simply make an area fully solid.

Settings apply to the main window on startup, and a changed value is picked up when you return to the main window.

| Action | Keymap | Menu |
| --- | --- | --- |
| Activate | `ctrl-alt-cmd-t` | Plugins > Transparency > Activate |
| Deactivate | `alt-cmd-t` | Plugins > Transparency > Deactivate |

> What shows through is the frosted material macOS draws behind an acrylic window, not a clear view of whatever is behind it. Inkdrop 6 exposes no way for a plugin to change that. Earlier versions of this plugin faded the whole window through `setOpacity`, which Inkdrop 6 removed.

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
