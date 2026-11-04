import { describe, expect, it } from 'vitest'
import { requireApiData } from '~/utils/apiError'

/** useFetch の結果と同じ形 */
function result<T>(data: T, status?: number) {
  return {
    data: ref(data),
    error: ref(status === undefined ? undefined : { status }),
  }
}

describe('requireApiData', () => {
  it('取得できていれば、そのデータを返す', () => {
    expect(requireApiData(result({ name: 'A' }))).toEqual({ name: 'A' })
    expect(requireApiData(result([]))).toEqual([])
  })

  it('API の 404 や、データが空のときは、ページの 404 にする', () => {
    expect(() => requireApiData(result(undefined, 404))).toThrow(
      expect.objectContaining({ status: 404, fatal: true }),
    )
    expect(() => requireApiData(result(null))).toThrow(
      expect.objectContaining({ status: 404, fatal: true }),
    )
  })

  it('それ以外の失敗は、ISR でとっておかれないよう 500 にする', () => {
    for (const status of [401, 500, 503]) {
      expect(() => requireApiData(result(undefined, status))).toThrow(
        expect.objectContaining({ status: 500, fatal: true }),
      )
    }
  })
})
