import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import { createAdminEditor } from '~/utils/adminEditor/editor'
import { newRow } from '~/utils/adminEditor/state'
import { videoFile } from '~~/test/nuxt/adminTestUtils'

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

/** ID を書いたエディター */
function editorWithIds() {
  const editor = createAdminEditor(() => {})
  Object.assign(editor.state.form, { seriesId: 's', eventId: 'e' })
  return editor
}

describe('エディターの算出値', () => {
  it('canUpload は、ID が正しく、R2 を調べ終え、送る動画があり、待っていないときだけ true', () => {
    const editor = editorWithIds()
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
    const editor = editorWithIds()
    expect(editor.canRegister.value).toBe(false)
    editor.state.rows = [newRow('a.mp4', { sizeBytes: 10 })]
    editor.state.remote = new Map([['a.mp4', 10]])
    expect(editor.canRegister.value).toBe(true)
    editor.state.rows.push(newRow('b.mp4', { sizeBytes: 1 }))
    expect(editor.canRegister.value).toBe(false)
  })

  it('currentKey は、フォームの ID から作る', () => {
    expect(editorWithIds().currentKey.value).toBe('s/e')
  })
})

describe('エディターの操作', () => {
  it('addFiles は、R2 をまだ調べていなければ、足したあとに調べる', async () => {
    const editor = editorWithIds()
    await editor.addFiles([videoFile('a.mp4', 10)], '')
    expect(editor.state.rows.map((r) => r.relPath)).toEqual(['a.mp4'])
    expect(editor.state.remote).toEqual(new Map([['a.mp4', 10]]))
  })

  it('open に空を渡すと、新しいイベントを書き始める', async () => {
    const editor = editorWithIds()
    editor.state.loaded = true
    await editor.open('')
    expect(editor.state.form.seriesId).toBe('')
    expect(editor.state.loaded).toBe(false)
  })

  it('events.reload で登録済みのイベントを読み、has で見分ける', async () => {
    const editor = createAdminEditor(() => {})
    await editor.events.reload()
    expect(editor.events.has('s/e')).toBe(true)
    expect(editor.events.has('s/x')).toBe(false)
  })
})
