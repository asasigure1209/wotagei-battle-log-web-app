// 管理画面の API で共通に使う、リクエストの確かめ
// テスト (node 環境) からも呼べるよう、Nitro の自動 import に頼らず明示する
import { createError, type H3Event } from 'h3'
import { isId } from '../../shared/utils/id'
import { isVideoKey } from '../../shared/utils/video-key'
import { isR2Configured, type R2Object, r2UploadConfig } from './r2'

/** 書き込みのできる R2 の値。設定されていなければ 500 にする */
export function requireR2Upload(event: H3Event) {
  const config = r2UploadConfig(useRuntimeConfig(event).r2)
  if (!isR2Configured(config)) {
    throw createError({
      status: 500,
      statusText: 'R2 Upload Is Not Configured',
      message:
        'R2 に書き込むための値 (NUXT_R2_ACCOUNT_ID・NUXT_R2_UPLOAD_ACCESS_KEY_ID・NUXT_R2_UPLOAD_SECRET_ACCESS_KEY) が設定されていません',
    })
  }
  return config
}

function badRequest(message: string) {
  return createError({ status: 400, statusText: 'Bad Request', message })
}

/** シリーズ ID・イベント ID の組。規則に合わなければ 400 */
export function requireEventIds(series: unknown, event: unknown) {
  if (!isId(series) || !isId(event)) {
    throw badRequest(
      'シリーズ ID・イベント ID は英数字と _ - だけで書いてください',
    )
  }
  return { series, event }
}

/** アップロードするキー。`<シリーズID>/<イベントID>/<相対パス>.mp4` の形でなければ 400 */
export function requireVideoKey(key: unknown) {
  if (!isVideoKey(key)) {
    throw badRequest(`動画のキーとして使えません: ${String(key)}`)
  }
  return key
}

export function requireUploadId(uploadId: unknown) {
  if (typeof uploadId !== 'string' || !uploadId) {
    throw badRequest('uploadId がありません')
  }
  return uploadId
}

/** 1 以上 max 以下の整数。そうでなければ 400 */
export function requirePositiveInt(value: unknown, name: string, max = 10000) {
  if (
    !Number.isInteger(value) ||
    (value as number) < 1 ||
    (value as number) > max
  ) {
    throw badRequest(`${name} は 1〜${max} の整数で書いてください`)
  }
  return value as number
}

/** 1 度に署名するパートの番号 (1〜10000 の整数、1000 個まで)。そうでなければ 400 */
export function requirePartNumbers(value: unknown) {
  if (!Array.isArray(value) || !value.length || value.length > 1000) {
    throw badRequest('partNumbers は 1〜1000 個の並びで書いてください')
  }
  return value.map((n) => requirePositiveInt(n, 'partNumbers'))
}

/** manifest の動画のうち、R2 にない、またはサイズが違うものを、誤りの文にして返す */
export function missingVideoProblems(
  videos: { key: string; sizeBytes: number }[],
  objects: R2Object[],
) {
  const sizes = new Map(objects.map((o) => [o.key, o.size]))
  return videos.flatMap(({ key, sizeBytes }) => {
    const size = sizes.get(key)
    if (size === undefined)
      return [`R2 にまだアップロードされていません: ${key}`]
    if (size !== sizeBytes) {
      return [
        `R2 の動画とサイズが違います (R2: ${size}, 登録: ${sizeBytes}): ${key}`,
      ]
    }
    return []
  })
}
