<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const emit = defineEmits<{
  /** ログインが切れたとき */
  unauthorized: []
}>()

const { state, entries, targets } = useAdminEventEditor(() =>
  emit('unauthorized'),
)
const ed = adminEditor

type EventSummary = {
  seriesId: string
  seriesName: string
  eventId: string
  eventName: string
  date: string
}
const events = ref<EventSummary[]>([])
/** 選んでいる登録済みのイベント (`シリーズID/イベントID`)。新しく作るときは空 */
const selected = ref('')
const category = ref('')
const confirmDelete = ref(false)

async function loadEvents() {
  try {
    events.value = await $fetch<EventSummary[]>('/api/admin/events')
  } catch (error) {
    if (isUnauthorized(error)) emit('unauthorized')
  }
}
onMounted(loadEvents)

async function onSelectEvent() {
  confirmDelete.value = false
  const [series, event] = selected.value.split('/')
  if (series && event) await ed.loadEvent(state, series, event)
  else ed.reset(state)
}

async function onPickFiles(e: Event) {
  const input = e.target as HTMLInputElement
  await ed.addFiles(state, Array.from(input.files ?? []), category.value)
  input.value = ''
  if (!state.remote) await ed.refreshRemote(state)
}

async function onRegister(dryRun: boolean) {
  const ok = await ed.register(state, dryRun)
  if (ok && !dryRun) {
    await loadEvents()
    selected.value = `${state.form.seriesId}/${state.form.eventId}`
  }
}

async function onDelete() {
  confirmDelete.value = !confirmDelete.value
  if (confirmDelete.value) return
  if (await ed.deleteEvent(state)) {
    selected.value = ''
    await loadEvents()
  }
}

const idsValid = computed(() => ed.idsValid(state))
const busy = computed(() => !!state.busy)
const totalUploadBytes = computed(() =>
  targets.value.reduce((n, r) => n + r.sizeBytes, 0),
)
const currentKey = computed(
  () => `${state.form.seriesId}/${state.form.eventId}`,
)
const isRegistered = computed(() =>
  events.value.some((e) => `${e.seriesId}/${e.eventId}` === currentKey.value),
)
const canRegister = computed(
  () =>
    idsValid.value &&
    state.rows.length > 0 &&
    !busy.value &&
    state.rows.every((r) => ed.rowState(r, state.remote).kind === 'ok'),
)
</script>

