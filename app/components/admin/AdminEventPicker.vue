<script setup lang="ts">
// イベントを選ぶ: エントリーや動画を登録する、登録済みのイベントを選ぶ。イベントの情報はここでは直さない。
// 選んだキーを v-model でやり取りし、読み込んだイベントの情報を出すだけにする (読み込むのは親)

import { computed } from 'vue'
import type { EventSummary } from '~/utils/adminApi'
import type { SelectedEvent } from '~/utils/adminCommon/eventSelection'
import AdminEventSelect from './AdminEventSelect.vue'

defineProps<{
  /** 登録済みのイベントの一覧 */
  events: EventSummary[]
  /** 選んで読み込んだイベントの情報。読み込めるまでは null */
  event: SelectedEvent | null
  /** API を待っているか (待っている間は選び直せない) */
  busy?: boolean
}>()

/** 選んでいるイベントのキー (`シリーズID/イベントID`)。選んでいなければ空 */
const selectedKey = defineModel<string>({ required: true })

const editLink = computed(
  () =>
    `/admin/events${selectedKey.value ? `?event=${selectedKey.value}` : ''}`,
)
</script>

<template>
  <section class="admin-card">
    <h2 class="admin-heading">1. イベントを選ぶ</h2>
    <p v-if="!events.length" class="admin-hint">
      まだイベントがありません。先に
      <NuxtLink class="link" to="/admin/events">イベントを登録</NuxtLink>
      してください。
    </p>
    <AdminEventSelect
      v-else
      v-model="selectedKey"
      label="登録済みのイベント"
      empty-label="選んでください"
      :events="events"
      :disabled="busy"
    />
    <dl v-if="event" class="info">
      <dt>シリーズ</dt>
      <dd>{{ event.series.name }} ({{ event.series.id }})</dd>
      <dt>イベント</dt>
      <dd>{{ event.event.name }} ({{ event.event.id }})</dd>
      <dt>開催日</dt>
      <dd>{{ event.event.date }}</dd>
      <dt>運営の連絡先</dt>
      <dd>{{ event.event.contact }}</dd>
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
