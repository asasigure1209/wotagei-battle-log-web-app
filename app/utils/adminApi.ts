// 管理画面の API (/api/admin/**) の呼び出し。URL と、エラーの読み取りはここだけに書く。
// $fetch は同じオリジンに送るので、ログインの Cookie が載る

import { putWithXhr, type UploadDeps } from '~/utils/multipartUpload'
import type { EventInfo, Manifest } from '~~/server/db/manifest'
import type { listAdminEvents } from '~~/server/utils/admin-repository'

/** シリーズ ID とイベント ID の組 */
export type EventIds = { seriesId: string; eventId: string }

/** 登録済みのイベントの一覧の 1 件 (サーバーの listAdminEvents と同じ形) */
export type EventSummary = Awaited<ReturnType<typeof listAdminEvents>>[number]

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

/** 管理画面の API に JSON を POST する */
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

/** イベントの API。URL は series と event に分けて書くと、Nitro がルートの型 (DELETE など) を見つけられる */
export const adminApi = {
  listEvents: () => $fetch<EventSummary[]>('/api/admin/events'),
  getEvent: ({ seriesId, eventId }: EventIds) =>
    $fetch<Manifest>(`/api/admin/events/${seriesId}/${eventId}`),
  /** イベントの情報だけを登録する (なければ作り、あれば書き換える) */
  saveEventInfo: (info: EventInfo) =>
    $fetch('/api/admin/events', { method: 'POST', body: info }),
  /** 登録済みのイベントに、エントリー・動画を登録する。dryRun なら確かめるだけ */
  saveContents: (
    { seriesId, eventId }: EventIds,
    contents: { entries: Record<string, string>; videos: unknown[] },
    dryRun: boolean,
  ) =>
    $fetch(`/api/admin/events/${seriesId}/${eventId}/contents`, {
      method: 'POST',
      body: contents,
      query: dryRun ? { dryRun: 1 } : {},
    }),
  deleteEvent: ({ seriesId, eventId }: EventIds) =>
    $fetch(`/api/admin/events/${seriesId}/${eventId}`, { method: 'DELETE' }),
  /** イベントの R2 にある動画のキーとサイズ */
  listObjects: ({ seriesId, eventId }: EventIds) =>
    $fetch<{ key: string; size: number }[]>('/api/admin/objects', {
      query: { series: seriesId, event: eventId },
    }),
}
