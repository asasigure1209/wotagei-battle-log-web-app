// アプリ (Drizzle の sqlite-proxy) と DB の実行役 (ローカルの libsql・D1 の中継 Worker) の間で受け渡す形。
// 中継 Worker (workers/d1-proxy) も、この形で受け取って返す

export type RemoteMethod = 'run' | 'all' | 'values' | 'get'

export type RemoteQuery = {
  sql: string
  params: unknown[]
  method: RemoteMethod
}

/**
 * 実行結果。行は列の値の配列 (列名は Drizzle が付け直す)。
 * get は 1 行ぶん (なければ undefined)、run は空にする
 */
export type RemoteResult = { rows: unknown[] }

/** 行の並びを、method に合わせた結果にする */
export function toRemoteResult(
  rows: unknown[][],
  method: RemoteMethod,
): RemoteResult {
  if (method === 'run') return { rows: [] }
  // get で行がないときは undefined を返す (Drizzle の型は配列だが、ないことも受け付ける)
  return { rows: method === 'get' ? (rows[0] as unknown[]) : rows }
}
