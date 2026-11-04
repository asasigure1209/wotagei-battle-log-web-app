<script setup lang="ts">
// 1. イベント: エントリー・動画を登録するイベントを、登録済みのイベントから選ぶ。
// イベントの情報はここでは変えず、イベントの登録の画面 (/admin/events) で書く

import { computed } from 'vue'
import { useAdminEditor } from '~/composables/useAdminEventEditor'
import { eventKey } from '~/utils/adminEditor/state'

const { state, events, currentKey, open } = useAdminEditor()

/** 選んでいるイベント。選んでいなければ空 */
const selected = computed({
  get: () => (state.loaded ? currentKey.value : ''),
  set: (key: string) => open(key),
})
</script>

<template>
  <section class="admin-card">
    <h2 class="admin-heading">1. イベント</h2>
    <label class="admin-field">
      <span>エントリー・動画を登録するイベント</span>
      <select v-model="selected" class="admin-input" :disabled="state.busy">
        <option value="">選んでください</option>
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
    <dl v-if="state.loaded" class="info">
      <div>
        <dt>シリーズ</dt>
        <dd>{{ state.form.seriesName }} ({{ state.form.seriesId }})</dd>
      </div>
      <div>
        <dt>イベント</dt>
        <dd>{{ state.form.eventName }} ({{ state.form.eventId }})</dd>
      </div>
      <div>
        <dt>開催日</dt>
        <dd>{{ state.form.date }}</dd>
      </div>
      <div>
        <dt>運営の連絡先</dt>
        <dd>{{ state.form.contact }}</dd>
      </div>
    </dl>
    <p class="admin-hint">
      一覧にないイベントは、先に
      <a class="link" href="/admin/events">イベントの登録</a>
      で登録してください。
      <template v-if="state.loaded">
        イベントの情報を直すときは
        <a
          class="link"
          :href="`/admin/events?event=${encodeURIComponent(currentKey)}`"
          >イベントの登録</a
        >
        で直します。
      </template>
    </p>
  </section>
</template>

<style scoped>
.info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  margin: 0;
}

.info dt {
  font-size: 13px;
  color: var(--color-muted);
}

.info dd {
  margin: 4px 0 0;
  font-size: 15px;
}

.link {
  color: var(--color-accent);
}
</style>
