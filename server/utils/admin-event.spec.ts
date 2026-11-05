import { describe, expect, it } from 'vitest'
import {
  invalidManifest,
  parseEventInfoBody,
  parseManifestBody,
  withRegisteredEvent,
} from './admin-event'

const body = () => ({
  seriesName: 'シリーズ',
  name: 'イベント',
  date: '2026-01-01',
  contact: '連絡先',
})

describe('管理画面のイベントの登録のリクエスト', () => {
  it('invalidManifest は、誤りの一覧を data.problems に持つ 400', () => {
    expect(invalidManifest(['a', 'b'])).toEqual(
      expect.objectContaining({
        statusCode: 400,
        message: 'a\nb',
        data: { problems: ['a', 'b'] },
      }),
    )
  })

  it('parseManifestBody は、manifest の誤りを 400 にする', () => {
    expect(() => parseManifestBody({})).toThrow(
      expect.objectContaining({ statusCode: 400 }),
    )
  })

  it('parseEventInfoBody は、パスの ID と本文から、シリーズとイベントの情報を作る', () => {
    expect(parseEventInfoBody('s', 'e', body())).toEqual({
      series: { id: 's', name: 'シリーズ' },
      event: {
        id: 'e',
        name: 'イベント',
        date: '2026-01-01',
        contact: '連絡先',
      },
    })
  })

  it('parseEventInfoBody は、誤りがあれば manifest の登録と同じ形の 400 にする', () => {
    expect(() => parseEventInfoBody('s', 'e', { ...body(), name: '' })).toThrow(
      expect.objectContaining({
        statusCode: 400,
        data: { problems: ['event.name を書いてください'] },
      }),
    )
  })
  it('withRegisteredEvent は、manifest のシリーズ・イベントの情報を、登録済みのものに差し替える', () => {
    const manifest = {
      series: { id: 's', name: '古いシリーズ名' },
      event: { id: 'e', name: '古い名前', date: '2026-01-01', contact: '古い' },
      entries: [{ entryNo: 1, name: 'A' }],
      videos: [],
    }
    const registered = {
      series: { id: 's', name: 'シリーズ' },
      event: {
        id: 'e',
        name: 'イベント',
        date: '2026-02-01',
        contact: '連絡先',
      },
    }
    expect(withRegisteredEvent(manifest, registered)).toEqual({
      ...manifest,
      ...registered,
    })
  })

  it('withRegisteredEvent は、未登録のイベントなら 400 にする', () => {
    const manifest = {
      series: { id: 's', name: 'シリーズ' },
      event: {
        id: 'e',
        name: 'イベント',
        date: '2026-01-01',
        contact: '連絡先',
      },
      entries: [],
      videos: [],
    }
    expect(() => withRegisteredEvent(manifest, null)).toThrow(
      expect.objectContaining({
        statusCode: 400,
        data: {
          problems: [
            '登録されていないイベントです (s/e)。先にイベントの登録の画面で登録してください',
          ],
        },
      }),
    )
  })
})
