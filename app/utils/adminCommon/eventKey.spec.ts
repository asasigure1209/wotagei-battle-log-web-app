import { describe, expect, it } from 'vitest'
import {
  eventKey,
  eventPrefix,
  idsValid,
  parseEventKey,
} from '~/utils/adminCommon/eventKey'

describe('イベントのキー', () => {
  it('eventKey と parseEventKey は互いに戻せる。eventPrefix はキーの前に付く部分', () => {
    const ids = { seriesId: 'elnino', eventId: 'vol_5' }
    expect(eventKey(ids)).toBe('elnino/vol_5')
    expect(parseEventKey('elnino/vol_5')).toEqual(ids)
    expect(parseEventKey('')).toEqual({ seriesId: '', eventId: '' })
    expect(eventPrefix(ids)).toBe('elnino/vol_5/')
  })

  it('idsValid は、どちらの ID も英数字と _ - だけのときだけ true', () => {
    expect(idsValid({ seriesId: '', eventId: '' })).toBe(false)
    expect(idsValid({ seriesId: 'elnino', eventId: 'vol_5' })).toBe(true)
    expect(idsValid({ seriesId: 'elnino', eventId: 'vol 5' })).toBe(false)
  })
})