<template>
  <div class="editor">
    <section class="card">
      <h2 class="heading">1. イベント</h2>
      <label class="field">
        <span>登録済みのイベントを直す</span>
        <select v-model="selected" :disabled="busy" @change="onSelectEvent">
          <option value="">新しいイベントを作る</option>
          <option
            v-for="e in events"
            :key="`${e.seriesId}/${e.eventId}`"
            :value="`${e.seriesId}/${e.eventId}`"
          >
            {{ e.date }} {{ e.seriesName }} / {{ e.eventName }} ({{
              e.seriesId
            }}/{{ e.eventId }})
          </option>
        </select>
      </label>
      <div class="grid">
        <label class="field">
          <span>シリーズ ID (英数字と _ -)</span>
          <input
            v-model.trim="state.form.seriesId"
            placeholder="elnino"
            :disabled="!!selected"
            @change="ed.refreshRemote(state)"
          >
        </label>
        <label class="field">
          <span>シリーズ名</span>
          <input v-model="state.form.seriesName" placeholder="エルニーニョ">
        </label>
        <label class="field">
          <span>イベント ID (英数字と _ -)</span>
          <input
            v-model.trim="state.form.eventId"
            placeholder="elnino_vol_5"
            :disabled="!!selected"
            @change="ed.refreshRemote(state)"
          >
        </label>
        <label class="field">
          <span>イベント名</span>
          <input
            v-model="state.form.eventName"
            placeholder="エルニーニョ vol.5"
          >
        </label>
        <label class="field">
          <span>開催日</span>
          <input v-model="state.form.date" type="date">
        </label>
        <label class="field">
          <span>運営の連絡先</span>
          <input v-model="state.form.contact" placeholder="X: @example">
        </label>
      </div>
      <p
        v-if="(state.form.seriesId || state.form.eventId) && !idsValid"
        class="warn"
      >
        ID は英数字と _ - だけで書いてください
      </p>
    </section>

    <section class="card">
      <h2 class="heading">2. エントリー</h2>
      <label class="field">
        <span
          >1 行に 1 人、「No.: 名前」の形で書く ({{
            Object.keys(entries.entries).length
          }}
          人)</span
        >
        <textarea
          v-model="state.entriesText"
          rows="8"
          placeholder="1: BLAZE&#10;2: しぐれ"
        />
      </label>
      <ul v-if="entries.problems.length" class="problems">
        <li v-for="p in entries.problems" :key="p">{{ p }}</li>
      </ul>
    </section>

    <section class="card">
      <h2 class="heading">3. 動画</h2>
      <p class="hint">
        撮影したファイルをそのまま送ります
        (エンコードはしません)。フォルダを選ぶと、その下の分類 (予選・本戦など)
        のフォルダ構成がキーになります。並び順がイベントの中での動画の No.
        になります。
      </p>
      <div class="pickers">
        <label class="picker">
          フォルダを選ぶ
          <input
            type="file"
            webkitdirectory
            multiple
            :disabled="busy"
            @change="onPickFiles"
          >
        </label>
        <span class="or">または</span>
        <input
          v-model.trim="category"
          class="category"
          placeholder="分類 (例: 予選)"
          aria-label="ファイルを置く分類"
        >
        <label class="picker">
          ファイルを選ぶ
          <input
            type="file"
            accept=".mp4,video/mp4"
            multiple
            :disabled="busy"
            @change="onPickFiles"
          >
        </label>
        <button
          type="button"
          class="sub"
          :disabled="!idsValid || busy"
          @click="ed.refreshRemote(state)"
        >
          R2 を確認
        </button>
        <button
          type="button"
          class="sub"
          :disabled="busy"
          @click="ed.sortRows(state)"
        >
          パス順に並べる
        </button>
      </div>

      <div v-if="state.rows.length" class="table-wrap">
        <table class="videos">
          <thead>
            <tr>
              <th>No.</th>
              <th>パス</th>
              <th>長さ (秒)</th>
              <th>サイズ</th>
              <th>出演 No.</th>
              <th>R2</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in state.rows" :key="row.id">
              <td class="mono">{{ i + 1 }}</td>
              <td class="path">{{ row.relPath }}</td>
              <td>
                <input
                  v-model.number="row.durationSec"
                  class="num"
                  type="number"
                  min="0"
                  :title="
                    row.durationSec === null
                      ? '長さが読めませんでした。秒で書いてください'
                      : formatSeconds(row.durationSec)
                  "
                >
              </td>
              <td class="mono">{{ formatBytes(row.sizeBytes) }}</td>
              <td>
                <input
                  v-model="row.performersText"
                  class="performers"
                  placeholder="1, 2"
                >
              </td>
              <td>
                <span :class="['state', ed.rowState(row, state.remote).kind]">
                  {{ ed.rowState(row, state.remote).label }}
                </span>
              </td>
              <td class="ops">
                <button
                  type="button"
                  aria-label="上へ"
                  :disabled="busy || i === 0"
                  @click="ed.moveRow(state, row.id, -1)"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="下へ"
                  :disabled="busy || i === state.rows.length - 1"
                  @click="ed.moveRow(state, row.id, 1)"
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label="外す"
                  :disabled="busy"
                  @click="ed.removeRow(state, row.id)"
                >
                  ✕
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="hint">まだ動画がありません。</p>

      <div class="actions">
        <button
          v-if="state.busy !== 'upload'"
          type="button"
          class="primary"
          :disabled="!idsValid || !state.remote || !targets.length || !!busy"
          @click="ed.uploadAll(state)"
        >
          R2 にアップロード ({{ targets.length }} 本 /
          {{ formatBytes(totalUploadBytes) }})
        </button>
        <button
          v-else
          type="button"
          class="sub"
          @click="ed.cancelUpload(state)"
        >
          アップロードを中止
        </button>
      </div>
    </section>

    <section class="card">
      <h2 class="heading">4. DB に登録</h2>
      <p class="hint">
        すべての動画が「R2
        にあり」になったら登録できます。登録すると、このイベントのエントリー・動画・出演者を入れ直します
        (ほかのイベントには触れません)。
      </p>
      <div class="actions">
        <button
          type="button"
          class="sub"
          :disabled="!canRegister"
          @click="onRegister(true)"
        >
          確認だけ
        </button>
        <button
          type="button"
          class="primary"
          :disabled="!canRegister"
          @click="onRegister(false)"
        >
          登録する
        </button>
        <a
          v-if="isRegistered"
          class="link"
          :href="`/${currentKey}`"
          target="_blank"
          rel="noopener"
          >公開ページを開く</a
        >
        <button
          v-if="isRegistered && selected"
          type="button"
          class="danger"
          :disabled="busy"
          @click="onDelete"
        >
          {{
            confirmDelete
              ? 'もう一度押すと DB から消します'
              : 'このイベントを消す'
          }}
        </button>
      </div>
    </section>

    <div
      v-if="state.messages"
      :class="['messages', state.messages.kind]"
      role="status"
      aria-live="polite"
    >
      <p v-for="line in state.messages.lines" :key="line">{{ line }}</p>
    </div>
  </div>
