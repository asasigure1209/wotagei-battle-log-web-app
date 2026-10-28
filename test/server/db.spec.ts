import { beforeEach, describe, expect, it, vi } from 'vitest'

const { connectDb } = vi.hoisted(() => ({ connectDb: vi.fn() }))

vi.mock('../../server/db/client', () => ({ connectDb }))

// useDb は接続をモジュールの中に覚えておくので、テストごとに読み込み直す
async function importUseDb() {
  const { useDb } = await import('../../server/utils/db')
  return useDb
}

beforeEach(() => {
  connectDb.mockReset()
  vi.resetModules()
})

describe('useDb', () => {
  it('1 度だけ接続し、あとは同じ接続を返す', async () => {
    const db = {}
    connectDb.mockResolvedValue(db)
    const useDb = await importUseDb()

    const first = useDb()
    const second = useDb()

    expect(second).toBe(first)
    await expect(first).resolves.toBe(db)
    expect(connectDb).toHaveBeenCalledTimes(1)
  })

  it('接続に失敗したら覚えておかず、次に呼ばれたときにつなぎ直す', async () => {
    const db = {}
    const error = new Error('接続できない')
    connectDb.mockRejectedValueOnce(error).mockResolvedValueOnce(db)
    const useDb = await importUseDb()

    await expect(useDb()).rejects.toBe(error)
    await expect(useDb()).resolves.toBe(db)
    expect(connectDb).toHaveBeenCalledTimes(2)
  })
})
