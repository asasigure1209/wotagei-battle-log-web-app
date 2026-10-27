// D1 の中継 Worker。Vercel のアプリ (server/db/client.ts) から SQL を受け取り、D1 で実行して返す。
// D1 は Workers の中からしか直接つなげず、Cloudflare の REST API は管理用で呼び出し回数の上限が厳しいため、間に立てる。
// SQL をそのまま流すので、トークン (PROXY_TOKEN) を知っているのはアプリのサーバーだけにする
import {
  type RemoteQuery,
  type RemoteResult,
  toRemoteResult,
} from '../../../server/db/remote'

type Env = {
  DB: D1Database
  PROXY_TOKEN: string
}

export default {
  async fetch(request, env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 })
    }
    if (!isAuthorized(request, env.PROXY_TOKEN)) {
      return new Response('Unauthorized', { status: 401 })
    }

    try {
      const { pathname } = new URL(request.url)
      if (pathname === '/query') {
        return Response.json(await query(env.DB, await request.json()))
      }
      if (pathname === '/batch') {
        return Response.json(await batch(env.DB, await request.json()))
      }
      return new Response('Not Found', { status: 404 })
    } catch (error) {
      // SQL のエラーは、アプリ側で原因がわかるよう本文に載せる
      return new Response(String(error), { status: 500 })
    }
  },
} satisfies ExportedHandler<Env>

function isAuthorized(request: Request, token: string) {
  if (!token) return false
  const encoder = new TextEncoder()
  const provided = encoder.encode(request.headers.get('authorization') ?? '')
  const expected = encoder.encode(`Bearer ${token}`)
  // 長さが違うと timingSafeEqual が例外を投げるので先に比べる
  return (
    provided.byteLength === expected.byteLength &&
    crypto.subtle.timingSafeEqual(provided, expected)
  )
}

async function query(
  db: D1Database,
  { sql, params, method }: RemoteQuery,
): Promise<RemoteResult> {
  const statement = db.prepare(sql).bind(...params)
  if (method === 'run') {
    await statement.run()
    return toRemoteResult([], method)
  }
  return toRemoteResult(await statement.raw(), method)
}

/** D1 の batch は、まとめて 1 つのトランザクションで実行する */
async function batch(
  db: D1Database,
  queries: RemoteQuery[],
): Promise<RemoteResult[]> {
  const results = await db.batch(
    queries.map(({ sql, params }) => db.prepare(sql).bind(...params)),
  )
  // batch では列の値の配列 (raw) で受け取れないので、行のオブジェクトの値を列の順に並べる。
  // そのため、batch で同じ名前の列を 2 つ以上 select すると、片方しか返らない
  return results.map((result, i) =>
    toRemoteResult(
      result.results.map((row) => Object.values(row as object)),
      queries[i]?.method ?? 'all',
    ),
  )
}
