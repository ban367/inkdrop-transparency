'use babel';

export const config = {
  transparencySetting: {
    title: 'Transparency',
    description: 'Can be set with a number from 40 to 100',
    type: 'number',
    default: 85,
    minimum: 40,
    maximum: 100
  }
};

function transparencyActive() {
  const opacity =
    inkdrop.config.get('transparency-setting.transparencySetting') / 100;
  inkdrop.window.setOpacity(opacity);
}

function transparencyDeactive() {
  inkdrop.window.setOpacity(1.0);
}

export function activate() {
  this.subscription = inkdrop.commands.add(document.body, {
    'transparency-setting:active': () => transparencyActive()
  });
  this.subscription = inkdrop.commands.add(document.body, {
    'transparency-setting:deactive': () => transparencyDeactive()
  });

  if (inkdrop.isMainWindow) {
    transparencyActive();
  }
}

export function deactivate() {
  transparencyDeactive();
}
