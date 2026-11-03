// 管理画面で書いたイベントを DB に取り込む (bun run db:import と同じく、そのイベントの分を入れ直す)。
// 本文は manifest の YAML を読んだ値と同じ形 (entries はエントリー No. をキーにした名前)。
// 取り込む前に、manifest の誤りと、動画が R2 に同じサイズで置かれているかをまとめて確かめる
import {
  importManifest,
  ManifestError,
  parseManifest,
} from '../../../db/manifest'

export default defineEventHandler(async (event) => {
  const manifest = parseOrFail(await readBody(event))
  const r2 = requireR2Upload(useRuntimeConfig(event).r2)
  const objects = await listObjects(
    r2,
    `${manifest.series.id}/${manifest.event.id}/`,
  )
  const problems = missingVideoProblems(manifest.videos, objects)
  if (problems.length) throw invalid(problems)

  if (getQuery(event).dryRun) return { ok: true, dryRun: true }
  try {
    await importManifest(await useDb(), manifest)
  } catch (error) {
    // ほかのイベントと動画のキーが重なるなど、DB に弾かれたとき
    throw invalid([`DB に取り込めませんでした: ${errorMessage(error)}`])
  }
  return { ok: true, dryRun: false }
})

function parseOrFail(body: unknown) {
  try {
    return parseManifest(body)
  } catch (error) {
    if (error instanceof ManifestError) throw invalid(error.problems)
    throw error
  }
}

function invalid(problems: string[]) {
  return createError({
    status: 400,
    statusText: 'Invalid Manifest',
    message: problems.join('\n'),
    data: { problems },
  })
}

function errorMessage(error: unknown) {
  const cause = error instanceof Error ? error.cause : undefined
  return String(
    cause instanceof Error
      ? cause.message
      : ((error as Error)?.message ?? error),
  )
}
