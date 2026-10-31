import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  downloadInSequence,
  startDownload,
  videoDownloadPath,
} from '~/utils/videoDownload'

describe('videoDownloadPath', () => {
  it('プレイヤー画面のパスの前に /download を付け、動画の No. を足す', () => {
    expect(videoDownloadPath('/s/e/players/05', '02')).toBe(
      '/download/s/e/players/05/02',
    )
  })
})

describe('startDownload', () => {
  it('path を href にした <a> を click する', () => {
    const hrefs: (string | null)[] = []
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        hrefs.push(this.getAttribute('href'))
      })
    startDownload('/download/s/e/players/05/01')
    expect(hrefs).toEqual(['/download/s/e/players/05/01'])
    click.mockRestore()
  })
})

describe('downloadInSequence', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('1 つ目はすぐに、2 つ目からは 1500ms ずつ空けて、何番目かと一緒に渡す', async () => {
    const calls: [string, number][] = []
    const running = downloadInSequence(
      ['a', 'b', 'c'],
      (item, i) => calls.push([item, i]),
      new AbortController().signal,
    )
    expect(calls).toEqual([['a', 0]])

    await vi.advanceTimersByTimeAsync(1499)
    expect(calls).toEqual([['a', 0]])
    await vi.advanceTimersByTimeAsync(1)
    expect(calls).toEqual([
      ['a', 0],
      ['b', 1],
    ])
    await vi.advanceTimersByTimeAsync(1500)
    await running
    expect(calls).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 2],
    ])
  })

  it('待っている間に中断されたら、待たずに戻り、続きを渡さない', async () => {
    const download = vi.fn()
    const abort = new AbortController()
    const running = downloadInSequence(['a', 'b'], download, abort.signal)
    expect(download).toHaveBeenCalledTimes(1)

    abort.abort()
    // タイマーを進めなくても終わる
    await running
    await vi.runAllTimersAsync()
    expect(download).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('始める前に中断されていたら、何も渡さない', async () => {
    const download = vi.fn()
    const abort = new AbortController()
    abort.abort()
    await downloadInSequence(['a', 'b'], download, abort.signal)
    expect(download).not.toHaveBeenCalled()
  })
})
