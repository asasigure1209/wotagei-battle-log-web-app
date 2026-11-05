<script setup lang="ts">
// イベントの情報を登録する (直す・消す) 画面。状態を作って子に渡し、並べるだけにする

import { provideAdminEventForm } from '~/composables/useAdminEventForm'
import AdminEventForm from './AdminEventForm.vue'
import AdminMessages from './AdminMessages.vue'

const props = defineProps<{
  /** 開いたときに選ぶイベント (`シリーズID/イベントID`) */
  initialEvent?: string
}>()

const emit = defineEmits<{
  /** ログインが切れたとき */
  unauthorized: []
}>()

const { state } = provideAdminEventForm(
  () => emit('unauthorized'),
  props.initialEvent,
)
</script>

<template>
  <div class="registration">
    <AdminEventForm />
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
