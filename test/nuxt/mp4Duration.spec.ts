import { describe, expect, it } from 'vitest'
import { readMp4Duration } from '~/utils/mp4Duration'

/** type のボックス (大きさ 4 バイト + 種類 4 バイト + 中身) */
function box(type: string, body: Uint8Array) {
  const out = new Uint8Array(8 + body.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, out.length)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(body, 8)
  return out
}

/** 大きさを 64 ビットで書いたボックス (size = 1) */
function largeBox(type: string, body: Uint8Array) {
  const out = new Uint8Array(16 + body.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, 1)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  view.setBigUint64(8, BigInt(out.length))
  out.set(body, 16)
  return out
}

function mvhd(version: 0 | 1, timescale: number, duration: number) {
  const body = new Uint8Array(version === 1 ? 32 : 20)
  const view = new DataView(body.buffer)
  view.setUint8(0, version)
  if (version === 1) {
    view.setUint32(20, timescale)
    view.setBigUint64(24, BigInt(duration))
  } else {
    view.setUint32(12, timescale)
    view.setUint32(16, duration)
  }
  return box('mvhd', body)
}

const ftyp = box('ftyp', new Uint8Array(8))
const blob = (...parts: Uint8Array[]) => new Blob(parts as BlobPart[])

describe('readMp4Duration', () => {
  it('moov の mvhd の timescale と duration から秒を出す (四捨五入)', async () => {
    const moov = box('moov', mvhd(0, 1000, 192_400))
    expect(await readMp4Duration(blob(ftyp, moov))).toBe(192)
  })

  it('moov が動画 (mdat) の後ろにあっても、mdat を読まずに飛ばして探す', async () => {
    const mdat = largeBox('mdat', new Uint8Array(1024))
    const moov = box(
      'moov',
      [box('udta', new Uint8Array(4)), mvhd(1, 90_000, 90_000 * 61)].reduce(
        (a, b) => {
          const out = new Uint8Array(a.length + b.length)
          out.set(a)
          out.set(b, a.length)
          return out
        },
      ),
    )
    expect(await readMp4Duration(blob(ftyp, mdat, moov))).toBe(61)
  })

  it('MP4 でなければ null', async () => {
    expect(
      await readMp4Duration(blob(new TextEncoder().encode('not a video'))),
    ).toBeNull()
    expect(await readMp4Duration(blob(ftyp))).toBeNull()
  })
})
