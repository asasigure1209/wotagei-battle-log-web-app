<script setup lang="ts">
// イベント: 登録済みのイベントを選んで直すか、新しいイベントの情報を書いて登録する。選んだイベントは消せる

import { computed, ref, watch } from 'vue'
import { useAdminEventForm } from '~/composables/useAdminEventForm'
import { eventKey } from '~/utils/adminCommon/eventKey'

const {
  state,
  canSave,
  showIdWarning,
  seriesList,
  open,
  fillSeriesName,
  save,
  remove,
} = useAdminEventForm()

/** 選んでいる登録済みのイベント。新しく作るときは空 */
const selected = computed({
  get: () => state.selectedKey,
  set: (key: string) => open(key),
})

/** 消すボタンを 1 度押したか。もう一度押すと消す */
const confirmDelete = ref(false)
// ほかのイベントに切り替えたら、1 度押したことは忘れる
watch(
  () => state.selectedKey,
  () => {
    confirmDelete.value = false
  },
)

async function onDelete() {
  confirmDelete.value = !confirmDelete.value
  if (!confirmDelete.value) await remove()
}
</script>

<template>
  <section class="admin-card">
    <h2 class="admin-heading">イベント</h2>
    <label class="admin-field">
      <span>登録済みのイベントを直す</span>
      <select v-model="selected" class="admin-input" :disabled="state.busy">
        <option value="">新しいイベントを作る</option>
        <option v-for="e in state.list" :key="eventKey(e)" :value="eventKey(e)">
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
          list="admin-series"
          :disabled="!!state.selectedKey"
          @change="fillSeriesName"
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
          :disabled="!!state.selectedKey"
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
    <!-- シリーズ ID の候補。ラベルの中に置くと候補の名前がラベルの文に混ざるので、外に置く -->
    <datalist id="admin-series">
      <option v-for="s in seriesList" :key="s.id" :value="s.id">
        {{ s.name }}
      </option>
    </datalist>
    <p v-if="showIdWarning" class="admin-warn">
      ID は英数字と _ - だけで書いてください
    </p>
    <p class="admin-hint">
      シリーズ名を変えると、同じシリーズのほかのイベントにも効きます。登録済みのイベントの情報を直しても、エントリー・動画はそのまま残ります。
    </p>
    <div class="admin-actions">
      <button
        type="button"
        class="admin-btn primary"
        :disabled="!canSave"
        @click="save"
      >
        {{ state.selectedKey ? '書き換える' : '登録する' }}
      </button>
      <NuxtLink v-if="state.selectedKey" class="link" to="/admin/entries">
        エントリーと動画の登録へ
      </NuxtLink>
      <button
        v-if="state.selectedKey"
        type="button"
        class="admin-btn danger"
        :disabled="state.busy"
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
</template>

<style scoped>
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
