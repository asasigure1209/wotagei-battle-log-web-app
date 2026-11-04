// 管理画面で使う DB の読み出し。画面の API (repository.ts) と違い、manifest と同じ形で返し、
// 管理画面がそのまま手直しして取り込み直せるようにする
import { and, asc, desc, eq } from 'drizzle-orm'
import type { EventInfo, Manifest } from '../db/manifest'
import { entries, eventSeries, events, performers, videos } from '../db/schema'
// テスト (node 環境) からも読めるよう、Nitro の自動 import に頼らず明示する
import { useDb } from './db'
import { inEvent } from './repository'

/** その 1 つのイベントの行 */
function isEvent(series: string, event: string) {
  return and(eq(events.seriesId, series), eq(events.id, event))
}

/** 登録済みのイベントの一覧 (新しい開催日から) */
export async function listAdminEvents() {
  const db = await useDb()
  return db
    .select({
      seriesId: events.seriesId,
      seriesName: eventSeries.name,
      eventId: events.id,
      eventName: events.name,
      date: events.date,
      contact: events.contact,
    })
    .from(events)
    .innerJoin(eventSeries, eq(eventSeries.id, events.seriesId))
    .orderBy(desc(events.date))
}

/** 登録済みのイベントの情報 (シリーズとイベント)。ないイベントは null */
export async function getAdminEventInfo(
  series: string,
  event: string,
): Promise<EventInfo | null> {
  const db = await useDb()
  const [found] = await db
    .select({
      seriesName: eventSeries.name,
      name: events.name,
      date: events.date,
      contact: events.contact,
    })
    .from(events)
    .innerJoin(eventSeries, eq(eventSeries.id, events.seriesId))
    .where(isEvent(series, event))
  if (!found) return null
  return {
    series: { id: series, name: found.seriesName },
    event: {
      id: event,
      name: found.name,
      date: found.date,
      contact: found.contact,
    },
  }
}

/** 登録済みのイベントを、manifest と同じ形で。ないイベントは null */
export async function getAdminEvent(
  series: string,
  event: string,
): Promise<Manifest | null> {
  const db = await useDb()
  // D1 は中継 Worker を通すので、イベントがあるかを先に確かめず、4 つをまとめて引く
  const [[found], entryRows, videoRows, performerRows] = await Promise.all([
    db
      .select({
        seriesName: eventSeries.name,
        name: events.name,
        date: events.date,
        contact: events.contact,
      })
      .from(events)
      .innerJoin(eventSeries, eq(eventSeries.id, events.seriesId))
      .where(isEvent(series, event)),
    db
      .select({ entryNo: entries.entryNo, name: entries.name })
      .from(entries)
      .where(inEvent(entries, series, event))
      .orderBy(asc(entries.entryNo)),
    db
      .select({
        no: videos.no,
        key: videos.storageKey,
        durationSec: videos.durationSec,
        sizeBytes: videos.sizeBytes,
      })
      .from(videos)
      .where(inEvent(videos, series, event))
      .orderBy(asc(videos.no)),
    db
      .select({ videoNo: performers.videoNo, entryNo: performers.entryNo })
      .from(performers)
      .where(inEvent(performers, series, event))
      .orderBy(asc(performers.entryNo)),
  ])
  if (!found) return null

  const performersOf = Map.groupBy(performerRows, (p) => p.videoNo)
  return {
    series: { id: series, name: found.seriesName },
    event: {
      id: event,
      name: found.name,
      date: found.date,
      contact: found.contact,
    },
    entries: entryRows,
    videos: videoRows.map(({ no, ...video }) => ({
      ...video,
      performers: (performersOf.get(no) ?? []).map((p) => p.entryNo),
    })),
  }
}

/** イベントを消す。エントリー・動画・出演者も一緒に消える (ON DELETE CASCADE)。R2 の動画は消さない */
export async function deleteAdminEvent(series: string, event: string) {
  const db = await useDb()
  await db.delete(events).where(isEvent(series, event))
}
