// 管理画面で使う DB の読み書き。画面の API (repository.ts) と違い、manifest と同じ形で返し、
// 管理画面がそのまま手直しして取り込み直せるようにする
import { and, asc, desc, eq, gt, notExists, sql } from 'drizzle-orm'
import {
  insertContents,
  insertEntries,
  insertVideos,
  type Manifest,
  upsertSeries,
} from '../db/manifest'
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

/** 登録済みのイベントか */
export async function hasAdminEvent(series: string, event: string) {
  const db = await useDb()
  const found = await db
    .select({ id: events.id })
    .from(events)
    .where(isEvent(series, event))
  return found.length > 0
}

/**
 * 登録済みのイベントの、エントリー・動画・出演者だけを入れ直す (管理画面のエントリーと動画の登録)。
 * シリーズ・イベントの行には触れないので、イベントの登録の画面で直した情報を上書きしない。
 * イベントがなければ (消されていれば)、外部キーで batch ごと失敗し、作り直さない
 */
export async function replaceAdminEventContents(manifest: Manifest) {
  const db = await useDb()
  const series = manifest.series.id
  const event = manifest.event.id
  await db.batch([
    // 出演者は、エントリー・動画を消すと ON DELETE CASCADE で消える
    db.delete(entries).where(inEvent(entries, series, event)),
    db.delete(videos).where(inEvent(videos, series, event)),
    ...insertContents(db, manifest),
  ])
}

/**
 * 登録済みのイベントの、動画と出演者だけを入れ直す (管理画面の動画の登録)。動画の No. は videos の並び順。
 * エントリー・シリーズ・イベントの行には触れず、1 つの batch で流す。
 * イベントがなければ (消されていれば)、出演者のエントリーがなければ、外部キーで batch ごと失敗する
 */
export async function replaceAdminEventVideos(
  series: string,
  event: string,
  rows: Manifest['videos'],
) {
  const db = await useDb()
  await db.batch([
    // 出演者は、動画を消すと ON DELETE CASCADE で消える
    db.delete(videos).where(inEvent(videos, series, event)),
    ...insertVideos(db, { seriesId: series, eventId: event }, rows),
  ])
}

/** そのイベントのエントリーの No. (No. 順) */
export async function listAdminEntryNos(series: string, event: string) {
  const db = await useDb()
  const rows = await db
    .select({ entryNo: entries.entryNo })
    .from(entries)
    .where(inEvent(entries, series, event))
    .orderBy(asc(entries.entryNo))
  return rows.map((r) => r.entryNo)
}

/** そのイベントの動画に出ているエントリー (No.・名前と、その動画のキー)。No. 順、同じ No. は動画の No. 順 */
export async function listPerformedEntries(series: string, event: string) {
  const db = await useDb()
  return db
    .select({
      entryNo: performers.entryNo,
      name: entries.name,
      key: videos.storageKey,
    })
    .from(performers)
    .innerJoin(
      entries,
      and(
        inEvent(entries, series, event),
        eq(entries.entryNo, performers.entryNo),
      ),
    )
    .innerJoin(
      videos,
      and(inEvent(videos, series, event), eq(videos.no, performers.videoNo)),
    )
    .where(inEvent(performers, series, event))
    .orderBy(asc(performers.entryNo), asc(performers.videoNo))
}

/**
 * 登録済みのイベントのエントリーだけを登録する (管理画面のエントリーの登録)。entries は No. を 1 から順に振ったもの
 * (parseEntryNamesBody の形)。ある No. は名前だけを書き換え、ない No. は足し、新しい一覧より後ろの No. は
 * (動画に出ていなければ) 消す。
 * エントリーを全部消してから入れると出演者も ON DELETE CASCADE で消えるので、残る No. の行は消さない。
 * 動画・出演者・イベントの行には触れず、1 つの batch で流す。イベントがなければ外部キーで batch ごと失敗する
 */
export async function saveAdminEntries(
  series: string,
  event: string,
  rows: Manifest['entries'],
) {
  const db = await useDb()
  const upserts = insertEntries(
    db,
    { seriesId: series, eventId: event },
    rows,
  ).map((insert) =>
    insert.onConflictDoUpdate({
      target: [entries.seriesId, entries.eventId, entries.entryNo],
      // 行ごとに名前が違うので、入れようとした値 (excluded) で書き換える
      set: { name: sql.raw(`excluded.${entries.name.name}`) },
    }),
  )
  await db.batch([
    db.delete(entries).where(
      and(
        inEvent(entries, series, event),
        gt(entries.entryNo, rows.length),
        // API は登録の前に、消える No. が動画に出ていないかを確かめるが、確かめてからここまでの間に
        // 動画の登録で出演者が付くことがある。そのまま消すと出演者も ON DELETE CASCADE で消えてしまうので、
        // 出演者のいない行だけを消す (出演者のいる行は残り、動画の登録の画面で外してから消し直す)
        notExists(
          db
            .select({ entryNo: performers.entryNo })
            .from(performers)
            .where(
              and(
                inEvent(performers, series, event),
                eq(performers.entryNo, entries.entryNo),
              ),
            ),
        ),
      ),
    ),
    ...upserts,
  ])
}

/** イベントを消す。エントリー・動画・出演者も一緒に消える (ON DELETE CASCADE)。R2 の動画は消さない */
export async function deleteAdminEvent(series: string, event: string) {
  const db = await useDb()
  await db.delete(events).where(isEvent(series, event))
}
