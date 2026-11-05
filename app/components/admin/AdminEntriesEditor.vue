<script setup lang="ts">
// 1 つのイベントを書いて登録するまでの画面。エディターを作って各セクションに渡し、並べるだけにする

import { provideAdminEditor } from '~/composables/useAdminEditor'
import AdminEntriesSection from './AdminEntriesSection.vue'
import AdminEventSection from './AdminEventSection.vue'
import AdminMessages from './AdminMessages.vue'
import AdminRegisterSection from './AdminRegisterSection.vue'
import AdminVideosSection from './AdminVideosSection.vue'

const emit = defineEmits<{
  /** ログインが切れたとき */
  unauthorized: []
}>()

const { state } = provideAdminEditor(() => emit('unauthorized'))
</script>

<template>
  <div class="editor">
    <AdminEventSection />
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
