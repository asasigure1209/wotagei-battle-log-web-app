// 動画の容量 (MB) を合計したり、画面に出す文字にしたりする

/** list の容量 (MB) を合計する */
export function sumMb(list: readonly { mb: number }[]) {
  return list.reduce((sum, v) => sum + v.mb, 0)
}

/** 容量 (MB) を画面に出す文字にする。1000 MB 以上は GB で出す */
export function formatSize(mb: number) {
  return mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb} MB`
}
