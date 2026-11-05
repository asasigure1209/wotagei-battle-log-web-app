import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import { createAdminEditor } from '~/utils/adminEditor/editor'
import { newRow } from '~/utils/adminEditor/state'
import { eventInfo, videoFile } from '~~/test/nuxt/adminTestUtils'

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
  const editor = createAdminEditor(() => {})
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
    const editor = createAdminEditor(() => {})
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

  it('events.reload で登録済みのイベントを読み、has で見分ける', async () => {
    const editor = createAdminEditor(() => {})
    await editor.events.reload()
    expect(editor.events.has('s/e')).toBe(true)
    expect(editor.events.has('s/x')).toBe(false)
  })
  it('openInitial は、一覧にあるイベントなら開き、なければそのことを知らせる', async () => {
    const editor = createAdminEditor(() => {})
    await editor.events.reload()
    await editor.openInitial('s/x')
    expect(editor.state.event).toBeNull()
    expect(editor.state.messages).toEqual({
      kind: 'error',
      lines: ['登録済みのイベントに見つかりません: s/x'],
    })
    await editor.openInitial('')
    expect(editor.state.messages?.kind).toBe('error')
  })

  it('openInitial は、それまでに自分でイベントを選んでいたら、何もしない', async () => {
    const editor = createAdminEditor(() => {})
    await editor.events.reload()
    await editor.open('')
    await editor.openInitial('s/e')
    expect(editor.state.event).toBeNull()
    expect(editor.state.messages).toBeNull()
  })
})
