import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { useBulkDownload } from '~/composables/useBulkDownload'

// onBeforeUnmount を使うので、コンポーネントの中で呼ぶ
function mountBulk(items: string[]) {
  const downloadOne = vi.fn<(item: string) => void>()
  let bulk!: ReturnType<typeof useBulkDownload<string>>
  const wrapper = mount(
    defineComponent({
      setup() {
        bulk = useBulkDownload(() => items, downloadOne)
        return () => h('div')
      },
    }),
  )
  return { bulk, downloadOne, wrapper }
}

describe('useBulkDownload', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('はじめは閉じていて、1 本ずつ保存を選び、ZIP は選べない', () => {
    const { bulk } = mountBulk(['a'])
    expect(bulk.open).toBe(false)
    expect(bulk.method).toBe('seq')
    expect(bulk.disabledMethods).toEqual(['zip'])
    expect(bulk.progress).toBe(0)
    expect(bulk.detail).toBe('0 / 0 本')
  })

  it('show で、保存のしかたを選ぶ段階で開く', async () => {
    const { bulk } = mountBulk(['a'])
    await bulk.start()
    bulk.show()
    expect(bulk.open).toBe(true)
    expect(bulk.step).toBe('choose')
  })

  it('start で 1 本ずつ保存し、進み具合を出し、保存し終えたら閉じる', async () => {
    const { bulk, downloadOne } = mountBulk(['a', 'b', 'c'])
    bulk.show()
    const running = bulk.start()
    expect(bulk.step).toBe('preparing')
    expect(downloadOne.mock.calls).toEqual([['a']])
    expect(bulk.detail).toBe('1 / 3 本')
    expect(bulk.progress).toBe(33)

    await vi.advanceTimersByTimeAsync(1500)
    expect(bulk.detail).toBe('2 / 3 本')
    expect(bulk.progress).toBe(67)
    expect(bulk.open).toBe(true)

    await vi.advanceTimersByTimeAsync(1500)
    await running
    expect(downloadOne.mock.calls).toEqual([['a'], ['b'], ['c']])
    expect(bulk.progress).toBe(100)
    expect(bulk.open).toBe(false)
  })

  it('シートを閉じたら、続きを保存しない', async () => {
    const { bulk, downloadOne } = mountBulk(['a', 'b'])
    bulk.show()
    const running = bulk.start()
    bulk.open = false
    await running
    await vi.runAllTimersAsync()
    expect(downloadOne).toHaveBeenCalledTimes(1)
  })

  it('画面を離れたら、続きを保存しない', async () => {
    const { bulk, downloadOne, wrapper } = mountBulk(['a', 'b'])
    bulk.show()
    const running = bulk.start()
    wrapper.unmount()
    await running
    await vi.runAllTimersAsync()
    expect(downloadOne).toHaveBeenCalledTimes(1)
    // 中断したときはシートを閉じない (閉じたのは利用者か、画面ごとなくなっている)
    expect(bulk.open).toBe(true)
  })
})
