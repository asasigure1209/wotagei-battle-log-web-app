import { afterEach, describe, expect, it, vi } from 'vitest'
import { eventSeries } from '../../server/db/schema'

const proxyUrl = 'https://proxy.example/'

// client は読み込んだときに環境変数を読むので、変数を差し替えるたびに読み込み直す
async function loadClient(env: Record<string, string>) {
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value)
  vi.resetModules()
  return await import('../../server/db/client')
}

/** 中継 Worker の代わりに、受け取った要求を覚えて決まった応答を返す fetch を置く */
function stubFetch(response: () => Response) {
  const fetch = vi.fn(async (_url: URL, _init: RequestInit) => response())
  vi.stubGlobal('fetch', fetch)
  return fetch
}

function connectProxy() {
  return loadClient({
    NUXT_D1_PROXY_URL: proxyUrl,
    NUXT_D1_PROXY_TOKEN: 'secret',
  }).then((client) => client.connectDb())
}

/** fetch が受け取った送り先・method・ヘッダー・body */
function requestOf(fetch: ReturnType<typeof stubFetch>, index = 0) {
  const [url, init] = fetch.mock.calls[index] ?? []
  return {
    url: String(url),
    method: init?.method,
    headers: init?.headers,
    body: JSON.parse(String(init?.body)),
  }
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('usesD1Proxy・dbTarget', () => {
  it('中継 Worker の指定がなければ、ローカルのファイルを使う', async () => {
    const client = await loadClient({
      NUXT_DATABASE_URL: 'file:.data/other.sqlite',
      NUXT_D1_PROXY_URL: '',
    })
    expect(client.usesD1Proxy()).toBe(false)
    expect(client.dbCredentials.url).toBe('file:.data/other.sqlite')
    expect(client.dbTarget()).toBe('file:.data/other.sqlite')
  })

  it('中継 Worker の指定があれば、その URL を使う', async () => {
    const client = await loadClient({
      NUXT_D1_PROXY_URL: proxyUrl,
      NUXT_D1_PROXY_TOKEN: 'secret',
    })
    expect(client.usesD1Proxy()).toBe(true)
    expect(client.d1ProxyCredentials).toEqual({
      url: proxyUrl,
      token: 'secret',
    })
    expect(client.dbTarget()).toBe(proxyUrl)
  })
})

describe('connectDb (中継 Worker)', () => {
  it('SQL を /query にトークン付きで送り、返った行を Drizzle の結果にする', async () => {
    const fetch = stubFetch(() =>
      Response.json([
        ['a', 'シリーズ A'],
        ['b', 'シリーズ B'],
      ]),
    )
    const db = await connectProxy()

    expect(await db.select().from(eventSeries)).toEqual([
      { id: 'a', name: 'シリーズ A' },
      { id: 'b', name: 'シリーズ B' },
    ])
    const request = requestOf(fetch)
    expect(request.url).toBe('https://proxy.example/query')
    expect(request.method).toBe('POST')
    expect(request.headers).toMatchObject({
      authorization: 'Bearer secret',
      'content-type': 'application/json',
    })
    expect(request.body).toEqual({
      sql: expect.stringContaining('from "event_series"'),
      params: [],
    })
  })

  it('get は 1 行目だけを返す', async () => {
    stubFetch(() => Response.json([['a', 'シリーズ A']]))
    const db = await connectProxy()

    expect(await db.select().from(eventSeries).get()).toEqual({
      id: 'a',
      name: 'シリーズ A',
    })
  })

  it('get で行がなければ undefined', async () => {
    stubFetch(() => Response.json([]))
    const db = await connectProxy()

    expect(await db.select().from(eventSeries).get()).toBeUndefined()
  })

  it('batch は /batch にまとめて送り、結果を各クエリに対応させる', async () => {
    const fetch = stubFetch(() =>
      Response.json([[], [['a', 'シリーズ A']], [['b', 'シリーズ B']]]),
    )
    const db = await connectProxy()

    const [inserted, first, second] = await db.batch([
      db.insert(eventSeries).values({ id: 'a', name: 'シリーズ A' }),
      db.select().from(eventSeries),
      db.select().from(eventSeries).limit(1),
    ])
    expect(inserted).toEqual({ rows: [] })
    expect(first).toEqual([{ id: 'a', name: 'シリーズ A' }])
    expect(second).toEqual([{ id: 'b', name: 'シリーズ B' }])

    const request = requestOf(fetch)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(request.url).toBe('https://proxy.example/batch')
    expect(request.headers).toMatchObject({ authorization: 'Bearer secret' })
    expect(request.body).toEqual([
      {
        sql: expect.stringContaining('insert into "event_series"'),
        params: ['a', 'シリーズ A'],
      },
      { sql: expect.stringContaining('from "event_series"'), params: [] },
      { sql: expect.stringContaining('limit ?'), params: [1] },
    ])
  })

  it('中継 Worker がエラーを返したら、状態と本文を含めて失敗する', async () => {
    stubFetch(() => new Response('unauthorized', { status: 401 }))
    const db = await connectProxy()

    // Drizzle は失敗した SQL を添えた誤りで包むので、元の誤りは cause にある
    await expect(db.select().from(eventSeries)).rejects.toMatchObject({
      cause: new Error('D1 の中継 Worker がエラーを返した (401): unauthorized'),
    })
  })
})
