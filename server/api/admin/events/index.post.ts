// イベントの情報 (シリーズとイベント) だけを登録する。なければ作り、あれば書き換える。
// 登録済みのエントリー・動画・出演者には触れない (それらは [series]/[event]/contents.post.ts で登録する)
import { parseEventInfo, saveEventInfo } from '../../../db/manifest'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const info = parseOrBadRequest(() => parseEventInfo(body))
  try {
    await saveEventInfo(await useDb(), info)
  } catch (error) {
    throw invalidManifest([
      `DB に登録できませんでした: ${dbErrorMessage(error)}`,
    ])
  }
  return { ok: true }
})
