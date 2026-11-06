<script setup lang="ts">
// 登録済みのイベントを選び、エントリーと動画を登録するまでの画面。エディターを作って各セクションに渡し、並べるだけにする

import { provideAdminEditor } from '~/composables/useAdminEditor'
import AdminEntriesSection from './AdminEntriesSection.vue'
import AdminEventPicker from './AdminEventPicker.vue'
import AdminMessages from './AdminMessages.vue'
import AdminRegisterSection from './AdminRegisterSection.vue'
import AdminVideosSection from './AdminVideosSection.vue'

const props = defineProps<{
  /** 開いたときに選ぶイベント (`シリーズID/イベントID`) */
  initialEvent?: string
}>()

const emit = defineEmits<{
  /** ログインが切れたとき */
  unauthorized: []
}>()

const { state, currentKey, open } = provideAdminEditor(
  () => emit('unauthorized'),
  props.initialEvent,
)
</script>

<template>
  <div class="editor">
    <AdminEventPicker
      :model-value="currentKey"
      :events="state.registeredEvents"
      :event="state.event"
      :busy="state.busy"
      @update:model-value="open"
    />
    <AdminEntriesSection />
    <AdminVideosSection />
    <AdminRegisterSection />
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
</style>
