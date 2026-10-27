import { describe, expect, it } from 'vitest'
import {
  importManifest,
  ManifestError,
  parseManifest,
  readManifest,
} from '../../server/db/manifest'
import { eventSeries } from '../../server/db/schema'
import { getEvent, getPlayer, listPlayers } from '../../server/utils/repository'
import { resetTestDb } from './test-db'

/** 予選 (A が 1 人で出る) の動画 */
const qualifier = () => ({
  key: 's/e/予選/M1.mp4',
  durationSec: 61,
  sizeBytes: 1_000_000,
  performers: [1],
})

/** 本戦 (A と B のバトル) の動画 */
const battle = () => ({
  key: 's/e/本戦/M2.mp4',
  durationSec: 192,
  sizeBytes: 742_000_000,
  performers: [1, 2],
})

/** YAML を読んだ値と同じ形 (エントリー No. のキーは文字列)。C はどの動画にも出ていない */
const yaml = () => ({
  series: { id: 's', name: 'シリーズ' },
  event: { id: 'e', name: 'イベント', date: '2026-01-01', contact: '連絡先' },
  entries: { '2': 'B', '1': 'A', '3': 'C' } as Record<string, string>,
  videos: [qualifier(), battle()],
})

describe('parseManifest', () => {
  it('エントリー No. を数に直し、No. 順に並べる', () => {
    expect(parseManifest(yaml()).entries).toEqual([
      { entryNo: 1, name: 'A' },
      { entryNo: 2, name: 'B' },
      { entryNo: 3, name: 'C' },
    ])
  })

  it('人が直せるよう、見つけた誤りをまとめて返す', () => {
    const data = yaml()
    data.series.name = ''
    data.event.date = '2026-02-30'
    data.videos = [
      { ...qualifier(), performers: [] },
      { ...battle(), performers: [1, 9] },
      { ...battle(), performers: [2, 2] },
      { ...qualifier(), key: 'x/e/M3.mp4', performers: [3] },
    ]

    const error = (() => {
      try {
        parseManifest(data)
      } catch (e) {
        return e
      }
    })()
    expect(error).toBeInstanceOf(ManifestError)
    expect((error as ManifestError).problems).toEqual([
      'series.name を書いてください',
      'event.date は YYYY-MM-DD で書いてください: 2026-02-30',
      'videos[0].performers に、出ているエントリー No. を書いてください (s/e/予選/M1.mp4)',
      'videos[1].performers の 9 は entries にありません (s/e/本戦/M2.mp4)',
      'videos[2].key が重なっています: s/e/本戦/M2.mp4',
      'videos[2].performers に同じエントリー No. が重なっています (s/e/本戦/M2.mp4)',
      'videos[3].key は s/e/ で始まるはずです: x/e/M3.mp4',
    ])
  })

  it('mise manifest が書き出したままの雛形 (未記入) は通さない', () => {
    expect(() =>
      parseManifest({
        series: { id: 's', name: '' },
        event: { id: 'e', name: '', date: '', contact: '' },
        entries: null,
        videos: [
          { key: 's/e/M1.mp4', durationSec: 1, sizeBytes: 1, performers: [] },
        ],
      }),
    ).toThrow(ManifestError)
  })
})

describe('readManifest', () => {
  it('開発用のサンプル (seed.yaml) は manifest として正しい', async () => {
    const manifest = await readManifest('server/db/seed.yaml')
    expect(manifest.entries).toHaveLength(8)
    expect(manifest.videos).toHaveLength(7)
  })
})

describe('importManifest', () => {
  it('取り込んだイベントを、API と同じ形で引ける', async () => {
    const db = await resetTestDb()
    await importManifest(db, parseManifest(yaml()))

    expect(await getEvent('s', 'e')).toEqual({
      title: 'イベント',
      date: '2026-01-01',
      contact: '連絡先',
    })
    expect(await listPlayers('s', 'e')).toEqual([
      { no: '01', name: 'A', count: 2 },
      { no: '02', name: 'B', count: 1 },
      { no: '03', name: 'C', count: 0 },
    ])
    // ファイル名はキーの最後、動画の No. は videos の並び順
    expect((await getPlayer('s', 'e', '02'))?.videos).toEqual([
      { no: '01', file: 'M2.mp4', duration: '03:12', mb: 742 },
    ])
  })

  it('同じイベントは入れ直し、同じシリーズのほかのイベントには触れない', async () => {
    const db = await resetTestDb()
    const other = yaml()
    other.event.id = 'other'
    other.videos = other.videos.map((v) => ({
      ...v,
      key: v.key.replace('s/e/', 's/other/'),
    }))
    await importManifest(db, parseManifest(other))
    await importManifest(db, parseManifest(yaml()))

    const fixed = yaml()
    fixed.series.name = '新しいシリーズ名'
    fixed.entries = { '1': 'A' }
    fixed.videos = [qualifier()]
    await importManifest(db, parseManifest(fixed))

    expect(await listPlayers('s', 'e')).toEqual([
      { no: '01', name: 'A', count: 1 },
    ])
    expect(await listPlayers('s', 'other')).toHaveLength(3)
    expect(await db.select().from(eventSeries)).toEqual([
      { id: 's', name: '新しいシリーズ名' },
    ])
  })

  it('D1 の 1 つの SQL に渡せる値の上限を超える数の行も入れられる', async () => {
    const db = await resetTestDb()
    const data = yaml()
    data.entries = Object.fromEntries(
      Array.from({ length: 40 }, (_, i) => [String(i + 1), `P${i + 1}`]),
    )
    data.videos = Array.from({ length: 40 }, (_, i) => ({
      key: `s/e/M${i + 1}.mp4`,
      durationSec: 60,
      sizeBytes: 1_000_000,
      performers: [i + 1, ((i + 1) % 40) + 1],
    }))
    await importManifest(db, parseManifest(data))

    const players = await listPlayers('s', 'e')
    expect(players).toHaveLength(40)
    expect(players.every((p) => p.count === 2)).toBe(true)
  })
})
