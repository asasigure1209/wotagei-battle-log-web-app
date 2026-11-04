// 管理画面の登録の API (/api/admin/events/**) で共通に使う、誤りの返し方
// テスト (node 環境) からも呼べるよう、Nitro の自動 import に頼らず明示する
import { createError } from 'h3'
import { ManifestError } from '../db/manifest'

/** 誤りの一覧を 400 にする。画面は data.problems を 1 行ずつ出す */
export function invalidManifest(problems: string[]) {
  return createError({
    status: 400,
    statusText: 'Invalid Manifest',
    message: problems.join('\n'),
    data: { problems },
  })
}

/** parse を動かし、ManifestError なら 400 にする */
export function parseOrBadRequest<T>(parse: () => T): T {
  try {
    return parse()
  } catch (error) {
    if (error instanceof ManifestError) throw invalidManifest(error.problems)
    throw error
  }
}

/** DB に弾かれたときのエラーから、画面に出す文を取り出す (libsql などは元のエラーを cause に持つ) */
export function dbErrorMessage(error: unknown) {
  const cause = error instanceof Error ? error.cause : undefined
  return String(
    cause instanceof Error
      ? cause.message
      : ((error as Error)?.message ?? error),
  )
}
