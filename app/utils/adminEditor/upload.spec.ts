import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { newRow } from '~/utils/adminEditor/state'
import {
  cancelUpload,
  fetchRemote,
  refreshRemote,
  uploadAll,
  uploadTargets,
} from '~/utils/adminEditor/upload'
import { uploadMultipart } from '~/utils/multipartUpload'
import { stateWithEvent, videoFile } from '~~/test/nuxt/adminTestUtils'

// R2 への実際の送信は multipartUpload.spec.ts で確かめるので、ここでは差し替える
vi.mock('~/utils/multipartUpload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/utils/multipartUpload')>()),
  uploadMultipart: vi.fn(),
}))
const upload = vi.mocked(uploadMultipart)

registerEndpoint('/api/admin/objects', () => [
  { key: 's/e/予選/a.mp4', size: 10 },
  { key: 's/e/b.mp4', size: 20 },
])

/** イベントを選び、R2 を調べ終えた状態 */
function readyState() {
  const state = stateWithEvent()
  state.remote = new Map([['予選/a.mp4', 10]])
  return state
}

// mockReset はモックを返すが、beforeEach が関数を返すと後片付けとして呼ばれてしまうので、何も返さない
beforeEach(() => {
  upload.mockReset()
})

describe('R2 の確認', () => {
  it('fetchRemote は、キーからイベントの部分を除いた相対パスとサイズを返す', async () => {
    expect(await fetchRemote({ seriesId: 's', eventId: 'e' })).toEqual(
      new Map([
        ['予選/a.mp4', 10],
        ['b.mp4', 20],
      ]),
    )
  })

  it('refreshRemote は、イベントを選んでいなければ問い合わせず、未確認にする', async () => {
    const state = readyState()
    const { event } = state
    state.event = null
    await refreshRemote(state)
    expect(state.remote).toBeNull()
    state.event = event
    await refreshRemote(state)
    expect(state.remote?.get('b.mp4')).toBe(20)
  })
})

describe('アップロード', () => {
  it('uploadTargets は、アップロードが要る (needsUpload) 行だけを返す', () => {
    const state = readyState()
    state.rows = [
      newRow('予選/a.mp4', { file: videoFile('a.mp4'), sizeBytes: 10 }),
      newRow('予選/c.mp4', { file: videoFile('c.mp4'), sizeBytes: 5 }),
    ]
    expect(uploadTargets(state).map((r) => r.relPath)).toEqual(['予選/c.mp4'])
  })

  it('uploadAll は対象を 1 本ずつキーを付けて送り、送れたものを R2 にあるものとして覚える', async () => {
    upload.mockImplementation(async (_file, _key, onProgress) => {
      onProgress(1)
    })
    const state = readyState()
    state.rows = [
      newRow('予選/c.mp4', { file: videoFile('c.mp4', 5), sizeBytes: 5 }),
      newRow('d.mp4', { file: videoFile('d.mp4', 7), sizeBytes: 7 }),
    ]
    await uploadAll(state)
    expect(upload.mock.calls.map((c) => c[1])).toEqual([
      's/e/予選/c.mp4',
      's/e/d.mp4',
    ])
    expect(state.remote?.get('予選/c.mp4')).toBe(5)
    expect(state.rows.map((r) => r.sentBytes)).toEqual([null, null])
    expect(state.uploadAbort).toBeNull()
    expect(state.messages?.lines).toEqual(['2 本アップロードしました'])
  })

  it('失敗した行に印を付け、残りは送らずに止める', async () => {
    upload.mockRejectedValue(new Error('network'))
    const state = readyState()
    state.rows = [
      newRow('c.mp4', { file: videoFile('c.mp4', 5), sizeBytes: 5 }),
      newRow('d.mp4', { file: videoFile('d.mp4', 7), sizeBytes: 7 }),
    ]
    await uploadAll(state)
    expect(upload).toHaveBeenCalledOnce()
    expect(state.rows[0]?.error).toBe('アップロード失敗')
    expect(state.messages).toEqual({ kind: 'error', lines: ['network'] })
  })

  it('cancelUpload で中止すると、その行は「中止しました」になる', async () => {
    const state = readyState()
    upload.mockImplementation(
      (_file, _key, _onProgress, _deps, signal) =>
        new Promise((_, reject) => {
          signal?.addEventListener('abort', () => reject(new Error('aborted')))
        }),
    )
    state.rows = [
      newRow('c.mp4', { file: videoFile('c.mp4', 5), sizeBytes: 5 }),
    ]
    const running = uploadAll(state)
    await vi.waitFor(() => expect(state.uploadAbort).not.toBeNull())
    cancelUpload(state)
    await running
    expect(state.rows[0]?.error).toBe('中止しました')
  })

  it('R2 をまだ調べていなければ、何も送らない', async () => {
    const state = readyState()
    state.remote = null
    state.rows = [
      newRow('c.mp4', { file: videoFile('c.mp4', 5), sizeBytes: 5 }),
    ]
    await uploadAll(state)
    expect(upload).not.toHaveBeenCalled()
  })
})
