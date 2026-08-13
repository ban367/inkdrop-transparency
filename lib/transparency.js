'use strict'

const ACRYLIC_CONFIG_KEY = 'core.mainWindow.acrylicEnabled'

// エディタのツールバー右端に差し込まれるレイアウト領域（既定は空）
const TOOLBAR_LAYOUT = 'editor-toolbar'
const TOOLBAR_COMPONENT_NAME = 'TransparencyToolbarButton'

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

// ツールバーのボタンに適用状態を伝えるための購読者。
// event-kit に依存せず、必要最小限の通知だけを行う。
const stateListeners = new Set()

function isActive() {
  return styleDisposable !== null
}

function notifyStateChange() {
  stateListeners.forEach(listener => listener())
}

function transparencyActive() {
  const scales = currentScales()

  removeStyleSheet()
  // レイヤーを指定しないことで、Inkdrop 本体の @layer theme.ui より優先される
  styleDisposable = inkdrop.styles.addStyleSheet(buildStyleSheet(), {
    sourcePath: 'transparency'
  })
  appliedScales = scales

  notifyStateChange()
  warnIfAcrylicDisabled()
}

function transparencyToggle() {
  if (isActive()) {
    transparencyDeactive()
  } else {
    transparencyActive()
  }
}

function removeStyleSheet() {
  if (styleDisposable) {
    styleDisposable.dispose()
    styleDisposable = null
    appliedScales = null
  }
}

function transparencyDeactive() {
  removeStyleSheet()
  notifyStateChange()
}

// ツールバーのボタン。Inkdrop 本体のツールバー項目と同じクラスを当てて見た目を揃える。
// アイコンは本体のアイコン機構に依存せずインラインSVGで持つ。
function createToolbarButton() {
  const React = require('react')

  return function TransparencyToolbarButton() {
    const [active, setActive] = React.useState(isActive())

    React.useEffect(() => {
      const listener = () => setActive(isActive())
      stateListeners.add(listener)
      return () => stateListeners.delete(listener)
    }, [])

    return React.createElement(
      'button',
      {
        className: `mde-toolbar-item focus-outline${active ? ' active' : ''}`,
        title: active ? 'Disable extra transparency' : 'Enable extra transparency',
        // ツールバー操作でエディタのフォーカスを奪わない
        onMouseDown: event => event.preventDefault(),
        onClick: () => transparencyToggle()
      },
      React.createElement(
        'svg',
        { width: 16, height: 16, viewBox: '0 0 16 16', 'aria-hidden': true },
        React.createElement('circle', {
          cx: 8,
          cy: 8,
          r: 6.25,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.5
        }),
        React.createElement('path', { d: 'M8 1.75 A6.25 6.25 0 0 1 8 14.25 Z', fill: 'currentColor' })
      )
    )
  }
}

let ToolbarButton = null

function registerToolbarButton() {
  ToolbarButton = createToolbarButton()
  inkdrop.components.registerClass(ToolbarButton, TOOLBAR_COMPONENT_NAME)
  inkdrop.layouts.addComponentToLayout(TOOLBAR_LAYOUT, TOOLBAR_COMPONENT_NAME)
}

function unregisterToolbarButton() {
  if (!ToolbarButton) {
    return
  }

  inkdrop.layouts.removeComponentFromLayout(TOOLBAR_LAYOUT, TOOLBAR_COMPONENT_NAME)
  inkdrop.components.deleteClass(ToolbarButton, TOOLBAR_COMPONENT_NAME)
  ToolbarButton = null
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
      'transparency:deactive': () => transparencyDeactive(),
      'transparency:toggle': () => transparencyToggle()
    })
  )
  registerToolbarButton()
  SCALE_KEYS.forEach(key => {
    subscriptions.push(inkdrop.config.onDidChange(key, () => reapplyIfSettingChanged()))
  })
  subscriptions.push(inkdrop.window.onFocus(() => reapplyIfSettingChanged()))

  if (inkdrop.isMainWindow) {
    transparencyActive()
  }
}

function deactivate() {
  unregisterToolbarButton()
  removeStyleSheet()
  stateListeners.clear()
  subscriptions.forEach(subscription => subscription.dispose())
  subscriptions = []
}

module.exports = { activate, deactivate }
