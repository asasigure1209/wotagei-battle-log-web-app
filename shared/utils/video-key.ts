import { isId } from './id'

/**
 * 動画の、イベントの中での相対パス (例: 予選/M1256.mp4) として使えるか。
 * キーは `<シリーズID>/<イベントID>/<相対パス>` になる。
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

/** `<シリーズID>/<イベントID>/<相対パス>` の形の、動画のキーとして使えるか */
export function isVideoKey(key: unknown): key is string {
  if (typeof key !== 'string') return false
  const [series, event, ...rest] = key.split('/')
  return isId(series) && isId(event) && isVideoRelPath(rest.join('/'))
}
