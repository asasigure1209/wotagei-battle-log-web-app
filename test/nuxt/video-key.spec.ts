import { describe, expect, it } from 'vitest'
import { isVideoKey, isVideoRelPath } from '~~/shared/utils/video-key'

describe('isVideoRelPath', () => {
  it('.mp4 (大文字・小文字は問わない) で終わる相対パスを通す', () => {
    expect(isVideoRelPath('予選/M1256.mp4')).toBe(true)
    expect(isVideoRelPath('C1010S03.MP4')).toBe(true)
  })

  it('空の階層・. ・.. ・\\ を含むもの、.mp4 でないものは通さない', () => {
    for (const path of [
      '',
      '/a.mp4',
      'a//b.mp4',
      '../a.mp4',
      'a/./b.mp4',
      'a\\b.mp4',
      'a.mov',
      '.DS_Store',
    ]) {
      expect(isVideoRelPath(path), path).toBe(false)
    }
  })
})

describe('isVideoKey', () => {
  it('シリーズ ID/イベント ID/相対パス の形だけを通す', () => {
    expect(isVideoKey('s/e/予選/a.mp4', 's', 'e')).toBe(true)
    expect(isVideoKey('s/x/a.mp4', 's', 'e')).toBe(false)
    expect(isVideoKey('s/e/a.mp4', 's', 'e/f')).toBe(false)
    expect(isVideoKey('s/e/../a.mp4', 's', 'e')).toBe(false)
  })
})
