import { describe, expect, it } from 'vitest'
import { createAdminEventForm } from '~/utils/adminEvents/form'

const registered = {
  seriesId: 's',
  seriesName: 'シリーズ',
  eventId: 'e',
  eventName: 'イベント',
  date: '2026-01-01',
  contact: '連絡先',
}

describe('フォームの算出値', () => {
  it('canSave は、ID が正しく、待っていないときだけ true', () => {
    const form = createAdminEventForm(() => {})
    expect(form.canSave.value).toBe(false)
    Object.assign(form.state.form, { seriesId: 's', eventId: 'f' })
    expect(form.canSave.value).toBe(true)
    form.state.busy = true
    expect(form.canSave.value).toBe(false)
  })

  it('showIdWarning は、書いた ID に使えない文字があるときだけ true', () => {
    const form = createAdminEventForm(() => {})
    expect(form.showIdWarning.value).toBe(false)
    form.state.form.seriesId = 'エルニーニョ'
    expect(form.showIdWarning.value).toBe(true)
  })

  it('seriesList は、登録済みのシリーズを重ねずに並べる', () => {
    const form = createAdminEventForm(() => {})
    form.state.list = [registered, { ...registered, eventId: 'f' }]
    expect(form.seriesList.value).toEqual([{ id: 's', name: 'シリーズ' }])
  })
})
