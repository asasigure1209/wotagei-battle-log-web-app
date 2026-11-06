// 管理画面のイベントの登録 (/api/admin/events/**) で共通に使う、リクエストの確かめ。
// テスト (node 環境) からも呼べるよう、Nitro の自動 import に頼らず明示する
import { createError } from 'h3'
import { MAX_PERFORMERS } from '../../shared/utils/performers'
import {
  type Manifest,
  ManifestError,
  parseEventInfo,
  parseVideoList,
  type VideoListScope,
} from '../db/manifest'

/** 誤りの一覧を持つ 400。画面は data.problems を 1 行ずつ出す */
export function invalidManifest(problems: string[]) {
  return createError({
    status: 400,
    statusText: 'Invalid Manifest',
    message: problems.join('\n'),
    data: { problems },
  })
}

/** parse が投げた ManifestError を 400 にして投げ直す */
function orInvalid<T>(parse: () => T) {
  try {
    return parse()
  } catch (error) {
    if (error instanceof ManifestError) throw invalidManifest(error.problems)
    throw error
  }
}

/**
 * パスの ID と本文 ({ seriesName, name, date, contact }) から、シリーズとイベントの情報を作る。
 * 誤りがあれば 400
 */
export function parseEventInfoBody(
  seriesId: string,
  eventId: string,
  body: unknown,
) {
  const { seriesName, ...event } = (body ?? {}) as Record<string, unknown>
  return orInvalid(() =>
    parseEventInfo({
      series: { id: seriesId, name: seriesName },
      event: { ...event, id: eventId },
    }),
  )
}

/** 未登録のイベントに、エントリーと動画を登録しようとしたときの 400 */
export function unregisteredEvent(seriesId: string, eventId: string) {
  return invalidManifest([
    `登録されていないイベントです (${seriesId}/${eventId})。先にイベントの登録の画面で登録してください`,
  ])
}

/**
 * エントリーだけの登録の本文 ({ names: 名前の配列 }) から、エントリーの一覧を作る。
 * エントリー No. は書いた順に 1 から振る。誤りがあれば、まとめて 400
 */
export function parseEntryNamesBody(body: unknown): Manifest['entries'] {
  const { names } = (body ?? {}) as Record<string, unknown>
  if (!Array.isArray(names)) {
    throw invalidManifest(['names は名前の配列で書いてください'])
  }
  if (!names.length)
    throw invalidManifest(['エントリーを 1 人以上書いてください'])
  const entries = names.map((name, i) => ({
    entryNo: i + 1,
    name: trimmedText(name),
  }))
  const problems = entries
    .filter((e) => !e.name)
    .map((e) => `${e.entryNo} 行目の名前を書いてください`)
  if (problems.length) throw invalidManifest(problems)
  return entries
}

/** 文字列なら前後の空白を除いたもの。文字列でなければ空 */
function trimmedText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

/** 動画に出ているエントリー (今 DB にある No.・名前と、その動画のキー) */
type PerformedEntry = { entryNo: number; name: string; key: string }

/**
 * 新しいエントリーの一覧から消える No. のうち、動画に出ているものを誤りの文にする。
 * 消すと出演者の紐づけも消えてしまうので、先に動画の登録の画面で出演者から外してもらう
 */
export function removedPerformerProblems(
  entries: Manifest['entries'],
  performed: PerformedEntry[],
) {
  const kept = new Set(entries.map((e) => e.entryNo))
  const removed = Map.groupBy(
    performed.filter((p) => !kept.has(p.entryNo)),
    (p) => p.entryNo,
  )
  return [...removed].map(
    ([entryNo, rows]) =>
      `エントリー No. ${entryNo} (${rows[0]?.name}) は動画に出ているので消せません: ${rows.map((r) => r.key).join(', ')}`,
  )
}

/**
 * 動画と出演者だけの登録の本文 ({ videos: [{ key, durationSec, sizeBytes, performers }] }) から、動画の一覧を作る。
 * prefix は `シリーズ ID/イベント ID/`、entryNos は DB に登録済みのエントリーの No.。
 * 出演者は 1〜2 人で、登録済みのエントリーの No. であること。誤りがあれば、まとめて 400。
 * 0 本の登録は、登録済みの動画をうっかり全部消さないよう弾く
 */
export function parseVideosBody(
  body: unknown,
  scope: Pick<VideoListScope, 'prefix' | 'entryNos'>,
): Manifest['videos'] {
  if (!scope.entryNos.length) {
    throw invalidManifest([
      'エントリーがまだ登録されていません。先にエントリーの登録の画面でエントリーを登録してください',
    ])
  }
  const { videos } = (body ?? {}) as Record<string, unknown>
  if (!Array.isArray(videos)) {
    throw invalidManifest(['videos は動画の配列で書いてください'])
  }
  if (!videos.length) throw invalidManifest(['動画を 1 本以上書いてください'])
  return orInvalid(() =>
    parseVideoList(videos, {
      ...scope,
      maxPerformers: MAX_PERFORMERS,
      entriesName: '登録済みのエントリー',
    }),
  )
}

/**
 * DB への書き込みを流し、DB に弾かれたら (確かめたあとにイベントが消された・ほかのイベントと動画のキーが重なるなど)
 * 500 ではなく、誤りの文を持つ 400 にする
 */
export async function invalidOnDbError<T>(write: () => Promise<T>) {
  try {
    return await write()
  } catch (error) {
    throw invalidManifest([
      `DB に登録できませんでした: ${errorMessage(error)}`,
      '確かめたあとにイベント・エントリー・動画が変わったかもしれません。画面を開き直してから、もう一度登録してください',
    ])
  }
}

/** DB のエラーの文。Drizzle は SQL を添えた文で包むので、原因 (cause) があればそちらを使う */
function errorMessage(error: unknown) {
  const cause = error instanceof Error ? error.cause : undefined
  return String(
    cause instanceof Error
      ? cause.message
      : ((error as Error)?.message ?? error),
  )
}
