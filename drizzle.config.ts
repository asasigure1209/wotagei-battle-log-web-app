import { defineConfig } from 'drizzle-kit'

// 接続先は NUXT_DATABASE_URL で指定し、指定がなければローカルの SQLite ファイルを使う
// (.data は git に含めない)
export const databaseUrl =
  process.env.NUXT_DATABASE_URL ?? 'file:.data/db.sqlite'

export default defineConfig({
  dialect: 'turso',
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dbCredentials: {
    url: databaseUrl,
    authToken: process.env.NUXT_DATABASE_AUTH_TOKEN,
  },
})
