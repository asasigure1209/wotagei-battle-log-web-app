// プレイヤーの動画をブラウザに保存させる。動画は /download/** (server/routes/download/) から
// R2 の署名付き URL に転送され、attachment として届くので、画面は遷移しない

/** 1 本ずつ続けて保存するときの間隔。続けざまに始めると、ブラウザに 2 本目以降を止められることがある */
const SEQUENCE_INTERVAL_MS = 1500

/** プレイヤー画面のパス (/<series>/<event>/players/<no>) と動画の No. から、ダウンロードの URL を作る */
export function videoDownloadPath(playerPath: string, videoNo: string) {
  return `/download${playerPath}/${videoNo}`
}

/** path の動画の保存を始める */
export function startDownload(path: string) {
  const link = document.createElement('a')
  link.href = path
  link.click()
}

/**
 * items を 1 つずつ、間を空けて download に渡す。
 * signal が中断されたら、そこでやめる
 */
export async function downloadInSequence<T>(
  items: readonly T[],
  download: (item: T) => void,
  signal: AbortSignal,
) {
  for (const [i, item] of items.entries()) {
    if (i > 0) await wait(SEQUENCE_INTERVAL_MS, signal)
    if (signal.aborted) return
    download(item)
  }
}

/** ms ミリ秒待つ。signal が中断されたら、すぐに戻る */
function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', done)
      resolve()
    }
    const timer = setTimeout(done, ms)
    signal.addEventListener('abort', done, { once: true })
  })
}
