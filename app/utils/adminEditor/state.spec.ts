import { describe, expect, it, vi } from 'vitest'
import {
  createEditorState,
  eventKey,
  eventPrefix,
  idsValid,
  parseEventKey,
  run,
} from '~/utils/adminEditor/state'

describe('イベントの ID の組', () => {
  it('eventKey と parseEventKey は互いに戻せる。eventPrefix はキーの前に付く部分', () => {
    const ids = { seriesId: 'elnino', eventId: 'vol_5' }
    expect(eventKey(ids)).toBe('elnino/vol_5')
    expect(parseEventKey('elnino/vol_5')).toEqual(ids)
    expect(parseEventKey('')).toEqual({ seriesId: '', eventId: '' })
    expect(eventPrefix(ids)).toBe('elnino/vol_5/')
  })

  it('idsValid は、どちらの ID も英数字と _ - だけのときだけ true', () => {
    const state = createEditorState(() => {})
    expect(idsValid(state)).toBe(false)
    Object.assign(state.form, { seriesId: 'elnino', eventId: 'vol_5' })
    expect(idsValid(state)).toBe(true)
    state.form.eventId = 'vol 5'
    expect(idsValid(state)).toBe(false)
  })
})

describe('run', () => {
  it('動かしている間だけ busy にし、うまくいけば true を返す', async () => {
    const state = createEditorState(() => {})
    let busyInside = false
    const ok = await run(state, async () => {
      busyInside = state.busy
    })
    expect(ok).toBe(true)
    expect(busyInside).toBe(true)
    expect(state.busy).toBe(false)
    expect(state.messages).toBeNull()
  })

  it('失敗したらエラーを画面に出して false を返す。401 ならログインの画面に戻す', async () => {
    const onUnauthorized = vi.fn()
    const state = createEditorState(onUnauthorized)
    const fail = (statusCode: number) =>
      run(state, async () => {
        throw Object.assign(new Error('だめ'), { statusCode })
      })

    expect(await fail(500)).toBe(false)
    expect(state.messages).toEqual({ kind: 'error', lines: ['だめ'] })
    expect(onUnauthorized).not.toHaveBeenCalled()

    await fail(401)
    expect(onUnauthorized).toHaveBeenCalledOnce()
    expect(state.busy).toBe(false)
  })
})
