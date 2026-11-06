import { describe, expect, it } from 'vitest'
import {
  compareRelPath,
  formatBytes,
  formatEntryNames,
  formatSeconds,
  isNumberedFromOne,
  parseEntryNames,
  relPathOf,
} from '~/utils/adminManifest'

describe('parseEntryNames', () => {
  it('1 行に 1 人の名前を、書いた順に並べる (前後の空白は除き、空行はとばす)', () => {
    expect(parseEntryNames(' BLAZE \n\n しぐれ\r\n  \nAce Of Base')).toEqual([
      'BLAZE',
      'しぐれ',
      'Ace Of Base',
    ])
  })

  it('何も書いていなければ空', () => {
    expect(parseEntryNames('')).toEqual([])
    expect(parseEntryNames(' \n\n')).toEqual([])
  })

  it('「1: BLAZE」のように No. を書いても、名前として扱う (No. は書いた順に付く)', () => {
    expect(parseEntryNames('1: BLAZE')).toEqual(['1: BLAZE'])
  })
})

describe('formatEntryNames', () => {
  it('エントリーを No. の順に並べ、名前を 1 行に 1 人ずつ書く (parseEntryNames で読み戻せる)', () => {
    const text = formatEntryNames([
      { entryNo: 2, name: 'しぐれ' },
      { entryNo: 1, name: 'BLAZE' },
    ])
    expect(text).toBe('BLAZE\nしぐれ')
    expect(parseEntryNames(text)).toEqual(['BLAZE', 'しぐれ'])
  })

  it('エントリーがなければ空', () => {
    expect(formatEntryNames([])).toBe('')
  })
})

describe('isNumberedFromOne', () => {
  it('No. が 1 から抜けなく並んでいれば true (並び順は問わない)', () => {
    expect(isNumberedFromOne([])).toBe(true)
    expect(
      isNumberedFromOne([
        { entryNo: 2, name: 'B' },
        { entryNo: 1, name: 'A' },
      ]),
    ).toBe(true)
  })

  it('抜けがあったり、1 から始まっていなければ false', () => {
    expect(
      isNumberedFromOne([
        { entryNo: 1, name: 'A' },
        { entryNo: 3, name: 'C' },
      ]),
    ).toBe(false)
    expect(isNumberedFromOne([{ entryNo: 2, name: 'B' }])).toBe(false)
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
  it('LC_ALL=C の sort と同じく、文字コードの順に並べる', () => {
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
