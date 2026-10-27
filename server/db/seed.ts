// 開発用の DB に入れるデータ。8 人のトーナメントを 1 つ入れる。
// 入れる前にシリーズごと消すので、何度流しても同じ中身になる。
// 本番の DB を消さないよう、ローカル (SQLite ファイルか、wrangler dev で動かした中継 Worker) にだけ流せる
import { connectDb, d1ProxyCredentials, usesD1Proxy } from './client'
import { entries, eventSeries, events, performers, videos } from './schema'

const event = { seriesId: 'elnino', eventId: 'elnino_vol_5' }

const seriesRows = [{ id: 'elnino', name: 'エルニーニョ' }]

const eventRows = [
  {
    seriesId: 'elnino',
    id: 'elnino_vol_5',
    name: 'エルニーニョ vol.5',
    date: '2026-01-01',
    contact: '[運営の連絡先]',
  },
]

const entryRows = [
  { ...event, entryNo: 1, name: 'BLAZE' },
  { ...event, entryNo: 2, name: 'しぐれ' },
  { ...event, entryNo: 3, name: 'あおば' },
  { ...event, entryNo: 4, name: 'K-ROCK' },
  { ...event, entryNo: 5, name: 'はやて' },
  { ...event, entryNo: 6, name: 'きりん' },
  { ...event, entryNo: 7, name: 'Akatsuki' },
  { ...event, entryNo: 8, name: 'つばさ' },
]

const videoRows = [
  // 1 回戦
  {
    ...event,
    no: 1,
    fileName: 'video_01.mp4',
    storageKey: 'elnino/elnino_vol_5/video_01.mp4',
    durationSec: 192,
    sizeBytes: 742_000_000,
  },
  {
    ...event,
    no: 2,
    fileName: 'video_02.mp4',
    storageKey: 'elnino/elnino_vol_5/video_02.mp4',
    durationSec: 178,
    sizeBytes: 688_000_000,
  },
  {
    ...event,
    no: 3,
    fileName: 'video_03.mp4',
    storageKey: 'elnino/elnino_vol_5/video_03.mp4',
    durationSec: 220,
    sizeBytes: 815_000_000,
  },
  {
    ...event,
    no: 4,
    fileName: 'video_04.mp4',
    storageKey: 'elnino/elnino_vol_5/video_04.mp4',
    durationSec: 151,
    sizeBytes: 590_000_000,
  },
  // 準決勝
  {
    ...event,
    no: 5,
    fileName: 'video_05.mp4',
    storageKey: 'elnino/elnino_vol_5/video_05.mp4',
    durationSec: 235,
    sizeBytes: 863_000_000,
  },
  {
    ...event,
    no: 6,
    fileName: 'video_06.mp4',
    storageKey: 'elnino/elnino_vol_5/video_06.mp4',
    durationSec: 132,
    sizeBytes: 512_000_000,
  },
  // 決勝
  {
    ...event,
    no: 7,
    fileName: 'video_07.mp4',
    storageKey: 'elnino/elnino_vol_5/video_07.mp4',
    durationSec: 245,
    sizeBytes: 901_000_000,
  },
]

/** 動画に出ている 2 人 */
const performerRows = [
  // 1 回戦
  { ...event, videoNo: 1, entryNo: 1 },
  { ...event, videoNo: 1, entryNo: 2 },
  { ...event, videoNo: 2, entryNo: 3 },
  { ...event, videoNo: 2, entryNo: 4 },
  { ...event, videoNo: 3, entryNo: 5 },
  { ...event, videoNo: 3, entryNo: 6 },
  { ...event, videoNo: 4, entryNo: 7 },
  { ...event, videoNo: 4, entryNo: 8 },
  // 準決勝 (1・4・5・8 が勝ち上がり)
  { ...event, videoNo: 5, entryNo: 1 },
  { ...event, videoNo: 5, entryNo: 4 },
  { ...event, videoNo: 6, entryNo: 5 },
  { ...event, videoNo: 6, entryNo: 8 },
  // 決勝 (1・5 が勝ち上がり)
  { ...event, videoNo: 7, entryNo: 1 },
  { ...event, videoNo: 7, entryNo: 5 },
]

if (
  usesD1Proxy() &&
  !/^http:\/\/(localhost|127\.0\.0\.1)[:/]/.test(d1ProxyCredentials.url ?? '')
) {
  throw new Error(
    `seed はローカルの DB にだけ流せる: ${d1ProxyCredentials.url}`,
  )
}

const db = await connectDb()

// D1 は複数のリクエストにまたがるトランザクションを使えないので、batch で 1 つのトランザクションにする。
// 配下のイベント・エントリー・動画は ON DELETE CASCADE で一緒に消える
await db.batch([
  db.delete(eventSeries),
  db.insert(eventSeries).values(seriesRows),
  db.insert(events).values(eventRows),
  db.insert(entries).values(entryRows),
  db.insert(videos).values(videoRows),
  db.insert(performers).values(performerRows),
])
