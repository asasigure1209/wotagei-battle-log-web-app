// DB への接続。drizzle-kit・seed・サーバーが同じ接続先と設定を使うよう、ここだけで作る
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/libsql'

/** 接続先。NUXT_DATABASE_URL の指定がなければローカルの SQLite ファイル (.data は git に含めない) */
export const dbCredentials = {
  url: process.env.NUXT_DATABASE_URL ?? 'file:.data/db.sqlite',
  authToken: process.env.NUXT_DATABASE_AUTH_TOKEN,
}

export async function connectDb(credentials = dbCredentials) {
  const db = drizzle({ connection: credentials })
  // SQLite は接続ごとに有効にしないと、外部キーの制約も ON DELETE CASCADE も効かない
  await db.run(sql`PRAGMA foreign_keys = ON`)
  return db
}
