// イベントごとのデータファイル (manifest) を確かめて、DB に取り込む。
// manifest は動画アップロード用のリポジトリ (wotagei-battle-log-video-uploader) の mise manifest が雛形を書き出し、
// イベント情報・エントリー・出演者を人が書き込んだ YAML。形を変えるときは mise manifest も揃える
import { readFile } from 'node:fs/promises'
import { and, eq } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import { parse } from 'yaml'
import { isId } from '../../shared/utils/id'
import type { Db } from './client'
import { entries, eventSeries, events, performers, videos } from './schema'

export type Manifest = {
  series: { id: string; name: string }
  event: { id: string; name: string; date: string; contact: string }
  entries: { entryNo: number; name: string }[]
  videos: {
    key: string
    durationSec: number
    sizeBytes: number
    performers: number[]
  }[]
}

/** manifest の誤り。人が直せるよう、見つけた誤りをまとめて持つ */
export class ManifestError extends Error {
  constructor(readonly problems: string[]) {
    super(
      `manifest に誤りがあります:\n${problems.map((p) => `- ${p}`).join('\n')}`,
    )
  }
}

/** manifest の YAML ファイルを読んで確かめる。誤りがあれば ManifestError を投げる */
export async function readManifest(file: string | URL) {
  return parseManifest(parse(await readFile(file, 'utf8')))
}

/** YAML を読んだ値を確かめて Manifest にする。誤りがあれば ManifestError を投げる */
export function parseManifest(data: unknown): Manifest {
  const check = new Checker()
  const root = asRecord(data)
  const series = parseSeries(root.series, check)
  const event = parseEvent(root.event, check)
  const entries = parseEntries(root.entries, check)
  const videos = parseVideos(root.videos, check, {
    prefix: `${series.id}/${event.id}/`,
    entryNos: new Set(entries.map((e) => e.entryNo)),
  })

  if (check.problems.length) throw new ManifestError(check.problems)
  return { series, event, entries, videos }
}

/** 値を確かめ、誤りを problems に溜めていく。誤った値の代わりには空の値を返す */
class Checker {
  readonly problems: string[] = []

  push(problem: string) {
    this.problems.push(problem)
  }

  id(value: unknown, path: string) {
    if (isId(value)) return value
    this.push(`${path} は英数字と _ - だけで書いてください`)
    return ''
  }

  text(value: unknown, path: string) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    this.push(`${path} を書いてください`)
    return ''
  }

  count(value: unknown, path: string) {
    if (Number.isInteger(value) && (value as number) >= 0)
      return value as number
    this.push(`${path} は 0 以上の整数で書いてください`)
    return 0
  }
}

/** 動画を確かめるのに使う、manifest のほかの部分から決まる値 */
type VideoScope = {
  /** key が始まるはずの `シリーズ ID/イベント ID/` */
  prefix: string
  entryNos: Set<number>
}

function parseSeries(value: unknown, check: Checker): Manifest['series'] {
  const series = asRecord(value)
  return {
    id: check.id(series.id, 'series.id'),
    name: check.text(series.name, 'series.name'),
  }
}

function parseEvent(value: unknown, check: Checker): Manifest['event'] {
  const event = asRecord(value)
  const result = {
    id: check.id(event.id, 'event.id'),
    name: check.text(event.name, 'event.name'),
    date: check.text(event.date, 'event.date'),
    contact: check.text(event.contact, 'event.contact'),
  }
  if (result.date && !isDate(result.date)) {
    check.push(`event.date は YYYY-MM-DD で書いてください: ${result.date}`)
  }
  return result
}

function parseEntries(value: unknown, check: Checker): Manifest['entries'] {
  const result: Manifest['entries'] = []
  // YAML のキーは文字列で読まれるので、エントリー No. は数に直す
  for (const [no, name] of Object.entries(asRecord(value))) {
    const entryNo = Number(no)
    if (!/^\d+$/.test(no) || entryNo < 1) {
      check.push(
        `entries のエントリー No. は 1 以上の整数で書いてください: ${no}`,
      )
      continue
    }
    result.push({ entryNo, name: check.text(name, `entries.${no}`) })
  }
  result.sort((a, b) => a.entryNo - b.entryNo)
  if (!result.length) check.push('entries を書いてください')
  return result
}

