import { beforeEach, describe, expect, it } from 'vitest'
import { importManifest, parseManifest } from '../../server/db/manifest'
import {
  deleteAdminEvent,
  getAdminEvent,
  getAdminEventInfo,
  listAdminEvents,
} from '../../server/utils/admin-repository'
import { getEvent } from '../../server/utils/repository'
import { resetTestDb } from './test-db'

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

  it('イベントの情報だけを返す。ないイベントは null', async () => {
    expect(await getAdminEventInfo('s', 'e')).toEqual({
      series: { id: 's', name: 'シリーズ' },
      event: {
        id: 'e',
        name: 'イベント e',
        date: '2026-01-01',
        contact: '連絡先',
      },
    })
    expect(await getAdminEventInfo('s', 'x')).toBeNull()
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

  it('ないイベントは null', async () => {
    expect(await getAdminEvent('s', 'x')).toBeNull()
  })

  it('イベントを消すと、ほかのイベントは残る', async () => {
    await deleteAdminEvent('s', 'e')
    expect(await getEvent('s', 'e')).toBeNull()
    expect(await getEvent('s', 'f')).not.toBeNull()
  })
})
