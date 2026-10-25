// DB ができるまで API が返す仮のデータ。値はモック (mock-ui-html) と同じ

export const mockEvent = {
  title: '[イベント名]',
  date: '[開催日]',
  contact: '[運営の連絡先]',
}

/** 出場プレイヤー (エントリー No. 順) と、それぞれの動画の本数 */
export const mockPlayers = (
  [
    ['BLAZE', 6],
    ['しぐれ', 6],
    ['あおば', 3],
    ['K-ROCK', 5],
    ['はやて', 6],
    ['きりん', 2],
    ['Akatsuki', 4],
    ['つばさ', 5],
    ['もち', 5],
    ['かげろう', 5],
    ['ZERO', 2],
    ['さくま', 4],
    ['ゆうひ', 4],
    ['いっさ', 4],
    ['Cyan', 3],
    ['ふぶき', 4],
    ['らいか', 3],
    ['たきび', 3],
    ['なぎ', 2],
    ['みずち', 3],
    ['ころすけ', 3],
    ['れん', 2],
  ] as const
).map(([name, count], i) => ({
  no: String(i + 1).padStart(2, '0'),
  name,
  count,
}))
