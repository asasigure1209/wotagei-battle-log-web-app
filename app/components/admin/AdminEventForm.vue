<script setup lang="ts">
// イベントの登録の画面。新しいイベントの情報を書いて登録するか、登録済みのイベントを選んで直す・消す。
// エントリー・動画は、登録したイベントを選んで、エントリー・動画の登録の画面 (/admin/entries) で登録する

import { computed, ref, watch } from 'vue'
import { useAdminEventForm } from '~/composables/useAdminEventForm'
import { eventKey } from '~/utils/adminEditor/state'
import AdminMessages from './AdminMessages.vue'

const props = defineProps<{
  /** 開いたときに選んでおくイベント (`シリーズID/イベントID`) */
  initialEvent?: string
}>()

const emit = defineEmits<{
  /** ログインが切れたとき */
  unauthorized: []
}>()

const { state, currentKey, idsValid, duplicated, open, save, remove } =
  useAdminEventForm(() => emit('unauthorized'), props.initialEvent)

/** 選んでいる登録済みのイベント。新しく作るときは空 */
const selected = computed({
  get: () => (state.loaded ? currentKey.value : ''),
  set: (key: string) => open(key),
})
const showIdWarning = computed(
  () => (state.form.seriesId || state.form.eventId) && !idsValid.value,
)
const canSave = computed(
  () => idsValid.value && !duplicated.value && !state.busy,
)

/** 消すボタンを 1 度押したか。もう一度押すと消す */
const confirmDelete = ref(false)
// ほかのイベントに切り替えたら、1 度押したことは忘れる
watch(currentKey, () => {
  confirmDelete.value = false
})

async function onDelete() {
  confirmDelete.value = !confirmDelete.value
  if (!confirmDelete.value) await remove()
}
</script>

<template>
  <div class="editor">
    <section class="admin-card">
      <h2 class="admin-heading">イベント</h2>
      <label class="admin-field">
        <span>登録済みのイベントを直す</span>
        <select v-model="selected" class="admin-input" :disabled="state.busy">
          <option value="">新しいイベントを作る</option>
          <option
            v-for="e in state.list"
            :key="eventKey(e)"
            :value="eventKey(e)"
          >
            {{ e.date }} {{ e.seriesName }} / {{ e.eventName }} ({{
              eventKey(e)
            }})
          </option>
        </select>
      </label>
      <div class="grid">
        <label class="admin-field">
          <span>シリーズ ID (英数字と _ -)</span>
          <input
            v-model.trim="state.form.seriesId"
            class="admin-input"
            placeholder="elnino"
            :disabled="state.loaded"
          >
        </label>
        <label class="admin-field">
          <span>シリーズ名</span>
          <input
            v-model="state.form.seriesName"
            class="admin-input"
            placeholder="エルニーニョ"
          >
        </label>
        <label class="admin-field">
          <span>イベント ID (英数字と _ -)</span>
          <input
            v-model.trim="state.form.eventId"
            class="admin-input"
            placeholder="elnino_vol_5"
            :disabled="state.loaded"
          >
        </label>
        <label class="admin-field">
          <span>イベント名</span>
          <input
            v-model="state.form.eventName"
            class="admin-input"
            placeholder="エルニーニョ vol.5"
          >
        </label>
        <label class="admin-field">
          <span>開催日</span>
          <input v-model="state.form.date" class="admin-input" type="date">
        </label>
        <label class="admin-field">
          <span>運営の連絡先</span>
          <input
            v-model="state.form.contact"
            class="admin-input"
            placeholder="X: @example"
          >
        </label>
      </div>
      <p v-if="showIdWarning" class="admin-warn">
        ID は英数字と _ - だけで書いてください
      </p>
      <p v-if="duplicated" class="admin-warn">
        {{ currentKey }} はもう登録されています。直すときは、上で選んでください
      </p>
      <div class="admin-actions">
        <button
          type="button"
          class="admin-btn primary"
          :disabled="!canSave"
          @click="save"
        >
          {{ state.loaded ? '書き換える' : '登録する' }}
        </button>
        <template v-if="state.loaded">
          <a
            class="link"
            :href="`/admin/entries?event=${encodeURIComponent(currentKey)}`"
            >エントリー・動画を登録する</a
          >
          <a
            class="link"
            :href="`/${currentKey}`"
            target="_blank"
            rel="noopener"
            >公開ページを開く</a
          >
          <button
            type="button"
            class="admin-btn danger"
            :disabled="state.busy"
            @click="onDelete"
          >
            {{
              confirmDelete
                ? 'もう一度押すと、エントリー・動画ごと DB から消します'
                : 'このイベントを消す'
            }}
          </button>
        </template>
      </div>
    </section>
    <AdminMessages :messages="state.messages" />
  </div>
</template>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 120px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.link {
  color: var(--color-accent);
  font-size: 14px;
}
</style>
