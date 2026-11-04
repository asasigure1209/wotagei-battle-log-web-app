// 登録済みのイベントに、エントリー・動画・出演者を登録する (bun run db:import と同じく、そのイベントの分を入れ直す)。
// 本文は manifest の entries と videos (entries はエントリー No. をキーにした名前)。イベントの情報は DB から読む。
// 取り込む前に、manifest の誤りと、動画が R2 に同じサイズで置かれているかをまとめて確かめる
import type { H3Event } from 'h3'
import { importManifest, parseManifest } from '../../../../../db/manifest'

export default defineEventHandler(async (event) => {
  const manifest = await readContentsManifest(event)
  const r2 = requireR2Upload(useRuntimeConfig(event).r2)
  const objects = await listObjects(
    r2,
    `${manifest.series.id}/${manifest.event.id}/`,
  )
  const problems = missingVideoProblems(manifest.videos, objects)
  if (problems.length) throw invalidManifest(problems)

  if (getQuery(event).dryRun) return { ok: true, dryRun: true }
  try {
    // イベントの情報は、読んだあとに書き換えられていても戻さないよう触れない
    await importManifest(await useDb(), manifest, { keepEventInfo: true })
  } catch (error) {
    // ほかのイベントと動画のキーが重なるなど、DB に弾かれたとき
    throw invalidManifest([
      `DB に取り込めませんでした: ${dbErrorMessage(error)}`,
    ])
  }
  return { ok: true, dryRun: false }
})

/** DB のイベントの情報と、本文の entries・videos を合わせた manifest。イベントがなければ 404 */
async function readContentsManifest(event: H3Event) {
  const info = await getAdminEventInfo(
    getRouterParam(event, 'series') ?? '',
    getRouterParam(event, 'event') ?? '',
  )
  if (!info) {
    throw createError({
      status: 404,
      statusText: 'Event Not Found',
      message: 'イベントが登録されていません。先にイベントを登録してください',
    })
  }
  const body = (await readBody(event)) as Record<string, unknown> | null
  return parseOrBadRequest(() =>
    parseManifest({ ...info, entries: body?.entries, videos: body?.videos }),
  )
}
