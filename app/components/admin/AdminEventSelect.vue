<script setup lang="ts">
// 登録済みのイベントを選ぶ欄。イベントの登録の画面と、エントリー・動画の登録の画面で使う
import type { EventSummary } from '~/utils/adminApi'
import { eventKey } from '~/utils/adminCommon/eventKey'

defineProps<{
  /** 欄の名前 */
  label: string
  /** 何も選んでいないときの選択肢の文 */
  emptyLabel: string
  events: EventSummary[]
  disabled?: boolean
}>()

/** 選んでいるイベントのキー (`シリーズID/イベントID`)。選んでいなければ空 */
const selectedKey = defineModel<string>({ required: true })
</script>

<template>
  <label class="admin-field">
    <span>{{ label }}</span>
    <select v-model="selectedKey" class="admin-input" :disabled="disabled">
      <option value="">{{ emptyLabel }}</option>
      <option v-for="e in events" :key="eventKey(e)" :value="eventKey(e)">
        {{ e.date }} {{ e.seriesName }} / {{ e.eventName }} ({{ eventKey(e) }})
      </option>
    </select>
  </label>
</template>
