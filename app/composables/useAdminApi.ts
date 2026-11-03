import type { UploadDeps } from '~/utils/multipartUpload'

/** 管理画面の API のエラーから、画面に出す文を取り出す (誤りの一覧があれば 1 行ずつ) */
export function adminErrorMessages(error: unknown): string[] {
  const e = error as {
    data?: { data?: { problems?: string[] }; message?: string }
    message?: string
  }
  const problems = e?.data?.data?.problems
  if (problems?.length) return problems
  return [e?.data?.message ?? e?.message ?? String(error)]
}

/** ログインが切れていたら (401) true */
export function isUnauthorized(error: unknown) {
  return (error as { statusCode?: number })?.statusCode === 401
}

/** 管理画面の API に JSON を POST する ($fetch は同じオリジンなので Cookie を載せる) */
export function adminPost<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  // パスを文字列のまま渡すと、Nitro のルートからの型の割り出しが深くなりすぎるので、型を付けずに呼ぶ
  const post = $fetch as (url: string, options: object) => Promise<T>
  return post(path, { method: 'POST', body })
}

/** 動画のアップロードで使う、API の呼び出しと R2 への PUT */
export const adminUploadDeps: UploadDeps = {
  post: adminPost,
  put: putWithXhr,
}
