import { beforeEach, describe, expect, it } from 'vitest'
import { resetTestDb } from '../../test/server/test-db'
import { importManifest, parseManifest } from '../db/manifest'
import { eventSeries } from '../db/schema'
import {
  deleteAdminEvent,
  getAdminEvent,
  hasAdminEvent,
  listAdminEvents,
  listPerformedEntries,
  replaceAdminEventContents,
  saveAdminEntries,
  saveAdminEventInfo,
} from './admin-repository'
import { getEvent, listPlayers } from './repository'

const manifest = (event = 'e', date = '2026-01-01') =>
  parseManifest({
    series: { id: 's', name: 'シリーズ' },
    event: { id: event, name: `イベント ${event}`, date, contact: '連絡先' },
    entries: { '1': 'A', '2': 'B' },
    videos: [
      {
        key: `s/${event}/予選/1.mp4`,
        durationSec: 61,
        sizeBytes: 10,
        performers: [1],
      },
      {
        key: `s/${event}/本戦/2.mp4`,
        durationSec: 192,
        sizeBytes: 20,
        performers: [2, 1],
      },
    ],
  })

describe('管理画面の DB の読み出し', () => {
  beforeEach(async () => {
    const db = await resetTestDb()
    await importManifest(db, manifest('e', '2026-01-01'))
    await importManifest(db, manifest('f', '2026-02-01'))
  })

  it('登録済みのイベントを新しい開催日から並べる', async () => {
    expect(await listAdminEvents()).toEqual([
      {
        seriesId: 's',
        seriesName: 'シリーズ',
        eventId: 'f',
        eventName: 'イベント f',
        date: '2026-02-01',
        contact: '連絡先',
      },
      {
        seriesId: 's',
        seriesName: 'シリーズ',
        eventId: 'e',
        eventName: 'イベント e',
        date: '2026-01-01',
        contact: '連絡先',
      },
    ])
  })

  it('イベントを manifest と同じ形で返し、そのまま取り込み直せる', async () => {
    const found = await getAdminEvent('s', 'e')
    expect(found).toEqual({
      series: { id: 's', name: 'シリーズ' },
      event: {
        id: 'e',
        name: 'イベント e',
        date: '2026-01-01',
        contact: '連絡先',
      },
      entries: [
        { entryNo: 1, name: 'A' },
        { entryNo: 2, name: 'B' },
      ],
      videos: [
        {
          key: 's/e/予選/1.mp4',
          durationSec: 61,
          sizeBytes: 10,
          performers: [1],
        },
        {
          key: 's/e/本戦/2.mp4',
          durationSec: 192,
          sizeBytes: 20,
          performers: [1, 2],
        },
      ],
    })
    const entries = Object.fromEntries(
      (found?.entries ?? []).map((e) => [String(e.entryNo), e.name]),
    )
    expect(parseManifest({ ...found, entries })).toEqual(
      expect.objectContaining({ event: found?.event }),
    )
  })

  it('hasAdminEvent は、登録済みのイベントなら true', async () => {
    expect(await hasAdminEvent('s', 'e')).toBe(true)
    expect(await hasAdminEvent('s', 'x')).toBe(false)
  })

  it('ないイベントは null', async () => {
    expect(await getAdminEvent('s', 'x')).toBeNull()
  })

  it('イベントを消すと、ほかのイベントは残る', async () => {
    await deleteAdminEvent('s', 'e')
    expect(await getEvent('s', 'e')).toBeNull()
    expect(await getEvent('s', 'f')).not.toBeNull()
  })
})

describe('イベントの情報だけの登録', () => {
  beforeEach(async () => {
    const db = await resetTestDb()
    await importManifest(db, manifest('e', '2026-01-01'))
  })

  const info = (event: string, name: string) => ({
    series: { id: 's', name: '新しいシリーズ名' },
    event: { id: event, name, date: '2026-03-01', contact: '新しい連絡先' },
  })

  it('新しいイベントを、エントリー・動画なしで登録する', async () => {
    await saveAdminEventInfo(info('g', 'イベント g'))
    expect(await getAdminEvent('s', 'g')).toEqual({
      ...info('g', 'イベント g'),
      entries: [],
      videos: [],
    })
  })

  it('登録済みのイベントの情報を直しても、エントリー・動画は残る', async () => {
    await saveAdminEventInfo(info('e', '直した名前'))
    const found = await getAdminEvent('s', 'e')
    expect(found?.series.name).toBe('新しいシリーズ名')
    expect(found?.event).toEqual(info('e', '直した名前').event)
    expect(found?.videos).toHaveLength(2)
    expect(await listPlayers('s', 'e')).toHaveLength(2)
  })
})

