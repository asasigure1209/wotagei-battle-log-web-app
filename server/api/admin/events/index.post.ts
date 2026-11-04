// 管理画面で書いたイベントを DB に取り込む (bun run db:import と同じく、そのイベントの分を入れ直す)。
// 本文は manifest の YAML を読んだ値と同じ形 (entries はエントリー No. をキーにした名前)。
// 取り込む前に、manifest の誤りと、動画が R2 に同じサイズで置かれているかをまとめて確かめる
import { importManifest } from '../../../db/manifest'

export default defineEventHandler(async (event) => {
  const manifest = parseManifestBody(await readBody(event))
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
