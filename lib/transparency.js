'use strict'

const CONFIG_KEY = 'transparency.transparencySetting'
const ACRYLIC_CONFIG_KEY = 'core.mainWindow.acrylicEnabled'

// 設定スキーマは package.json の configSchema で宣言する。
// 設定画面は別ウィンドウでプラグインを load するだけで activate しないため、
// このモジュールから config をエクスポートしても設定項目が表示されない。

// Inkdrop 6 は inkdrop.window.setOpacity() を提供しない（@electron/remote も削除済み）。
// acrylic ウィンドウは transparent: true で生成されるため、
// 描画内容そのものの不透明度を下げることで setOpacity と同じ見た目を得る。
//
// body を対象とするのは、アプリ本体 (#app-container) と body 直下に差し込まれる
// オーバーレイの双方を一度に覆うため。領域ごとの背景色を個別に薄くする方式では、
// 対象外の要素が不透明のまま残り、まだらな見た目になる。
//
// acrylic が無効なウィンドウは背景が不透明なため、透過させても背後は見えず
// 単に色が薄くなるだけになる。セレクタで acrylic 時のみに限定する。
function buildStyleSheet(percentage) {
  return `
body.acrylic-window {
  opacity: ${percentage}%;
}
`
}

let styleDisposable = null
let appliedPercentage = null
let subscriptions = []

function transparencyActive() {
  const percentage = inkdrop.config.get(CONFIG_KEY)

  transparencyDeactive()
  // レイヤーを指定しないことで、Inkdrop 本体の @layer より優先される
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

// acrylic が無効だとウィンドウ自体が不透明なため、透過させても背後は見えない
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

module.exports = { activate, deactivate }
