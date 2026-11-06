import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import { createAdminVideoEditor } from '~/utils/adminVideos/editor'
import { newRow } from '~/utils/adminVideos/state'
import { eventInfo, videoFile } from '~~/test/nuxt/adminTestUtils'

registerEndpoint('/api/admin/events/s/e', () => ({
  ...eventInfo(),
  entries: [],
  videos: [],
}))

registerEndpoint('/api/admin/objects', () => [{ key: 's/e/a.mp4', size: 10 }])
registerEndpoint('/api/admin/events', () => [
  {
    seriesId: 's',
    seriesName: 'シリーズ',
    eventId: 'e',
    eventName: 'イベント',
    date: '2026-01-01',
  },
])

/** 登録済みのイベントを選んだエディター */
function editorWithEvent() {
  const editor = createAdminVideoEditor(() => {})
  editor.state.event = eventInfo()
  return editor
}

describe('エディターの算出値', () => {
  it('canUpload は、イベントを選び、R2 を調べ終え、送る動画があり、待っていないときだけ true', () => {
    const editor = editorWithEvent()
    editor.state.rows = [
      newRow('b.mp4', { file: videoFile('b.mp4'), sizeBytes: 5 }),
    ]
    expect(editor.canUpload.value).toBe(false)
    editor.state.remote = new Map()
    expect(editor.canUpload.value).toBe(true)
    expect(editor.totalUploadBytes.value).toBe(5)
    editor.state.busy = true
    expect(editor.canUpload.value).toBe(false)
  })

  it('canRegister は、すべての動画が R2 にあるときだけ true', () => {
    const editor = editorWithEvent()
    expect(editor.canRegister.value).toBe(false)
    editor.state.rows = [newRow('a.mp4', { sizeBytes: 10 })]
    editor.state.remote = new Map([['a.mp4', 10]])
    expect(editor.canRegister.value).toBe(true)
    editor.state.rows.push(newRow('b.mp4', { sizeBytes: 1 }))
    expect(editor.canRegister.value).toBe(false)
  })

  it('selected と currentKey は、選んだイベントから作る (選んでいなければ false と空)', () => {
    const editor = editorWithEvent()
    expect(editor.selected.value).toBe(true)
    expect(editor.currentKey.value).toBe('s/e')
    editor.state.event = null
    expect(editor.selected.value).toBe(false)
    expect(editor.currentKey.value).toBe('')
  })

  it('イベントを選んでいなければ、アップロードも登録もできない', () => {
    const editor = createAdminVideoEditor(() => {})
    editor.state.rows = [newRow('a.mp4', { sizeBytes: 10 })]
    editor.state.remote = new Map([['a.mp4', 10]])
    expect(editor.canRegister.value).toBe(false)
    editor.state.rows = [newRow('b.mp4', { file: videoFile('b.mp4') })]
    expect(editor.canUpload.value).toBe(false)
  })
})

describe('エディターの操作', () => {
  it('addFiles は、R2 をまだ調べていなければ、足したあとに調べる', async () => {
    const editor = editorWithEvent()
    await editor.addFiles([videoFile('a.mp4', 10)], '')
    expect(editor.state.rows.map((r) => r.relPath)).toEqual(['a.mp4'])
    expect(editor.state.remote).toEqual(new Map([['a.mp4', 10]]))
  })

  it('open に空を渡すと、選んだイベントを外す', async () => {
    const editor = editorWithEvent()
    await editor.open('')
    expect(editor.state.event).toBeNull()
  })

  it('open は、一覧にあるイベントを、R2 の一覧とともに読み込む', async () => {
    const editor = createAdminVideoEditor(() => {})
    await editor.events.reload()
    await editor.open('s/e')
    expect(editor.currentKey.value).toBe('s/e')
    expect(editor.state.remote).toEqual(new Map([['a.mp4', 10]]))
  })
})
