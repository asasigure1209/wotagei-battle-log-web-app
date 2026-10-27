import { connectDb, type Db } from '../db/client'

let db: Promise<Db> | undefined

/** サーバーで使う DB の接続。最初に呼ばれたときに 1 度だけ接続し、あとは使い回す */
export function useDb() {
  db ??= connectDb().catch((error) => {
    // 接続に失敗したら覚えておかず、次に呼ばれたときにつなぎ直す
    db = undefined
    throw error
  })
  return db
}
