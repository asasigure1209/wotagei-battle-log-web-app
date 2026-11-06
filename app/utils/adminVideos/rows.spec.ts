import { describe, expect, it } from 'vitest'
import {
  addFiles,
  moveRow,
  needsUpload,
  removeRow,
  rowState,
  updateRow,
} from '~/utils/adminVideos/rows'
import { createVideoEditorState, newRow } from '~/utils/adminVideos/state'
import { videoFile } from '~~/test/nuxt/adminTestUtils'

const stateWith = (...paths: string[]) => {
  const state = createVideoEditorState(() => {})
  state.rows = paths.map((p) => newRow(p))
  return state
}

const paths = (state: ReturnType<typeof stateWith>) =>
  state.rows.map((r) => r.relPath)

describe('動画の行の操作', () => {
  it('moveRow は行を上下に動かし、端は越えない', () => {
    const state = stateWith('a.mp4', 'b.mp4', 'c.mp4')
    const [a, , c] = state.rows
    moveRow(state, c?.id ?? 0, -1)
    expect(paths(state)).toEqual(['a.mp4', 'c.mp4', 'b.mp4'])
    moveRow(state, a?.id ?? 0, -1)
    expect(paths(state)).toEqual(['a.mp4', 'c.mp4', 'b.mp4'])
  })

  it('updateRow は長さと出演者を書き換える', () => {
    const state = stateWith('a.mp4')
    const id = state.rows[0]?.id ?? 0
    updateRow(state, id, { durationSec: 12, performers: [1, 2] })
    expect(state.rows[0]).toMatchObject({
      durationSec: 12,
      performers: [1, 2],
    })
  })

  it('removeRow は行を外す', () => {
    const state = stateWith('a.mp4', 'b.mp4')
    removeRow(state, state.rows[0]?.id ?? 0)
    expect(paths(state)).toEqual(['b.mp4'])
  })

  it('addFiles はパス順に足し、同じパスの行は出演者を残してファイルを付け替え、.mp4 でないものはとばす', async () => {
    const state = stateWith('予選/M1.mp4')
    const [loaded] = state.rows
    if (loaded) loaded.performers = [1, null]
    await addFiles(
      state,
      [
        videoFile('M1.mp4', 3),
        videoFile('A.mp4', 2),
        videoFile('.DS_Store', 1),
      ],
      '予選',
    )
    expect(paths(state)).toEqual(['予選/A.mp4', '予選/M1.mp4'])
    expect(state.rows[1]).toMatchObject({
      performers: [1, null],
      sizeBytes: 3,
    })
    expect(state.messages?.lines).toEqual([
      '.mp4 ではないファイルを 1 個とばしました',
    ])
  })
})

describe('rowState', () => {
  const row = (init: Parameters<typeof newRow>[1]) =>
    newRow('a.mp4', { sizeBytes: 10, ...init })

  it('送信中は割合を出し、R2 をまだ調べていなければ未確認', () => {
    expect(rowState(row({ sentBytes: 5 }), null)).toEqual({
      kind: 'uploading',
      label: '送信中 50%',
    })
    expect(rowState(row({}), null).kind).toBe('unknown')
  })

  it('R2 のサイズと比べて、あり・ない・未アップロード・違うを見分ける', () => {
    const file = videoFile('a.mp4')
    const remote = (size?: number) =>
      new Map(size === undefined ? [] : [['a.mp4', size]])
    expect(rowState(row({}), remote(10)).label).toBe('R2 にあり')
    expect(rowState(row({}), remote()).label).toBe('R2 にない')
    expect(rowState(row({ file }), remote()).label).toBe('未アップロード')
    expect(rowState(row({ file }), remote(9)).label).toBe('R2 と違う (上書き)')
  })
})

describe('needsUpload', () => {
  it('この画面で選んだファイルで、R2 にない、またはサイズが違うものだけ', () => {
    const file = videoFile('a.mp4')
    const remote = new Map([['a.mp4', 10]])
    expect(needsUpload(newRow('a.mp4', { file, sizeBytes: 10 }), remote)).toBe(
      false,
    )
    expect(needsUpload(newRow('a.mp4', { file, sizeBytes: 9 }), remote)).toBe(
      true,
    )
    expect(needsUpload(newRow('b.mp4', { file }), remote)).toBe(true)
    expect(needsUpload(newRow('b.mp4', {}), remote)).toBe(false)
  })
})
