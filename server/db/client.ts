// DB への接続。drizzle-kit・seed・サーバーが同じ接続先と設定を使うよう、ここだけで作る。
// 本番の DB は Cloudflare D1 で、Vercel からは直接つなげないので、中継 Worker (workers/d1-proxy) に SQL を送る。
// ローカルでは SQLite ファイルを libsql で開く。どちらも Drizzle からは sqlite-proxy に見え、使い方は変わらない
import { drizzle } from 'drizzle-orm/sqlite-proxy'

/** ローカルの SQLite ファイル。NUXT_DATABASE_URL の指定がなければ .data/db.sqlite (.data は git に含めない) */
export const dbCredentials = {
  url: process.env.NUXT_DATABASE_URL ?? 'file:.data/db.sqlite',
}

/** 中継 Worker。NUXT_D1_PROXY_URL を指定したときだけ、ローカルのファイルの代わりにこちらを使う */
export const d1ProxyCredentials = {
  url: process.env.NUXT_D1_PROXY_URL,
  /** 中継 Worker の PROXY_TOKEN と同じ値 */
  token: process.env.NUXT_D1_PROXY_TOKEN,
}

export function usesD1Proxy() {
  return Boolean(d1ProxyCredentials.url)
}

type Query = { sql: string; params: unknown[] }
/** 行は列の値の配列 (列名は Drizzle が付け直す) */
type Rows = unknown[][]

/** SQL を実行して、行をそのまま返す役。結果を Drizzle の形に整えるのは connectDb がまとめて行う */
type Executor = {
  query(query: Query): Promise<Rows>
  /** まとめて 1 つのトランザクションで流す */
  batch(queries: Query[]): Promise<Rows[]>
}

export async function connectDb() {
  const { url, token } = d1ProxyCredentials
  const executor = url
    ? d1Proxy(url, token ?? '')
    : await localSqlite(dbCredentials.url)
  // Drizzle の sqlite-proxy は、get なら 1 行ぶん (なければ undefined)、それ以外なら行の並びを受け取る
  const toResult = (rows: Rows, method: string) => ({
    rows: method === 'get' ? (rows[0] as unknown[]) : rows,
  })
  return drizzle(
    async (sql, params, method) =>
      toResult(await executor.query({ sql, params }), method),
    async (queries) => {
      const results = await executor.batch(queries)
      return queries.map((q, i) => toResult(results[i] ?? [], q.method))
    },
  )
}

/** 中継 Worker に SQL を送る */
function d1Proxy(url: string, token: string): Executor {
  async function post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(new URL(path, url), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
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
    query: ({ sql, params }) => post('query', { sql, params }),
    batch: (queries) =>
      post(
        'batch',
        queries.map(({ sql, params }) => ({ sql, params })),
      ),
  }
}

/** ローカルの SQLite ファイルを libsql で開く。サーバーの本番ビルドで読み込まないよう、使うときだけ import する */
async function localSqlite(url: string): Promise<Executor> {
  const { createClient } = await import('@libsql/client')
  const client = createClient({ url })
  // SQLite は接続ごとに有効にしないと、外部キーの制約も ON DELETE CASCADE も効かない (D1 は最初から有効)
  await client.execute('PRAGMA foreign_keys = ON')
  const toArgs = ({ sql, params }: Query) => ({ sql, args: params as never })
  // libsql の行は配列のようにも読めるので、列の値の配列に直す
  const rowsOf = (rows: ArrayLike<unknown>[]) =>
    rows.map((row) => Array.from(row))
  return {
    query: async (query) => rowsOf((await client.execute(toArgs(query))).rows),
    batch: async (queries) =>
      (await client.batch(queries.map(toArgs), 'write')).map((result) =>
        rowsOf(result.rows),
      ),
  }
}
