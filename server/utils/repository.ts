// API が返すデータの取り出し口。API のハンドラはここだけを呼び、データの置き場所を知らない。
// DB の値 (数値の No.・秒・バイト) を、API が返す表示用の形に整える
import { and, asc, count, eq } from 'drizzle-orm'
import { entries, events, performers, videos } from '../db/schema'
// テスト (node 環境) からも読めるよう、Nitro の自動 import に頼らず明示する
import { useDb } from './db'

/** イベントの情報 (名前・開催日・運営の連絡先)。ないイベントは null */
export async function getEvent(series: string, event: string) {
  const db = await useDb()
  const [found] = await db
    .select({ title: events.name, date: events.date, contact: events.contact })
    .from(events)
    .where(and(eq(events.seriesId, series), eq(events.id, event)))
  return found ?? null
}

/** イベントの出場プレイヤー (エントリー No. 順) と、それぞれの動画の本数 */
export async function listPlayers(series: string, event: string) {
  const db = await useDb()
  const rows = await db
    .select({
      entryNo: entries.entryNo,
      name: entries.name,
      count: count(performers.videoNo),
    })
    .from(entries)
    .leftJoin(
      performers,
      and(
        eq(performers.seriesId, entries.seriesId),
        eq(performers.eventId, entries.eventId),
        eq(performers.entryNo, entries.entryNo),
      ),
    )
    .where(and(eq(entries.seriesId, series), eq(entries.eventId, event)))
    .groupBy(entries.entryNo)
    .orderBy(asc(entries.entryNo))
  return rows.map(({ entryNo, ...rest }) => ({
    no: formatNo(entryNo),
    ...rest,
  }))
}

/** プレイヤーと、その動画。いないプレイヤーは null */
export async function getPlayer(series: string, event: string, no: string) {
  const entryNo = parseNo(no)
  if (entryNo === null) return null

  const db = await useDb()
  const [[entry], rows] = await Promise.all([
    db
      .select({ name: entries.name })
      .from(entries)
      .where(
        and(
          eq(entries.seriesId, series),
          eq(entries.eventId, event),
          eq(entries.entryNo, entryNo),
        ),
      ),
    db
      .select({
        fileName: videos.fileName,
        durationSec: videos.durationSec,
        sizeBytes: videos.sizeBytes,
      })
      .from(performers)
      .innerJoin(
        videos,
        and(
          eq(videos.seriesId, performers.seriesId),
          eq(videos.eventId, performers.eventId),
          eq(videos.no, performers.videoNo),
        ),
      )
      .where(
        and(
          eq(performers.seriesId, series),
          eq(performers.eventId, event),
          eq(performers.entryNo, entryNo),
        ),
      )
      .orderBy(asc(videos.no)),
  ])
  if (!entry) return null

  return {
    no,
    name: entry.name,
    count: rows.length,
    // 動画の No. は、イベントの中での順番ではなく、このプレイヤーの何本目か
    videos: rows.map((v, i) => ({
      no: formatNo(i + 1),
      file: v.fileName,
      duration: formatDuration(v.durationSec),
      mb: Math.round(v.sizeBytes / 1_000_000),
    })),
  }
}

/** 5 → '05' */
function formatNo(no: number) {
  return String(no).padStart(2, '0')
}

/** URL の No. ('05') を数に戻す。'5' や '005' のように整えた形と違うものは null */
function parseNo(no: string) {
  const n = Number(no)
  return Number.isInteger(n) && n > 0 && formatNo(n) === no ? n : null
}

/** 192 → '03:12' */
function formatDuration(sec: number) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`
}