</template>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 120px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-surface);
}

.heading {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--color-muted);
}

input,
select,
textarea {
  box-sizing: border-box;
  min-height: 40px;
  padding: 0 10px;
  border: 1px solid var(--color-border-strong);
  border-radius: 8px;
  background: var(--color-surface-sunken);
  color: var(--color-text);
  font: inherit;
  font-size: 15px;
}

textarea {
  padding: 10px;
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
}

input:disabled {
  color: var(--color-muted);
}

.hint,
.warn {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-muted);
}

.warn,
.problems {
  color: #ffb36b;
}

.problems {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
}

.pickers {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.picker,
button {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid var(--color-border-strong);
  border-radius: 999px;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.picker input {
  display: none;
}

.or {
  font-size: 13px;
  color: var(--color-muted);
}

.category {
  width: 160px;
}

button:disabled {
  opacity: 0.4;
  cursor: default;
}

.primary {
  border: none;
  background: var(--color-accent);
  color: var(--color-bg);
  font-weight: 700;
}

.danger {
  border-color: #ff7a7a;
  color: #ff7a7a;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.link {
  color: var(--color-accent);
  font-size: 14px;
}

.table-wrap {
  overflow-x: auto;
}

.videos {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.videos th {
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-muted);
  font-weight: 500;
  text-align: left;
  white-space: nowrap;
}

.videos td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-line);
  vertical-align: middle;
}

.mono,
.path {
  font-family: var(--font-mono);
  white-space: nowrap;
}

.num {
  width: 80px;
}

.performers {
  width: 90px;
}

.ops {
  display: flex;
  gap: 4px;
}

.ops button {
  min-height: 32px;
  padding: 0 10px;
}

.state {
  white-space: nowrap;
}

.state.ok {
  color: var(--color-accent);
}

.state.pending,
.state.unknown {
  color: var(--color-muted);
}

.state.uploading {
  color: #7ad7ff;
}

.state.error {
  color: #ff7a7a;
}

.messages {
  position: sticky;
  bottom: 16px;
  padding: 14px 16px;
  border: 1px solid var(--color-border-strong);
  border-radius: 12px;
  background: var(--color-surface-raised);
  font-size: 14px;
  line-height: 1.6;
}

.messages p {
  margin: 0;
}

.messages.error {
  border-color: #ff7a7a;
  color: #ffb3b3;
}
</style>
