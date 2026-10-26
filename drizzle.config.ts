import { defineConfig } from 'drizzle-kit'
import { dbCredentials } from './server/db/client'

export default defineConfig({
  dialect: 'turso',
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dbCredentials,
})
