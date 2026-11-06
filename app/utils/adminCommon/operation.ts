// 管理画面のどの画面でも使う、API を呼ぶ操作の共通の処理 (待っている間の busy・画面の知らせ・ログイン切れ)。
// Vue に依存しない関数として書き、各画面が状態を reactive にして渡す
import { adminErrorMessages, isUnauthorized } from '~/utils/adminApi'

/** 「確認だけ」で誤りがなかったときの知らせ */
export const DRY_RUN_OK = '問題ありません。このまま登録できます'

/** エントリーや動画を DB に登録できたときの知らせ */
export const REGISTERED =
  '登録しました。公開ページは最大 1 時間とっておかれるので、すぐに出したいときは Vercel で本番を再デプロイしてください'

/** 画面の下に出す知らせ */
export type OperationMessages = { kind: 'error' | 'info'; lines: string[] }

/** 操作を動かす画面の状態が持つもの */
export type OperationState = {
  messages: OperationMessages | null
  /** API を待っているか */
  busy: boolean
  /** ログインが切れたときに呼ぶ */
  onUnauthorized: () => void
}

export function createOperationState(
  onUnauthorized: () => void,
): OperationState {
  return { messages: null, busy: false, onUnauthorized }
}

export function info(state: OperationState, ...lines: string[]) {
  state.messages = { kind: 'info', lines }
}

export function showErrors(state: OperationState, lines: string[]) {
  state.messages = { kind: 'error', lines }
}

/** busy にしてから fn を動かし、失敗したら画面にエラーを出す (ログインが切れていたらログインの画面に戻す) */
export async function run(state: OperationState, fn: () => Promise<void>) {
  state.busy = true
  try {
    await fn()
    return true
  } catch (error) {
    if (isUnauthorized(error)) state.onUnauthorized()
    showErrors(state, adminErrorMessages(error))
    return false
  } finally {
    state.busy = false
  }
}
