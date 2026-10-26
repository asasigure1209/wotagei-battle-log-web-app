// DB のスキーマ。表と列の名前は、最初に作った DB の論理設計にそろえる。
// 主キーは URL の ID (series・event) とエントリー No. を組み合わせた複合キーにし、
// URL から JOIN なしで引けるようにする。どの表も、親を消せば一緒に消える
import {
  foreignKey,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core'

/** イベントシリーズ */
export const eventSeries = sqliteTable('event_series', {
  /** URL の series (例: elnino) */
  id: text().primaryKey(),
  name: text().notNull(),
})

/** イベント */
export const events = sqliteTable(
  'events',
  {
    seriesId: text('series_id')
      .notNull()
      .references(() => eventSeries.id, { onDelete: 'cascade' }),
    /** URL の event (例: elnino_vol_5) */
    id: text().notNull(),
    name: text().notNull(),
    /** 開催日 (YYYY-MM-DD) */
    date: text().notNull(),
    /** 運営の連絡先 */
    contact: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.seriesId, t.id] })],
)

/** イベントへのエントリー。画面でいう「プレイヤー」 */
export const entries = sqliteTable(
  'entries',
  {
    seriesId: text('series_id').notNull(),
    eventId: text('event_id').notNull(),
    entryNo: integer('entry_no').notNull(),
    name: text().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.seriesId, t.eventId, t.entryNo] }),
    foreignKey({
      columns: [t.seriesId, t.eventId],
      foreignColumns: [events.seriesId, events.id],
    }).onDelete('cascade'),
  ],
)

/** イベントで撮った動画 */
export const videos = sqliteTable(
  'videos',
  {
    seriesId: text('series_id').notNull(),
    eventId: text('event_id').notNull(),
    /** イベントの中での順番 */
    no: integer().notNull(),
    fileName: text('file_name').notNull(),
    /** ストレージ上の置き場所 */
    storageKey: text('storage_key').notNull().unique(),
    durationSec: integer('duration_sec').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.seriesId, t.eventId, t.no] }),
    foreignKey({
      columns: [t.seriesId, t.eventId],
      foreignColumns: [events.seriesId, events.id],
    }).onDelete('cascade'),
  ],
)

/** 動画に出ているエントリー。バトルの動画には 2 人が出る */
export const performers = sqliteTable(
  'performers',
  {
    seriesId: text('series_id').notNull(),
    eventId: text('event_id').notNull(),
    entryNo: integer('entry_no').notNull(),
    videoNo: integer('video_no').notNull(),
  },
  (t) => [
    primaryKey({
      columns: [t.seriesId, t.eventId, t.entryNo, t.videoNo],
    }),
    foreignKey({
      columns: [t.seriesId, t.eventId, t.entryNo],
      foreignColumns: [entries.seriesId, entries.eventId, entries.entryNo],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.seriesId, t.eventId, t.videoNo],
      foreignColumns: [videos.seriesId, videos.eventId, videos.no],
    }).onDelete('cascade'),
  ],
)
