import { connectDb } from '../db/client'

let db: ReturnType<typeof connectDb> | undefined

/** サーバーで使う DB の接続。最初に呼ばれたときに 1 度だけ接続し、あとは使い回す */
export function useDb() {
  db ??= connectDb()
  return db
}
