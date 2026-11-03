import { describe, expect, it } from 'vitest'
import {
  compareRelPath,
  formatBytes,
  formatEntriesText,
  formatSeconds,
  parseEntriesText,
  parsePerformers,
  relPathOf,
} from '~/utils/adminManifest'

describe('parseEntriesText', () => {
  it('「No.: 名前」の行を、No. をキーにした名前にする (空行は飛ばす)', () => {
    expect(parseEntriesText('1: BLAZE\n\n 2：しぐれ \n10 Ace Of Base')).toEqual(
      {
        entries: { '1': 'BLAZE', '2': 'しぐれ', '10': 'Ace Of Base' },
        problems: [],
      },
    )
  })

  it('形の違う行と重なった No. を problems に入れる', () => {
    const { entries, problems } = parseEntriesText('01: A\nB\n1: C')
    expect(entries).toEqual({ '1': 'A' })
    expect(problems).toEqual([
      '2 行目は「No.: 名前」の形で書いてください: B',
      'エントリー No. 1 が重なっています',
    ])
  })

  it('formatEntriesText で書いた文を読み戻せる', () => {
    const text = formatEntriesText([
      { entryNo: 1, name: 'A' },
      { entryNo: 2, name: 'B: C' },
    ])
    expect(parseEntriesText(text).entries).toEqual({ '1': 'A', '2': 'B: C' })
  })
})

describe('parsePerformers', () => {
  it('カンマ・空白・読点で区切った No. を数の並びにする', () => {
    expect(parsePerformers('1, 2')).toEqual([1, 2])
    expect(parsePerformers('3 4')).toEqual([3, 4])
    expect(parsePerformers('5、6')).toEqual([5, 6])
    expect(parsePerformers('')).toEqual([])
  })

  it('数でないものが混ざれば null', () => {
    expect(parsePerformers('1, a')).toBeNull()
  })
})

describe('relPathOf', () => {
  it('フォルダごと選んだときは、選んだフォルダを除いたパスにする', () => {
    expect(
      relPathOf({ name: 'M1.mp4', webkitRelativePath: 'videos/予選/M1.mp4' }),
    ).toBe('予選/M1.mp4')
  })

  it('ファイルだけを選んだときは、分類があればその下に置く', () => {
    expect(relPathOf({ name: 'M1.mp4', webkitRelativePath: '' })).toBe('M1.mp4')
    expect(relPathOf({ name: 'M1.mp4' }, ' /本戦/ ')).toBe('本戦/M1.mp4')
  })
})

describe('compareRelPath', () => {
  it('mise manifest (LC_ALL=C の sort) と同じく、文字コードの順に並べる', () => {
    expect(
      ['本戦/a.mp4', '予選/b.mp4', 'B.mp4', 'a.mp4'].sort(compareRelPath),
    ).toEqual(['B.mp4', 'a.mp4', '予選/b.mp4', '本戦/a.mp4'])
  })
})

describe('formatBytes', () => {
  it('1000 ごとに単位を上げる', () => {
    expect(formatBytes(999)).toBe('999 B')
    expect(formatBytes(1_234_567_890)).toBe('1.23 GB')
  })
})

describe('formatSeconds', () => {
  it('分:秒 (秒は 2 桁) にする', () => {
    expect(formatSeconds(0)).toBe('0:00')
    expect(formatSeconds(192)).toBe('3:12')
    expect(formatSeconds(3605)).toBe('60:05')
  })
})
