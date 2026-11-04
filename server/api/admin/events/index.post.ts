// イベントの情報 (シリーズとイベント) だけを登録する。登録済みのエントリー・動画・出演者には触れない
// (それらは [series]/[event]/contents.post.ts で登録する)。
// ?create=1 なら新しいイベントを作るだけにし、同じ ID のイベントがもうあれば書き換えずに 409 にする
// (画面の一覧を読めていなくても、登録済みのイベントを上書きしないように)。
// ないときは、なければ作り、あれば書き換える
import {
  createEventInfo,
  type EventInfo,
  parseEventInfo,
  saveEventInfo,
} from '../../../db/manifest'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const info = parseOrBadRequest(() => parseEventInfo(body))
  const create = !!getQuery(event).create
  try {
    await (create ? createEventInfo : saveEventInfo)(await useDb(), info)
  } catch (error) {
    if (create && (await exists(info))) throw alreadyExists(info)
    throw invalidManifest([
      `DB に登録できませんでした: ${dbErrorMessage(error)}`,
    ])
  }
  return { ok: true }
})

async function exists({ series, event }: EventInfo) {
  return !!(await getAdminEventInfo(series.id, event.id))
}

function alreadyExists({ series, event }: EventInfo) {
  const problem = `${series.id}/${event.id} はもう登録されています。直すときは、登録済みのイベントから選んでください`
  return createError({
    status: 409,
    statusText: 'Event Already Exists',
    message: problem,
    data: { problems: [problem] },
  })
}
