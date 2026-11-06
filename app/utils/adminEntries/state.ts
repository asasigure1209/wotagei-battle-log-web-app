// エントリーの登録画面の状態。Vue に依存しない関数として書き、form.ts が状態を reactive にして渡す
import {
  createEventSelectionState,
  type EventSelectionState,
} from '~/utils/adminCommon/eventSelection'

/**
 * エントリーの登録画面の状態。選んだ登録済みのイベント (EventSelectionState の event) に、
 * 書いた名前をエントリーとして登録する
 */
export type EntriesFormState = EventSelectionState & {
  /** 1 行に 1 人の名前。エントリー No. は書いた順に 1 から付く */
  namesText: string
  /**
   * 読み込んだエントリーの No. が 1 から抜けなく並んでいないときの誤り (なければ空)。
   * この画面で登録すると No. が振り直されて出演者がずれるので、あるあいだは登録できない
   */
  entryNosProblem: string
  /**
   * 選んだイベントに登録できた文 (確認だけのときは変えない)。登録していないか、そのあとの登録に失敗したら null。
   * 選び直すと null に戻す
   */
  savedNamesText: string | null
}

export function createEntriesFormState(
  onUnauthorized: () => void,
): EntriesFormState {
  return {
    ...createEventSelectionState(onUnauthorized),
    namesText: '',
    entryNosProblem: '',
    savedNamesText: null,
  }
}
