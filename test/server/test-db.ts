import { mkdirSync, rmSync } from 'node:fs'
import { dirname } from 'node:path'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/sqlite-proxy/migrator'
import { dbCredentials } from '../../server/db/client'
import { eventSeries } from '../../server/db/schema'
import { useDb } from '../../server/utils/db'

let created = false

/**
 * テスト用の DB (vitest.config.ts の NUXT_DATABASE_URL) を空にして、サーバーと同じ接続を返す。
 * テストファイルの最初の 1 回はファイルから作り直す。サーバーの接続は開いたファイルを使い回すので、
 * 2 回目からはファイルを消さず、シリーズを消して配下ごと (ON DELETE CASCADE) 空にする。
 * どのテストファイルも同じファイルを使うので、server のテストはファイルを 1 つずつ流す (vitest.config.ts)
 */
export async function resetTestDb() {
  if (created) {
    const db = await useDb()
    await db.delete(eventSeries)
    return db
  }

  const file = dbCredentials.url.replace(/^file:/, '')
  mkdirSync(dirname(file), { recursive: true })
  rmSync(file, { force: true })
  const db = await useDb()
  await migrate(
    db,
    async (queries) => {
      for (const query of queries) await db.run(sql.raw(query))
    },
    { migrationsFolder: 'server/db/migrations' },
  )
  created = true
  return db
}
