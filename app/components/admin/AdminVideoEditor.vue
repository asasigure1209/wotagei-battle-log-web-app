<script setup lang="ts">
// 登録済みのイベントを選び、動画と出演者を登録するまでの画面。エディターを作って各セクションに渡し、並べるだけにする

import { provideAdminVideoEditor } from '~/composables/useAdminVideoEditor'
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

const { state, currentKey, open } = provideAdminVideoEditor(
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
