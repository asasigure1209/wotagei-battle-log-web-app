// API ができるまで画面に出す仮のデータ。値はモック (mock-ui-html) と同じ

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

/** プレイヤーの動画。どのプレイヤーにも、先頭から動画の本数ぶんを使う */
export const mockVideos = [
  { no: '01', file: 'video_01.mp4', duration: '03:12', mb: 742 },
  { no: '02', file: 'video_02.mp4', duration: '02:58', mb: 688 },
  { no: '03', file: 'video_03.mp4', duration: '03:40', mb: 815 },
  { no: '04', file: 'video_04.mp4', duration: '02:31', mb: 590 },
  { no: '05', file: 'video_05.mp4', duration: '03:55', mb: 863 },
  { no: '06', file: 'video_06.mp4', duration: '02:12', mb: 512 },
]
