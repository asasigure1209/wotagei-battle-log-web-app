// 管理画面の、登録済みのイベントを選ぶ画面で共通の処理 (登録済みのイベントの一覧と、選んだイベントの読み込み)。
// 何を読み込み、画面にどう書き写すかは画面ごとに EventLoader で渡す。
// Vue に依存しない関数として書き、各画面が状態を reactive にして渡す
import { adminApi, type EventIds, type EventSummary } from '~/utils/adminApi'
import type { Manifest } from '~~/server/db/manifest'
import { eventKey, parseEventKey } from './eventKey'
import {
  createOperationState,
  type OperationState,
  run,
  showErrors,
} from './operation'

/** 選んだイベントの情報 (manifest の series・event と同じ形) */
export type SelectedEvent = Pick<Manifest, 'series' | 'event'>

/** 登録済みのイベントを選ぶ画面の状態が持つもの */
export type EventSelectionState = OperationState & {
  /** 登録済みのイベントの一覧 */
  registeredEvents: EventSummary[]
  /** 選んだ登録済みのイベント。読み込めるまでは null */
  event: SelectedEvent | null
  /** イベントを選び直すたびに増やす。読み込みを待つ間に選び直したら、古い結果を捨てるのに使う */
  loadSeq: number
}

/** 選んだイベントの読み込み方。T は読み込んだ結果 */
export type EventLoader<S extends EventSelectionState, T> = {
  /** 選んだイベントについて読む */
  fetch: (ids: EventIds) => Promise<T>
  /** 読み込んだ結果から、選んだイベントの情報を取り出す (state.event に入れる) */
  toEvent: (data: T) => SelectedEvent
  /** 読み込めた結果を画面に書き写す。state.event を入れたあとに呼び、待つ間に選び直していたら呼ばない */
  fill: (state: S, data: T) => void
  /** 選んだイベントを外すときに、画面の内容を空に戻す */
  reset: (state: S) => void
}

export function createEventSelectionState(
  onUnauthorized: () => void,
): EventSelectionState {
  return {
    ...createOperationState(onUnauthorized),
    registeredEvents: [],
    event: null,
    loadSeq: 0,
  }
}

/** イベントの情報から、ID の組を取り出す */
export function eventIds({ series, event }: SelectedEvent): EventIds {
  return { seriesId: series.id, eventId: event.id }
}

/** 選んだイベントの ID の組。選んでいなければ null */
export function selectedIds(state: EventSelectionState): EventIds | null {
  return state.event ? eventIds(state.event) : null
}

/** 選んだイベントのキー (`シリーズID/イベントID`)。選んでいなければ空 */
export function selectedKey(state: EventSelectionState) {
  const ids = selectedIds(state)
  return ids ? eventKey(ids) : ''
}

/** 登録済みのイベントの一覧を読み直す。失敗したときは、ほかの操作と同じく画面にエラーを出して false */
export function reloadEvents(state: EventSelectionState) {
  return run(state, async () => {
    state.registeredEvents = await adminApi.listEvents()
  })
}

/** key (`シリーズID/イベントID`) のイベントが登録済みか */
export function hasEvent(state: EventSelectionState, key: string) {
  return state.registeredEvents.some((e) => eventKey(e) === key)
}

/** 選んだイベントと知らせを外し、画面の内容を空に戻す。読み込み中のイベントがあれば、その結果も使わない */
export function unselect<S extends EventSelectionState, T>(
  state: S,
  loader: EventLoader<S, T>,
) {
  state.loadSeq++
  state.event = null
  state.messages = null
  loader.reset(state)
}

/**
 * ids のイベントを読み込み、画面に書き写す。読み込む前に前のイベントを外すので、
 * 失敗しても、選んだものと違うイベントの中身が残ることはない
 */
export async function loadSelectedEvent<S extends EventSelectionState, T>(
  state: S,
  ids: EventIds,
  loader: EventLoader<S, T>,
) {
  unselect(state, loader)
  const seq = state.loadSeq
  await run(state, async () => {
    const data = await loader.fetch(ids)
    // 待っている間にほかのイベントを選び直していたら、この結果は使わない
    if (seq !== state.loadSeq) return
    state.event = loader.toEvent(data)
    loader.fill(state, data)
  })
}

/** 登録済みのイベントを選ぶ操作を、state と loader に束ねる */
export function eventSelection<S extends EventSelectionState, T>(
  state: S,
  loader: EventLoader<S, T>,
) {
  /** 登録済みのイベントを開く。key が空なら選んだイベントを外し、一覧になければそのことを知らせる */
  const open = async (key: string) => {
    if (!key) return unselect(state, loader)
    if (!hasEvent(state, key)) {
      return showErrors(state, [`登録済みのイベントに見つかりません: ${key}`])
    }
    await loadSelectedEvent(state, parseEventKey(key), loader)
  }
  return {
    reload: () => reloadEvents(state),
    open,
    /**
     * 画面を開いたときに呼ぶ。一覧を読み、initialEvent (`シリーズID/イベントID`) があれば開く。
     * 一覧を読めなければ開かない (開くと「見つかりません」で、読めなかった本当の誤りを上書きしてしまう)。
     * 一覧を読む間は選べない (選択肢がなく、読み終わるまで busy) ので、自分で選んだものを上書きすることはない
     */
    start: async (initialEvent = '') => {
      if ((await reloadEvents(state)) && initialEvent) await open(initialEvent)
    },
  }
}
