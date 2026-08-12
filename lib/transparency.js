'use strict'

const CONFIG_KEY = 'transparency.transparencySetting'
const ACRYLIC_CONFIG_KEY = 'core.mainWindow.acrylicEnabled'

const config = {
  transparencySetting: {
    title: 'Transparency',
    description:
      'Opacity of the window background, from 40 to 100. 100 keeps the Inkdrop default and lower values make the window more see-through. Requires "Acrylic Window" to be enabled.',
    type: 'number',
    default: 85,
    minimum: 40,
    maximum: 100
  }
}

// acrylic ウィンドウにおける Inkdrop 既定の不透明度(%)。
// これらを基準に設定値で按分することで、100 のとき Inkdrop 既定と一致させる。
// 素の既定より不透明にしてしまうと「設定を上げるほど透けない」挙動になるため、
// 一律の値で上書きしてはならない。
const DEFAULT_ALPHA = {
  sidebarLight: 2,
  sidebarDark: 10,
  noteListLight: 80,
  noteListDark: 50,
  editorLight: 70,
  editorDark: 60
}

// Inkdrop 6 は inkdrop.window.setOpacity() を提供しない（@electron/remote も削除済み）。
// acrylic ウィンドウは transparent: true で生成されるため、
// Inkdrop が定義する背景色変数の不透明度を下げることで透過を実現する。
//
// --page-background は Inkdrop が acrylic 時に transparent としているため上書きしない。
// メニュー・ドロップダウン類も可読性のため既定（不透明）のままとする。
function buildStyleSheet(percentage) {
  const ratio = percentage / 100
  const alpha = key => Math.round(DEFAULT_ALPHA[key] * ratio * 100) / 100

  return `
:root:has(body.acrylic-window) {
  --sidebar-background: light-dark(
    hsl(var(--hsl-white) / ${alpha('sidebarLight')}%),
    hsl(var(--hsl-black) / ${alpha('sidebarDark')}%)
  );
  --note-list-bar-background: light-dark(
    hsl(var(--hsl-stone-100) / ${alpha('noteListLight')}%),
    hsl(var(--hsl-neutral-900) / ${alpha('noteListDark')}%)
  );
  --editor-background: light-dark(
    hsl(var(--hsl-white) / ${alpha('editorLight')}%),
    hsl(var(--hsl-neutral-950) / ${alpha('editorDark')}%)
  );
}
`
}

let styleDisposable = null
let appliedPercentage = null
let subscriptions = []

function transparencyActive() {
  const percentage = inkdrop.config.get(CONFIG_KEY)

  transparencyDeactive()
  // レイヤーを指定しないことで、Inkdrop 本体の @layer theme.ui より優先される
  styleDisposable = inkdrop.styles.addStyleSheet(buildStyleSheet(percentage), {
    sourcePath: 'transparency'
  })
  appliedPercentage = percentage

  warnIfAcrylicDisabled()
}

function transparencyDeactive() {
  if (styleDisposable) {
    styleDisposable.dispose()
    styleDisposable = null
    appliedPercentage = null
  }
}

// 設定画面は別ウィンドウのため、変更通知がこのウィンドウに届かない場合がある。
// 焦点が戻った時点でも設定を読み直し、値が変わっていれば貼り直す。
function reapplyIfSettingChanged() {
  if (!styleDisposable) {
    return
  }
  if (inkdrop.config.get(CONFIG_KEY) === appliedPercentage) {
    return
  }

  transparencyActive()
}

// acrylic が無効だとウィンドウ自体が不透明なため、背景色を薄くしても背後は見えない
function warnIfAcrylicDisabled() {
  if (inkdrop.config.get(ACRYLIC_CONFIG_KEY)) {
    return
  }

  inkdrop.notifications.addWarning('Transparency requires the acrylic window', {
    detail:
      'Enable "Acrylic Window" in Preferences > General and restart Inkdrop to see through the window.',
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
  subscriptions.push(inkdrop.config.onDidChange(CONFIG_KEY, () => reapplyIfSettingChanged()))
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

module.exports = { config, activate, deactivate }
