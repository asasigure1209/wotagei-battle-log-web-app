import { isId } from './id'

/**
 * 動画の、イベントの中での相対パス (例: 予選/M1256.mp4) として使えるか。
 * video-uploader の mise upload と同じく、キーは `<シリーズID>/<イベントID>/<相対パス>` になる。
 * 空の階層や . / .. を含むもの、.mp4 (大文字・小文字は問わない) で終わらないものは使わない
 */
export function isVideoRelPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /\.mp4$/i.test(value) &&
    !value.includes('\\') &&
    value
      .split('/')
      .every((part) => part !== '' && part !== '.' && part !== '..')
  )
}

/** シリーズ・イベントの動画のキーとして使えるか (管理画面からアップロードするときに確かめる) */
export function isVideoKey(key: unknown, series: unknown, event: unknown) {
  if (typeof key !== 'string' || !isId(series) || !isId(event)) return false
  const prefix = `${series}/${event}/`
  return key.startsWith(prefix) && isVideoRelPath(key.slice(prefix.length))
}
