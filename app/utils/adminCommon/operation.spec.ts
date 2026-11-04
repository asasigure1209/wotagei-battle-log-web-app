import { describe, expect, it, vi } from 'vitest'
import {
  info,
  type OperationState,
  run,
  showErrors,
} from '~/utils/adminCommon/operation'

function createState(onUnauthorized = () => {}): OperationState {
  return { busy: false, messages: null, onUnauthorized }
}

describe('画面の知らせ', () => {
  it('info は知らせ、showErrors はエラーとして messages に入れる', () => {
    const state = createState()
    info(state, 'a', 'b')
    expect(state.messages).toEqual({ kind: 'info', lines: ['a', 'b'] })
    showErrors(state, ['だめ'])
    expect(state.messages).toEqual({ kind: 'error', lines: ['だめ'] })
  })
})

describe('run', () => {
  it('動かしている間だけ busy にし、うまくいけば true を返す', async () => {
    const state = createState()
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
    const state = createState(onUnauthorized)
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