function parseVideos(
  value: unknown,
  check: Checker,
  { prefix, entryNos }: VideoScope,
): Manifest['videos'] {
  const rawVideos = Array.isArray(value) ? value : []
  if (!rawVideos.length) check.push('videos がありません')
  // ここまでに出てきた key。重なりを見つけるのに使う
  const keys = new Set<string>()
  return rawVideos.map((raw, i) => {
    const video = asRecord(raw)
    const path = `videos[${i}]`
    const key = videoKey(video.key, `${path}.key`, check, prefix, keys)
    return {
      key,
      durationSec: check.count(video.durationSec, `${path}.durationSec`),
      sizeBytes: check.count(video.sizeBytes, `${path}.sizeBytes`),
      performers: performerList(
        video.performers,
        `${path}.performers`,
        key,
        check,
        entryNos,
      ),
    }
  })
}

function videoKey(
  value: unknown,
  path: string,
  check: Checker,
  prefix: string,
  keys: Set<string>,
) {
  const key = check.text(value, path)
  if (key && !key.startsWith(prefix)) {
    check.push(`${path} は ${prefix} で始まるはずです: ${key}`)
  }
  if (keys.has(key)) check.push(`${path} が重なっています: ${key}`)
  keys.add(key)
  return key
}

function performerList(
  value: unknown,
  path: string,
  key: string,
  check: Checker,
  entryNos: Set<number>,
) {
  const nos: number[] = Array.isArray(value) ? value : []
  if (!nos.length) {
    check.push(`${path} に、出ているエントリー No. を書いてください (${key})`)
  }
  for (const no of nos.filter((no) => !entryNos.has(no))) {
    check.push(`${path} の ${no} は entries にありません (${key})`)
  }
  if (new Set(nos).size !== nos.length) {
    check.push(`${path} に同じエントリー No. が重なっています (${key})`)
  }
  return nos
}

/**
 * manifest のイベントを DB に入れ直す。そのイベントのエントリー・動画・出演者は ON DELETE CASCADE で消してから入れ、
 * 同じシリーズのほかのイベントには触れない。D1 は複数のリクエストにまたがるトランザクションを使えないので、
 * 1 つの batch (= 1 つのトランザクション) で流し、途中で失敗しても半端な状態を残さない
 */
export async function importManifest(db: Db, manifest: Manifest) {
  const seriesId = manifest.series.id
  const eventId = manifest.event.id
  const event = { seriesId, eventId }
  const videoRows = manifest.videos.map((v, i) => ({
    ...event,
    no: i + 1,
    fileName: v.key.slice(v.key.lastIndexOf('/') + 1),
    storageKey: v.key,
    durationSec: v.durationSec,
    sizeBytes: v.sizeBytes,
  }))
  const performerRows = manifest.videos.flatMap((v, i) =>
    v.performers.map((entryNo) => ({ ...event, entryNo, videoNo: i + 1 })),
  )

  const statements: BatchItem<'sqlite'>[] = [
    db
      .insert(eventSeries)
      .values(manifest.series)
      .onConflictDoUpdate({
        target: eventSeries.id,
        set: { name: manifest.series.name },
      }),
    db
      .delete(events)
      .where(and(eq(events.seriesId, seriesId), eq(events.id, eventId))),
    db.insert(events).values({ ...manifest.event, seriesId }),
    ...chunks(manifest.entries.map((e) => ({ ...event, ...e }))).map((rows) =>
      db.insert(entries).values(rows),
    ),
    ...chunks(videoRows).map((rows) => db.insert(videos).values(rows)),
    ...chunks(performerRows).map((rows) => db.insert(performers).values(rows)),
  ]
  await db.batch(statements as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]])
}

/** D1 は 1 つの SQL に渡せる値が 100 個までなので、insert する行をそれに収まるよう分ける */
function chunks<T extends object>(rows: T[]) {
  const first = rows[0]
  if (!first) return []
  const size = Math.floor(100 / Object.keys(first).length)
  const result: T[][] = []
  for (let i = 0; i < rows.length; i += size) {
    result.push(rows.slice(i, i + size))
  }
  return result
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

/** YYYY-MM-DD で、実際にある日付 (2 月 30 日などは日付が繰り越されて形が変わるので弾ける) */
function isDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`)
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(date.getTime()) &&
    date.toISOString().startsWith(value)
  )
}
