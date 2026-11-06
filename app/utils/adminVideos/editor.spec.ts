import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import { createAdminVideoEditor } from '~/utils/adminVideos/editor'
import { newRow } from '~/utils/adminVideos/state'
import { eventInfo, videoFile } from '~~/test/nuxt/adminTestUtils'

// 登録済みの動画は 1 本で、出演者が 3 人いる (db:import で作れる。この画面では 2 人までしか選べない)
registerEndpoint('/api/admin/events/s/e', () => ({
  ...eventInfo(),
  entries: [
    { entryNo: 1, name: 'A' },
    { entryNo: 2, name: 'B' },
    { entryNo: 3, name: 'C' },
  ],
  videos: [
    { key: 's/e/a.mp4', durationSec: 3, sizeBytes: 10, performers: [1, 2, 3] },
  ],
}))
registerEndpoint('/api/admin/events/s/e/videos', {
  method: 'PUT',
  handler: () => ({ ok: true }),
})

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

/** 登録済みのイベント (エントリーは 1 人) を選んだエディター */
function editorWithEvent() {
  const editor = createAdminVideoEditor(() => {})
  editor.state.event = eventInfo()
  editor.state.entries = [{ entryNo: 1, name: 'A' }]
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

  it('エントリーが 1 人もいなければ、hasEntries は false で、登録できない', () => {
    const editor = editorWithEvent()
    editor.state.rows = [newRow('a.mp4', { sizeBytes: 10 })]
    editor.state.remote = new Map([['a.mp4', 10]])
    expect(editor.hasEntries.value).toBe(true)
    editor.state.entries = []
    expect(editor.hasEntries.value).toBe(false)
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

  it('open は、一覧にあるイベントを、登録済みのエントリー・R2 の一覧とともに読み込む', async () => {
    const editor = createAdminVideoEditor(() => {})
    await editor.events.reload()
    await editor.open('s/e')
    expect(editor.currentKey.value).toBe('s/e')
    expect(editor.state.entries.map((e) => e.entryNo)).toEqual([1, 2, 3])
    expect(editor.state.remote).toEqual(new Map([['a.mp4', 10]]))
  })

  it('並べ替え・パス順・行を外すあとも、各行の出演者はその行に残る', () => {
    const editor = editorWithEvent()
    editor.state.rows = [
      newRow('b.mp4', { performers: [1, null] }),
      newRow('a.mp4', { performers: [2, 1] }),
      newRow('c.mp4', { performers: [3, null] }),
    ]
    const performersByPath = () =>
      editor.state.rows.map((r) => [r.relPath, r.performers])
    editor.sortRows()
    expect(performersByPath()).toEqual([
      ['a.mp4', [2, 1]],
      ['b.mp4', [1, null]],
      ['c.mp4', [3, null]],
    ])
    editor.moveRow(editor.state.rows[2]?.id ?? 0, -1)
    editor.removeRow(editor.state.rows[0]?.id ?? 0)
    expect(performersByPath()).toEqual([
      ['c.mp4', [3, null]],
      ['b.mp4', [1, null]],
    ])
  })

  it('3 人目から外れる印は、読み込んだあとのほかの操作の知らせで消えず、「確認だけ」の結果にも出る', async () => {
    const editor = createAdminVideoEditor(() => {})
    await editor.events.reload()
    await editor.open('s/e')
    const [loaded] = editor.state.rows
    expect(loaded?.performers).toEqual([1, 2])
    // 知らせを出すほかの操作 (.mp4 でないファイルをとばす)
    await editor.addFiles([videoFile('.DS_Store')], '')
    editor.sortRows()
    expect(editor.state.messages?.lines).toEqual([
      '.mp4 ではないファイルを 1 個とばしました',
    ])
    expect(editor.state.rows[0]?.droppedPerformers).toEqual([3])
    await editor.register(true)
    expect(editor.state.messages?.lines).toContain(
      '出演者は 2 人までなので、登録すると No. 3 が外れます: a.mp4',
    )
  })
})
