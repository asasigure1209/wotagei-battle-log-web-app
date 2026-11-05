// 管理画面で書いたエントリーと動画を、登録済みのイベントに取り込む (bun run db:import と同じく、そのイベントの分を入れ直す)。
// 本文は manifest の YAML を読んだ値と同じ形 (entries はエントリー No. をキーにした名前)。
// シリーズ・イベントの情報は本文のものを使わず、DB に登録済みのものを使う (未登録なら 400)。
// 取り込む前に、manifest の誤りと、動画が R2 に同じサイズで置かれているかをまとめて確かめる
import { importManifest } from '../../../db/manifest'

export default defineEventHandler(async (event) => {
  const body = parseManifestBody(await readBody(event))
  const manifest = withRegisteredEvent(
    body,
    await findAdminEventInfo(body.series.id, body.event.id),
  )
  const r2 = requireR2Upload(useRuntimeConfig(event).r2)
  const objects = await listObjects(
    r2,
    `${manifest.series.id}/${manifest.event.id}/`,
  )
  const problems = missingVideoProblems(manifest.videos, objects)
  if (problems.length) throw invalidManifest(problems)

  if (getQuery(event).dryRun) return { ok: true, dryRun: true }
  try {
    await importManifest(await useDb(), manifest)
  } catch (error) {
    // ほかのイベントと動画のキーが重なるなど、DB に弾かれたとき
    throw invalidManifest([`DB に取り込めませんでした: ${errorMessage(error)}`])
  }
  return { ok: true, dryRun: false }
})

function errorMessage(error: unknown) {
  const cause = error instanceof Error ? error.cause : undefined
  return String(
    cause instanceof Error
      ? cause.message
      : ((error as Error)?.message ?? error),
  )
}
