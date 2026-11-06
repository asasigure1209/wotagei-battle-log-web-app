import { describe, expect, it } from 'vitest'
import { createAdminEntriesForm } from '~/utils/adminEntries/form'
import { eventInfo } from '~~/test/nuxt/adminTestUtils'

/** 登録済みのイベントを選んだ画面 */
function formWithEvent() {
  const form = createAdminEntriesForm(() => {})
  form.state.event = eventInfo()
  return form
}

describe('画面の算出値', () => {
  it('names は、書いた名前を書いた順に並べる (No. は 1 から)', () => {
    const form = formWithEvent()
    form.state.namesText = 'BLAZE\n\n しぐれ '
    expect(form.names.value).toEqual(['BLAZE', 'しぐれ'])
  })

  it('canSave は、イベントを選び、名前が 1 人以上いて、待っていないときだけ true', () => {
    const form = formWithEvent()
    expect(form.canSave.value).toBe(false)
    form.state.namesText = 'BLAZE'
    expect(form.canSave.value).toBe(true)
    form.state.busy = true
    expect(form.canSave.value).toBe(false)
    form.state.busy = false
    form.state.event = null
    expect(form.canSave.value).toBe(false)
  })

  it('selected と currentKey は、選んだイベントから作る (選んでいなければ false と空)', () => {
    const form = formWithEvent()
    expect(form.selected.value).toBe(true)
    expect(form.currentKey.value).toBe('s/e')
    form.state.event = null
    expect(form.selected.value).toBe(false)
    expect(form.currentKey.value).toBe('')
  })
})
