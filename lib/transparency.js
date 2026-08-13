'use strict'

const ACRYLIC_CONFIG_KEY = 'core.mainWindow.acrylicEnabled'

// 設定スキーマは package.json の configSchema で宣言する。
// 設定画面は別ウィンドウでプラグインを load するだけで activate しないため、
// このモジュールから config をエクスポートしても設定項目が表示されない。
const SCALE_KEYS = [
  'transparency.sidebarOpacity',
  'transparency.noteListOpacity',
  'transparency.editorOpacity',
  'transparency.menuOpacity'
]

// acrylic ウィンドウにおける Inkdrop 既定の不透明度(%)と、その色。
// 設定値はこの既定に対する倍率として扱うため、100 のとき Inkdrop 既定と完全に一致する。
// ライト／ダークで値も色も異なるので、領域ごとに両方を持つ。
const SURFACES = [
  {
    variable: '--sidebar-background',
    configKey: 'transparency.sidebarOpacity',
    light: { color: '--hsl-white', alpha: 2 },
    dark: { color: '--hsl-black', alpha: 10 }
  },
  {
    variable: '--note-list-bar-background',
    configKey: 'transparency.noteListOpacity',
    light: { color: '--hsl-stone-100', alpha: 80 },
    dark: { color: '--hsl-neutral-900', alpha: 50 }
  },
  {
    variable: '--editor-background',
    configKey: 'transparency.editorOpacity',
    light: { color: '--hsl-white', alpha: 70 },
    dark: { color: '--hsl-neutral-950', alpha: 60 }
  },
  {
    variable: '--editor-drawer-background',
    configKey: 'transparency.menuOpacity',
    light: { color: '--hsl-white', alpha: 100 },
    dark: { color: '--hsl-neutral-800', alpha: 100 }
  },
  {
    variable: '--inline-dropdown-menu-background',
    configKey: 'transparency.menuOpacity',
    light: { color: '--hsl-white', alpha: 100 },
    dark: { color: '--hsl-neutral-900', alpha: 100 }
  },
  {
    variable: '--vertical-menu-background',
    configKey: 'transparency.menuOpacity',
    light: { color: '--hsl-white', alpha: 100 },
    dark: { color: '--hsl-neutral-900', alpha: 100 }
  }
]

// 不透明度は 100% を超えられないため上限で丸める
function scaledAlpha(baseAlpha, scale) {
  return Math.min(100, Math.round(((baseAlpha * scale) / 100) * 100) / 100)
}

function buildDeclaration(surface, scale) {
  const light = `hsl(var(${surface.light.color}) / ${scaledAlpha(surface.light.alpha, scale)}%)`
  const dark = `hsl(var(${surface.dark.color}) / ${scaledAlpha(surface.dark.alpha, scale)}%)`

  return `  ${surface.variable}: light-dark(${light}, ${dark});`
}

// Inkdrop 6 には不透明度そのものを操作する API が無い（setOpacity は削除済み）。
// acrylic ウィンドウの背景色が CSS カスタムプロパティで制御されていることを利用し、
// 領域ごとの不透明度を調整する。
//
// --page-background と --editor-background-color は acrylic 時に Inkdrop が
// transparent としており、倍率をかけても透明のままなので対象にしない。
function buildStyleSheet() {
  const declarations = SURFACES.map(surface =>
    buildDeclaration(surface, inkdrop.config.get(surface.configKey))
  )

  return `
:root:has(body.acrylic-window) {
${declarations.join('\n')}
}
`
}

function currentScales() {
  return SCALE_KEYS.map(key => inkdrop.config.get(key)).join(',')
}

let styleDisposable = null
let appliedScales = null
let subscriptions = []

function transparencyActive() {
  const scales = currentScales()

  transparencyDeactive()
  // レイヤーを指定しないことで、Inkdrop 本体の @layer theme.ui より優先される
  styleDisposable = inkdrop.styles.addStyleSheet(buildStyleSheet(), {
    sourcePath: 'transparency'
  })
  appliedScales = scales

  warnIfAcrylicDisabled()
}

function transparencyDeactive() {
  if (styleDisposable) {
    styleDisposable.dispose()
    styleDisposable = null
    appliedScales = null
  }
}

// 設定画面は別ウィンドウのため、変更通知がこのウィンドウに届かない場合がある。
// 焦点が戻った時点でも設定を読み直し、値が変わっていれば貼り直す。
function reapplyIfSettingChanged() {
  if (!styleDisposable) {
    return
  }
  if (currentScales() === appliedScales) {
    return
  }

  transparencyActive()
}

// acrylic が無効だとウィンドウ自体が不透明なため、背景を薄くしても背後は見えない
function warnIfAcrylicDisabled() {
  if (inkdrop.config.get(ACRYLIC_CONFIG_KEY)) {
    return
  }

  inkdrop.notifications.addWarning('Transparency requires the acrylic window', {
    detail:
      'Enable "Acrylic Window" in Preferences > General and restart Inkdrop for these settings to take effect.',
    dismissable: true
  })
}

function activate() {
  subscriptions.push(
    inkdrop.commands.add(document.body, {
      'transparency:active': () => transparencyActive(),
      'transparency:deactive': () => transparencyDeactive()
    })
  )
  SCALE_KEYS.forEach(key => {
    subscriptions.push(inkdrop.config.onDidChange(key, () => reapplyIfSettingChanged()))
  })
  subscriptions.push(inkdrop.window.onFocus(() => reapplyIfSettingChanged()))

  if (inkdrop.isMainWindow) {
    transparencyActive()
  }
}

function deactivate() {
  transparencyDeactive()
  subscriptions.forEach(subscription => subscription.dispose())
  subscriptions = []
}

module.exports = { activate, deactivate }
