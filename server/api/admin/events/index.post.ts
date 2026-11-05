// 管理画面で書いたエントリーと動画を、登録済みのイベントに取り込む (そのイベントのエントリー・動画・出演者を入れ直す)。
// 本文は manifest の YAML を読んだ値と同じ形 (entries はエントリー No. をキーにした名前)。
// シリーズ・イベントの行には触れず (情報はイベントの登録の画面で直す)、未登録のイベントなら 400。
// 取り込む前に、manifest の誤りと、動画が R2 に同じサイズで置かれているかをまとめて確かめる
import { importEventContents } from '../../../db/manifest'

export default defineEventHandler(async (event) => {
  const manifest = parseManifestBody(await readBody(event))
  const r2 = requireR2Upload(useRuntimeConfig(event).r2)
  const { id: seriesId } = manifest.series
  const { id: eventId } = manifest.event
  // D1 と R2 は別々に引けるので、待ち合わせずに並べて引く
  const [registered, objects] = await Promise.all([
    hasAdminEvent(seriesId, eventId),
    listObjects(r2, `${seriesId}/${eventId}/`),
  ])
  requireRegisteredEvent(manifest, registered)
  const problems = missingVideoProblems(manifest.videos, objects)
  if (problems.length) throw invalidManifest(problems)

  if (getQuery(event).dryRun) return { ok: true, dryRun: true }
  try {
    // 確かめたあとにイベントが消されていたら、外部キーで弾かれてここに来る
    await importEventContents(await useDb(), manifest)
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
