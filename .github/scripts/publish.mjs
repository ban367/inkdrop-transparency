// Inkdropプラグインレジストリへ公開する。
//
// CLI (@inkdropapp/ipm-cli) の `ipm publish` は実行前にOSキーリングを参照し、
// 未設定だと対話的な設定フローに入るためCIでは利用できない。
// ライブラリ (@inkdropapp/ipm) は環境変数の認証情報を優先するため、ここから直接呼び出す。
import { IPM } from '@inkdropapp/ipm'

const { INKDROP_ACCESS_KEY_ID, INKDROP_SECRET_ACCESS_KEY, INKDROP_VERSION } = process.env

if (!INKDROP_ACCESS_KEY_ID || !INKDROP_SECRET_ACCESS_KEY) {
  console.error(
    'INKDROP_ACCESS_KEY_ID と INKDROP_SECRET_ACCESS_KEY が必要です。リポジトリのSecretsを確認してください。'
  )
  process.exit(1)
}

const dryRun = process.argv.includes('--dry-run')

// appVersionはレジストリの互換性判定にのみ使われ、publishでは無視される
const ipm = new IPM({ appVersion: INKDROP_VERSION })

try {
  await ipm.publish({ dryrun: dryRun })
  console.log(dryRun ? 'dry-runが完了しました。' : '公開が完了しました。')
} catch (error) {
  console.error('公開に失敗しました:', error instanceof Error ? error.message : error)
  process.exit(1)
}
