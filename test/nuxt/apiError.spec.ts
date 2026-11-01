import { describe, expect, it } from 'vitest'
import { throwIfApiFailed } from '~/utils/apiError'

describe('throwIfApiFailed', () => {
  it('取得に失敗していなければ、何もしない', () => {
    expect(() => throwIfApiFailed(null)).not.toThrow()
    expect(() => throwIfApiFailed(undefined)).not.toThrow()
  })

  it('API の 404 は、ページの 404 にする', () => {
    expect(() => throwIfApiFailed({ status: 404 })).toThrow(
      expect.objectContaining({ status: 404, fatal: true }),
    )
  })

  it('それ以外の失敗は、ISR でとっておかれないよう 500 にする', () => {
    for (const status of [401, 500, 503, undefined]) {
      expect(() => throwIfApiFailed({ status })).toThrow(
        expect.objectContaining({ status: 500, fatal: true }),
      )
    }
  })
})
