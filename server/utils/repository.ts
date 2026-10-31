// API が返すデータの取り出し口。API のハンドラはここだけを呼び、データの置き場所を知らない。
// DB の値 (数値の No.・秒・バイト) を、API が返す表示用の形に整える
import { and, asc, type Column, count, eq } from 'drizzle-orm'
import type { Db } from '../db/client'
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
        sameEvent(performers, entries),
        eq(performers.entryNo, entries.entryNo),
      ),
    )
    .where(inEvent(entries, series, event))
    .groupBy(entries.entryNo)
    .orderBy(asc(entries.entryNo))
  return rows.map(({ entryNo, ...rest }) => ({
    no: pad2(entryNo),
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
        and(inEvent(entries, series, event), eq(entries.entryNo, entryNo)),
      ),
    playerVideos(db, series, event, entryNo),
  ])
  if (!entry) return null

  return {
    no,
    name: entry.name,
    count: rows.length,
    // 動画の No. は、イベントの中での順番ではなく、このプレイヤーの何本目か
    videos: rows.map((v, i) => ({
      no: pad2(i + 1),
      file: v.fileName,
      duration: formatDuration(v.durationSec),
      mb: Math.round(v.sizeBytes / 1_000_000),
    })),
  }
}

/**
 * プレイヤーの、何本目か (videoNo。プレイヤー画面の動画の No. と同じ '02' の形) の動画の置き場所とファイル名。
 * いないプレイヤーや動画は null
 */
export async function getPlayerVideo(
  series: string,
  event: string,
  no: string,
  videoNo: string,
) {
  const entryNo = parseNo(no)
  const index = parseNo(videoNo)
  if (entryNo === null || index === null) return null

  const db = await useDb()
  const rows = await playerVideos(db, series, event, entryNo)
  const found = rows[index - 1]
  return found
    ? { storageKey: found.storageKey, fileName: found.fileName }
    : null
}

/** プレイヤーの出ている動画 (イベントの中での順番) */
function playerVideos(db: Db, series: string, event: string, entryNo: number) {
  return db
    .select({
      fileName: videos.fileName,
      storageKey: videos.storageKey,
      durationSec: videos.durationSec,
      sizeBytes: videos.sizeBytes,
    })
    .from(performers)
    .innerJoin(
      videos,
      and(sameEvent(videos, performers), eq(videos.no, performers.videoNo)),
    )
    .where(
      and(inEvent(performers, series, event), eq(performers.entryNo, entryNo)),
    )
    .orderBy(asc(videos.no))
}

/** イベントの中の表 (series_id・event_id を持つ表) */
type EventScoped = { seriesId: Column; eventId: Column }

/** その表の、指定したイベントの行だけ */
function inEvent(table: EventScoped, series: string, event: string) {
  return and(eq(table.seriesId, series), eq(table.eventId, event))
}

/** 2 つの表の行が、同じイベントのもの */
function sameEvent(a: EventScoped, b: EventScoped) {
  return and(eq(a.seriesId, b.seriesId), eq(a.eventId, b.eventId))
}

/** 5 → '05' */
function pad2(n: number) {
  return String(n).padStart(2, '0')
}

/** URL の No. ('05') を数に戻す。'5' や '005' のように整えた形と違うものは null */
function parseNo(no: string) {
  const n = Number(no)
  return Number.isInteger(n) && n > 0 && pad2(n) === no ? n : null
}

/** 192 → '03:12' */
function formatDuration(sec: number) {
  return `${pad2(Math.floor(sec / 60))}:${pad2(sec % 60)}`
}
