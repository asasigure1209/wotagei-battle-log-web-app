import { beforeAll, describe, expect, it } from 'vitest'
import {
  entries,
  eventSeries,
  events,
  performers,
  videos,
} from '../../server/db/schema'
import {
  getEvent,
  getPlayer,
  getPlayerVideo,
  listPlayers,
} from '../../server/utils/repository'
import { resetTestDb } from './test-db'

const event = { seriesId: 's', eventId: 'e' }

// テスト用の DB を作り直し、A と B が対戦した動画 1 と、A だけの動画 2 を入れる。C はどの動画にも出ていない
beforeAll(async () => {
  const db = await resetTestDb()
  await db.insert(eventSeries).values({ id: 's', name: 'シリーズ' })
  await db.insert(events).values({
    seriesId: 's',
    id: 'e',
    name: 'イベント',
    date: '2026-01-01',
    contact: '連絡先',
  })
  await db.insert(entries).values([
    { ...event, entryNo: 1, name: 'A' },
    { ...event, entryNo: 2, name: 'B' },
    { ...event, entryNo: 3, name: 'C' },
  ])
  await db.insert(videos).values([
    {
      ...event,
      no: 1,
      fileName: 'video_01.mp4',
      storageKey: 's/e/video_01.mp4',
      durationSec: 192,
      sizeBytes: 742_000_000,
    },
    {
      ...event,
      no: 2,
      fileName: 'video_02.mp4',
      storageKey: 's/e/video_02.mp4',
      durationSec: 61,
      sizeBytes: 1_499_999,
    },
  ])
  await db.insert(performers).values([
    { ...event, videoNo: 1, entryNo: 1 },
    { ...event, videoNo: 1, entryNo: 2 },
    { ...event, videoNo: 2, entryNo: 1 },
  ])
})

describe('getEvent', () => {
  it('イベントの名前・開催日・連絡先を返す', async () => {
    expect(await getEvent('s', 'e')).toEqual({
      title: 'イベント',
      date: '2026-01-01',
      contact: '連絡先',
    })
  })

  it('ないイベントは null', async () => {
    expect(await getEvent('s', 'x')).toBeNull()
  })
})

describe('listPlayers', () => {
  it('エントリー No. 順に、2 桁の No. と動画の本数を返す', async () => {
    expect(await listPlayers('s', 'e')).toEqual([
      { no: '01', name: 'A', count: 2 },
      { no: '02', name: 'B', count: 1 },
      { no: '03', name: 'C', count: 0 },
    ])
  })

  it('ないイベントは空', async () => {
    expect(await listPlayers('s', 'x')).toEqual([])
  })
})

describe('getPlayer', () => {
  it('動画に、そのプレイヤーの何本目かの No. と、表示用の長さ・サイズを付ける', async () => {
    expect(await getPlayer('s', 'e', '01')).toEqual({
      no: '01',
      name: 'A',
      count: 2,
      videos: [
        { no: '01', file: 'video_01.mp4', duration: '03:12', mb: 742 },
        { no: '02', file: 'video_02.mp4', duration: '01:01', mb: 1 },
      ],
    })
  })

  it('対戦した動画は、相手のプレイヤーにも出る', async () => {
    expect((await getPlayer('s', 'e', '02'))?.videos).toEqual([
      { no: '01', file: 'video_01.mp4', duration: '03:12', mb: 742 },
    ])
  })

  it('いないプレイヤーや、2 桁に整えていない No. は null', async () => {
    for (const no of ['99', '2', '002', 'x']) {
      expect(await getPlayer('s', 'e', no)).toBeNull()
    }
  })
})

describe('getPlayerVideo', () => {
  it('プレイヤーの何本目かの動画の置き場所とファイル名を返す', async () => {
    expect(await getPlayerVideo('s', 'e', '01', '02')).toMatchObject({
      storageKey: 's/e/video_02.mp4',
      fileName: 'video_02.mp4',
    })
    // B の 1 本目は、A と対戦した動画 1
    expect(await getPlayerVideo('s', 'e', '02', '01')).toMatchObject({
      storageKey: 's/e/video_01.mp4',
      fileName: 'video_01.mp4',
    })
  })

  it('いないプレイヤーや動画、2 桁に整えていない No. は null', async () => {
    for (const [no, videoNo] of [
      ['01', '03'],
      ['02', '02'],
      ['03', '01'],
      ['99', '01'],
      ['01', '2'],
      ['1', '01'],
      ['01', '00'],
    ] as const) {
      expect(await getPlayerVideo('s', 'e', no, videoNo)).toBeNull()
    }
  })
})
