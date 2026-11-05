import { describe, expect, it } from 'vitest'
import {
  invalidManifest,
  parseEventInfoBody,
  parseManifestBody,
  requireRegisteredEvent,
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
  it('requireRegisteredEvent は、未登録のイベントなら 400 にする', () => {
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
    expect(() => requireRegisteredEvent(manifest, true)).not.toThrow()
    expect(() => requireRegisteredEvent(manifest, false)).toThrow(
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