describe('エントリー・動画・出演者だけの登録', () => {
  it('シリーズ・イベントの情報には触れずに、エントリー・動画・出演者だけを入れ直す', async () => {
    const db = await resetTestDb()
    await importManifest(db, manifest('e'))

    const contents = manifest('e')
    contents.series.name = '画面が開いたときの古いシリーズ名'
    contents.event.name = '古い名前'
    contents.entries = [{ entryNo: 1, name: 'A' }]
    contents.videos = contents.videos.slice(0, 1)
    await replaceAdminEventContents(contents)

    expect(await getEvent('s', 'e')).toEqual({
      title: 'イベント e',
      date: '2026-01-01',
      contact: '連絡先',
    })
    expect(await db.select().from(eventSeries)).toEqual([
      { id: 's', name: 'シリーズ' },
    ])
    expect(await listPlayers('s', 'e')).toEqual([
      { no: '01', name: 'A', count: 1 },
    ])
  })

  it('イベントがなければ (消されていれば) 何も入れずに失敗する', async () => {
    const db = await resetTestDb()
    await expect(replaceAdminEventContents(manifest('e'))).rejects.toThrow()
    expect(await db.select().from(eventSeries)).toEqual([])
    expect(await listPlayers('s', 'e')).toEqual([])
  })
})

describe('エントリーだけの登録', () => {
  beforeEach(async () => {
    const db = await resetTestDb()
    await importManifest(db, manifest('e'))
    await importManifest(db, manifest('f'))
  })

  it('listPerformedEntries は、動画に出ているエントリーの No.・名前と動画のキーを返す', async () => {
    expect(await listPerformedEntries('s', 'e')).toEqual([
      { entryNo: 1, name: 'A', key: 's/e/予選/1.mp4' },
      { entryNo: 1, name: 'A', key: 's/e/本戦/2.mp4' },
      { entryNo: 2, name: 'B', key: 's/e/本戦/2.mp4' },
    ])
    expect(await listPerformedEntries('s', 'x')).toEqual([])
  })

  it('名前を直しても、出演者の紐づけは残る', async () => {
    await saveAdminEntries('s', 'e', [
      { entryNo: 1, name: 'A2' },
      { entryNo: 2, name: 'B2' },
    ])
    expect(await listPlayers('s', 'e')).toEqual([
      { no: '01', name: 'A2', count: 2 },
      { no: '02', name: 'B2', count: 1 },
    ])
  })

  it('増やした No. は足し、減らした No. は消す', async () => {
    await saveAdminEntries('s', 'e', [
      { entryNo: 1, name: 'A' },
      { entryNo: 2, name: 'B' },
      { entryNo: 3, name: 'C' },
    ])
    expect(await listPlayers('s', 'e')).toHaveLength(3)

    await saveAdminEntries('s', 'e', [
      { entryNo: 1, name: 'A' },
      { entryNo: 2, name: 'B' },
    ])
    expect(await listPlayers('s', 'e')).toHaveLength(2)
  })

  it('動画に出ている No. は、減らしても消さず、出演者も残す (API の確認のあとに出演者が付いたとき)', async () => {
    await saveAdminEntries('s', 'e', [{ entryNo: 1, name: 'A' }])
    expect(await listPlayers('s', 'e')).toEqual([
      { no: '01', name: 'A', count: 2 },
      { no: '02', name: 'B', count: 1 },
    ])
    expect(await listPerformedEntries('s', 'e')).toHaveLength(3)
  })

  it('ほかのイベントには触れない', async () => {
    await saveAdminEntries('s', 'e', [{ entryNo: 1, name: 'X' }])
    expect(await listPlayers('s', 'f')).toEqual([
      { no: '01', name: 'A', count: 2 },
      { no: '02', name: 'B', count: 1 },
    ])
  })

  it('D1 の 1 つの SQL に渡せる値の上限を超える数のエントリーも入れられる', async () => {
    const many = Array.from({ length: 60 }, (_, i) => ({
      entryNo: i + 1,
      name: `P${i + 1}`,
    }))
    await saveAdminEntries('s', 'e', many)
    expect(await listPlayers('s', 'e')).toHaveLength(60)
  })

  it('イベントがなければ失敗する', async () => {
    await expect(
      saveAdminEntries('s', 'x', [{ entryNo: 1, name: 'A' }]),
    ).rejects.toThrow()
  })
})
