<script setup lang="ts">
import { computed } from 'vue'
// 1. イベント: 登録済みのイベントを選んで読み込むか、新しいイベントの情報を書く
import { useAdminEditor } from '~/composables/useAdminEventEditor'
import { eventKey } from '~/utils/adminEditor/state'

const { state, events, idsValid, currentKey, open, refreshRemote } =
  useAdminEditor()

/** 選んでいる登録済みのイベント。新しく作るときは空 */
const selected = computed({
  get: () => (state.loaded ? currentKey.value : ''),
  set: (key: string) => open(key),
})
const showIdWarning = computed(
  () => (state.form.seriesId || state.form.eventId) && !idsValid.value,
)
</script>

<template>
  <section class="admin-card">
    <h2 class="admin-heading">1. イベント</h2>
    <label class="admin-field">
      <span>登録済みのイベントを直す</span>
      <select v-model="selected" class="admin-input" :disabled="state.busy">
        <option value="">新しいイベントを作る</option>
        <option
          v-for="e in events.list.value"
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
          @change="refreshRemote"
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
          @change="refreshRemote"
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
  </section>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}
</style>
