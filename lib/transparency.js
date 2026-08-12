'use strict'

const CONFIG_KEY = 'transparency.transparencySetting'
const ACRYLIC_CONFIG_KEY = 'core.mainWindow.acrylicEnabled'

const config = {
  transparencySetting: {
    title: 'Transparency',
    description: 'Can be set with a number from 40 to 100',
    type: 'number',
    default: 85,
    minimum: 40,
    maximum: 100
  }
}

// Inkdrop 6 は inkdrop.window.setOpacity() を提供しない（@electron/remote も削除済み）。
// acrylic ウィンドウは transparent: true で生成されるため、
// Inkdrop が定義する背景色変数の不透明度を上書きすることで透過を実現する。
function buildStyleSheet(percentage) {
  return `
:root:has(body.acrylic-window) {
  --page-background: light-dark(
    hsl(var(--hsl-white) / ${percentage}%),
    hsl(var(--hsl-neutral-950) / ${percentage}%)
  );
  --sidebar-background: light-dark(
    hsl(var(--hsl-stone-100) / ${percentage}%),
    hsl(var(--hsl-neutral-900) / ${percentage}%)
  );
  --note-list-bar-background: light-dark(
    hsl(var(--hsl-stone-100) / ${percentage}%),
    hsl(var(--hsl-neutral-900) / ${percentage}%)
  );
  --editor-background: light-dark(
    hsl(var(--hsl-white) / ${percentage}%),
    hsl(var(--hsl-neutral-950) / ${percentage}%)
  );
}
`
}

let styleDisposable = null
let subscriptions = []

function transparencyActive() {
  transparencyDeactive()

  const percentage = inkdrop.config.get(CONFIG_KEY)
  // レイヤーを指定しないことで、Inkdrop 本体の @layer theme.ui より優先される
  styleDisposable = inkdrop.styles.addStyleSheet(buildStyleSheet(percentage), {
    sourcePath: 'transparency'
  })

  warnIfAcrylicDisabled()
}

function transparencyDeactive() {
  if (styleDisposable) {
    styleDisposable.dispose()
    styleDisposable = null
  }
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
  // 透過中に設定が変わったら即座に反映する
  subscriptions.push(
    inkdrop.config.onDidChange(CONFIG_KEY, () => {
      if (styleDisposable) {
        transparencyActive()
      }
    })
  )

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
