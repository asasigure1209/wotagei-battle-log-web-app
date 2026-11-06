<script setup lang="ts">
// 登録済みのイベントを選び、エントリーを登録する画面。状態を作って各セクションに渡し、並べるだけにする

import { provideAdminEntriesForm } from '~/composables/useAdminEntriesForm'
import AdminEntriesRegisterSection from './AdminEntriesRegisterSection.vue'
import AdminEntryNamesSection from './AdminEntryNamesSection.vue'
import AdminEventPicker from './AdminEventPicker.vue'
import AdminMessages from './AdminMessages.vue'

const props = defineProps<{
  /** 開いたときに選ぶイベント (`シリーズID/イベントID`) */
  initialEvent?: string
}>()

const emit = defineEmits<{
  /** ログインが切れたとき */
  unauthorized: []
}>()

const { state, currentKey, open } = provideAdminEntriesForm(
  () => emit('unauthorized'),
  props.initialEvent,
)
</script>

<template>
  <div class="registration">
    <AdminEventPicker
      :model-value="currentKey"
      :events="state.registeredEvents"
      :event="state.event"
      :busy="state.busy"
      @update:model-value="open"
    />
    <AdminEntryNamesSection />
    <AdminEntriesRegisterSection />
    <AdminMessages :messages="state.messages" />
  </div>
</template>

<style scoped>
.registration {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 120px;
}
</style>
