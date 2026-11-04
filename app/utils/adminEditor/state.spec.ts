import { describe, expect, it } from 'vitest'
import { createEditorState, idsValid } from '~/utils/adminEditor/state'

describe('イベントの ID の組', () => {
  it('idsValid は、どちらの ID も英数字と _ - だけのときだけ true', () => {
    const state = createEditorState(() => {})
    expect(idsValid(state)).toBe(false)
    Object.assign(state.form, { seriesId: 'elnino', eventId: 'vol_5' })
    expect(idsValid(state)).toBe(true)
    state.form.eventId = 'vol 5'
    expect(idsValid(state)).toBe(false)
  })
})
