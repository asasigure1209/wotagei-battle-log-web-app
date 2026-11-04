// 管理画面で使う DB の読み書き。画面の API (repository.ts) と違い、manifest と同じ形で返し、
// 管理画面がそのまま手直しして取り込み直せるようにする
import { and, asc, desc, eq } from 'drizzle-orm'
import { type Manifest, upsertSeries } from '../db/manifest'
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

/**
 * シリーズとイベントの情報だけを登録する (あれば書き換える)。importManifest と違ってイベントを消さないので、
 * 登録済みのエントリー・動画・出演者はそのまま残る。D1 で半端な状態を残さないよう 1 つの batch で流す
 */
export async function saveAdminEventInfo({
  series,
  event,
}: Pick<Manifest, 'series' | 'event'>) {
  const db = await useDb()
  await db.batch([
    upsertSeries(db, series),
    db
      .insert(events)
      .values({ ...event, seriesId: series.id })
      .onConflictDoUpdate({ target: [events.seriesId, events.id], set: event }),
  ])
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
