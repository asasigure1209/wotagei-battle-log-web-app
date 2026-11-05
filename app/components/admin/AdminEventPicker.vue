<script setup lang="ts">
// 1. イベントを選ぶ: エントリーと動画を登録する、登録済みのイベントを選ぶ。イベントの情報はここでは直さない

import { computed } from 'vue'
import { useAdminEditor } from '~/composables/useAdminEditor'
import { eventKey } from '~/utils/adminCommon/eventKey'

const { state, events, currentKey, open } = useAdminEditor()

const selected = computed({
  get: () => currentKey.value,
  set: (key: string) => open(key),
})
const editLink = computed(
  () => `/admin/events${currentKey.value ? `?event=${currentKey.value}` : ''}`,
)
</script>

<template>
  <section class="admin-card">
    <h2 class="admin-heading">1. イベントを選ぶ</h2>
    <p v-if="!events.list.value.length" class="admin-hint">
      まだイベントがありません。先に
      <NuxtLink class="link" to="/admin/events">イベントを登録</NuxtLink>
      してください。
    </p>
    <label v-else class="admin-field">
      <span>登録済みのイベント</span>
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
    <dl v-if="state.event" class="info">
      <dt>シリーズ</dt>
      <dd>{{ state.event.series.name }} ({{ state.event.series.id }})</dd>
      <dt>イベント</dt>
      <dd>{{ state.event.event.name }} ({{ state.event.event.id }})</dd>
      <dt>開催日</dt>
      <dd>{{ state.event.event.date }}</dd>
      <dt>運営の連絡先</dt>
      <dd>{{ state.event.event.contact }}</dd>
    </dl>
    <p class="admin-hint">
      イベントの情報を直すときや、新しいイベントを足すときは
      <NuxtLink class="link" :to="editLink">イベントの登録</NuxtLink>
      で行います。
    </p>
  </section>
</template>

<style scoped>
.info {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 16px;
  margin: 0;
  font-size: 14px;
}

.info dt {
  color: var(--color-muted);
}

.info dd {
  margin: 0;
}

.link {
  color: var(--color-accent);
}
</style>
