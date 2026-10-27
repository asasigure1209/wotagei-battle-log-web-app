// DB への接続。drizzle-kit・seed・サーバーが同じ接続先と設定を使うよう、ここだけで作る。
// 本番の DB は Cloudflare D1 で、Vercel からは直接つなげないので、中継 Worker (workers/d1-proxy) に SQL を送る。
// ローカルでは SQLite ファイルを libsql で開く。どちらも Drizzle からは sqlite-proxy に見え、使い方は変わらない
import { drizzle } from 'drizzle-orm/sqlite-proxy'
import { type RemoteQuery, type RemoteResult, toRemoteResult } from './remote'

/**
 * 接続先。NUXT_DATABASE_URL が http(s) なら中継 Worker の URL で、NUXT_DATABASE_AUTH_TOKEN をトークンにする。
 * 指定がなければローカルの SQLite ファイル (.data は git に含めない)
 */
export const dbCredentials = {
  url: process.env.NUXT_DATABASE_URL ?? 'file:.data/db.sqlite',
  authToken: process.env.NUXT_DATABASE_AUTH_TOKEN,
}

type Executor = {
  query(query: RemoteQuery): Promise<RemoteResult>
  /** まとめて 1 つのトランザクションで流す */
  batch(queries: RemoteQuery[]): Promise<RemoteResult[]>
}

export function isRemote(credentials = dbCredentials) {
  return /^https?:\/\//.test(credentials.url)
}

export async function connectDb(credentials = dbCredentials) {
  const executor = isRemote(credentials)
    ? d1Proxy(credentials)
    : await localSqlite(credentials)
  return drizzle(
    (sql, params, method) => executor.query({ sql, params, method }),
    (queries) => executor.batch(queries),
  )
}

/** 中継 Worker に SQL を送る */
function d1Proxy({ url, authToken }: typeof dbCredentials): Executor {
  async function post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(new URL(path, url), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${authToken ?? ''}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      throw new Error(
        `D1 の中継 Worker がエラーを返した (${res.status}): ${await res.text()}`,
      )
    }
    return res.json() as Promise<T>
  }
  return {
    query: (query) => post('query', query),
    batch: (queries) => post('batch', queries),
  }
}

/** ローカルの SQLite ファイルを libsql で開く。サーバーの本番ビルドで読み込まないよう、使うときだけ import する */
async function localSqlite(
  credentials: typeof dbCredentials,
): Promise<Executor> {
  const { createClient } = await import('@libsql/client')
  const client = createClient(credentials)
  // SQLite は接続ごとに有効にしないと、外部キーの制約も ON DELETE CASCADE も効かない (D1 は最初から有効)
  await client.execute('PRAGMA foreign_keys = ON')
  const toArgs = ({ sql, params }: RemoteQuery) => ({
    sql,
    args: params as never,
  })
  // libsql の行は配列のようにも読めるので、列の値の配列に直す
  const rowsOf = (rows: ArrayLike<unknown>[]) =>
    rows.map((row) => Array.from(row))
  return {
    async query(query) {
      const result = await client.execute(toArgs(query))
      return toRemoteResult(rowsOf(result.rows), query.method)
    },
    async batch(queries) {
      const results = await client.batch(queries.map(toArgs), 'write')
      return results.map((result, i) =>
        toRemoteResult(rowsOf(result.rows), queries[i]?.method ?? 'all'),
      )
    },
  }
}
