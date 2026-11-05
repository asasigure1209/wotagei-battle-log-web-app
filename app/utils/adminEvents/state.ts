// イベントの登録画面の状態。Vue に依存しない関数として書き、form.ts が状態を reactive にして渡す
import type { EventSummary } from '~/utils/adminApi'
import {
  createOperationState,
  type OperationState,
} from '~/utils/adminCommon/operation'

export type EventForm = {
  seriesId: string
  seriesName: string
  eventId: string
  eventName: string
  date: string
  contact: string
}

export type EventFormState = OperationState & {
  form: EventForm
  /** 登録済みのイベントの一覧 */
  list: EventSummary[]
  /**
   * 直している登録済みのイベントのキー (`シリーズID/イベントID`)。新しいイベントを書いているときは空。
   * 空でないあいだは ID を変えられないので、どのイベントかはフォームの ID でもわかる
   */
  selectedKey: string
}

export function emptyForm(): EventForm {
  return {
    seriesId: '',
    seriesName: '',
    eventId: '',
    eventName: '',
    date: '',
    contact: '',
  }
}

export function createEventFormState(
  onUnauthorized: () => void,
): EventFormState {
  return {
    ...createOperationState(onUnauthorized),
    form: emptyForm(),
    list: [],
    selectedKey: '',
  }
}
