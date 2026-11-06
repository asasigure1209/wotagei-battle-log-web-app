// 管理画面のテストで共通に使う道具 (*.spec.ts ではないので、これ自体はテストとして流れない)
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError, type HTTPMethod } from 'h3'
import { createVideoEditorState } from '~/utils/adminVideos/state'

/** size バイトの動画のファイル */
export const videoFile = (name: string, size = 0) =>
  new File([new Uint8Array(size)], name)

/** 登録済みのイベントの一覧の 1 件 (シリーズ ID 's'・イベント ID 'e') */
export const registeredEvent = {
  seriesId: 's',
  seriesName: 'シリーズ',
  eventId: 'e',
  eventName: 'イベント',
  date: '2026-01-01',
  contact: '連絡先',
}

/** 登録済みのイベント (シリーズ ID 's'・イベント ID 'e') の情報 (manifest の series・event と同じ形) */
export const eventInfo = () => ({
  series: { id: 's', name: 'シリーズ' },
  event: { id: 'e', name: 'イベント', date: '2026-01-01', contact: '連絡先' },
})

/** 登録済みのイベント (シリーズ ID 's'・イベント ID 'e') を選んだエディターの状態 */
export function stateWithEvent() {
  const state = createVideoEditorState(() => {})
  state.event = eventInfo()
  return state
}

/**
 * 管理画面の偽の API を立てる。受けたリクエストは calls に `METHOD パス?クエリ` で残し、
 * unauthorized を true にすると 401 を返す。テストごとに reset で空に戻す
 */
export function fakeAdminApi(
  routes: { method: HTTPMethod; path: string; body: unknown }[],
) {
  const api = {
    calls: [] as string[],
    unauthorized: false,
    reset() {
      api.calls.length = 0
      api.unauthorized = false
    },
  }
  for (const { method, path, body } of routes) {
    registerEndpoint(path, {
      method,
      handler: (event) => {
        // registerEndpoint はパスの前に内部の接頭辞を付けるので、記録するパスは登録したものを使う
        const { search } = new URL(event.path, 'http://localhost')
        api.calls.push(`${method} ${path}${search}`)
        if (api.unauthorized) {
          throw createError({ status: 401, statusText: 'Unauthorized' })
        }
        return body
      },
    })
  }
  return api
}
