import { describe, expect, it } from 'vitest'
import { useVideoSelection } from '~/composables/useVideoSelection'

const videos = [{ no: '01' }, { no: '02' }, { no: '03' }]

describe('useVideoSelection', () => {
  it('選択モードでなければ、まとめて保存するのは全部の動画', () => {
    const selection = useVideoSelection(videos)
    expect(selection.active).toBe(false)
    expect(selection.targets).toEqual(videos)
  })

  it('選択モードでは、選んだ動画だけを一覧の順で返す', () => {
    const selection = useVideoSelection(videos)
    selection.toggle()
    expect(selection.targets).toEqual([])

    selection.selected['03'] = true
    selection.selected['01'] = true
    selection.selected['02'] = false
    expect(selection.targets).toEqual([{ no: '01' }, { no: '03' }])
  })

  it('切り替えるたびに選んだ動画を空に戻す', () => {
    const selection = useVideoSelection(videos)
    selection.toggle()
    selection.selected['01'] = true
    selection.toggle()
    expect(selection.active).toBe(false)
    expect(selection.selected).toEqual({})

    selection.toggle()
    expect(selection.targets).toEqual([])
  })
})
