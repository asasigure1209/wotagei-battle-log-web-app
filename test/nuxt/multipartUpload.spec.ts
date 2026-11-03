import { describe, expect, it, vi } from 'vitest'
import {
  PART_SIZE,
  partCountOf,
  runPool,
  type UploadDeps,
  uploadMultipart,
} from '~/utils/multipartUpload'

/** API と PUT の偽物。呼ばれた順を calls に残す */
function fakeDeps(options: { failPut?: (n: number) => boolean } = {}) {
  const calls: string[] = []
  let putCount = 0
  const deps: UploadDeps = {
    post: vi.fn(async (path: string, body: Record<string, unknown>) => {
      calls.push(`${path} ${JSON.stringify(body)}`)
      if (path === '/api/admin/uploads') return { uploadId: 'u1' }
      if (path === '/api/admin/uploads/part')
        return { url: `https://r2/part${body.partNumber}` }
      return { ok: true }
    }) as UploadDeps['post'],
    put: vi.fn(async (url: string, blob: Blob, onProgress) => {
      putCount++
      if (options.failPut?.(putCount)) throw new Error('network')
      onProgress(blob.size)
      calls.push(`PUT ${url} ${blob.size}`)
    }),
  }
  return { deps, calls }
}

/** size バイトの Blob (中身は見ないので slice だけ本物にする) */
const sized = (size: number) =>
  ({
    size,
    slice: (start: number, end: number) =>
      ({ size: Math.max(0, Math.min(end, size) - start) }) as Blob,
  }) as Blob

describe('partCountOf', () => {
  it('PART_SIZE ごとに切る。空でも 1 パート', () => {
    expect(partCountOf(0)).toBe(1)
    expect(partCountOf(PART_SIZE)).toBe(1)
    expect(partCountOf(PART_SIZE + 1)).toBe(2)
  })
})

describe('uploadMultipart', () => {
  it('開始し、パートを PART_SIZE ずつ送り、パートの数を付けて完了させる', async () => {
    const { deps, calls } = fakeDeps()
    const progress: number[] = []
    await uploadMultipart(
      sized(PART_SIZE * 2 + 5),
      's/e/a.mp4',
      (n) => progress.push(n),
      deps,
    )

    expect(calls[0]).toBe('/api/admin/uploads {"key":"s/e/a.mp4"}')
    expect(calls.filter((c) => c.startsWith('PUT')).sort()).toEqual([
      `PUT https://r2/part1 ${PART_SIZE}`,
      `PUT https://r2/part2 ${PART_SIZE}`,
      'PUT https://r2/part3 5',
    ])
    expect(calls.at(-1)).toBe(
      '/api/admin/uploads/complete {"key":"s/e/a.mp4","uploadId":"u1","partCount":3}',
    )
    expect(progress.at(-1)).toBe(PART_SIZE * 2 + 5)
  })

  it('一時的に失敗したパートは、URL を取り直して送り直す', async () => {
    const { deps, calls } = fakeDeps({ failPut: (n) => n === 1 })
    await uploadMultipart(sized(10), 's/e/a.mp4', () => {}, deps)
    expect(
      calls.filter((c) => c.startsWith('/api/admin/uploads/part')),
    ).toHaveLength(2)
    expect(calls.at(-1)).toMatch(/^\/api\/admin\/uploads\/complete/)
  })

  it('送り直しても失敗したら、取りやめて元のエラーを投げる', async () => {
    const { deps, calls } = fakeDeps({ failPut: () => true })
    await expect(
      uploadMultipart(sized(10), 's/e/a.mp4', () => {}, deps),
    ).rejects.toThrow('network')
    expect(calls.at(-1)).toBe(
      '/api/admin/uploads/abort {"key":"s/e/a.mp4","uploadId":"u1"}',
    )
    expect(calls.some((c) => c.includes('complete'))).toBe(false)
  })
})

describe('runPool', () => {
  it('同時に concurrency 個までしか動かさない', async () => {
    let running = 0
    let max = 0
    const done: number[] = []
    await runPool(10, 3, async (i) => {
      running++
      max = Math.max(max, running)
      await new Promise((r) => setTimeout(r, 1))
      running--
      done.push(i)
    })
    expect(max).toBe(3)
    expect(done.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('失敗したら、残りを始めない', async () => {
    const started: number[] = []
    await expect(
      runPool(10, 1, async (i) => {
        started.push(i)
        if (i === 2) throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    expect(started).toEqual([0, 1, 2])
  })
})
