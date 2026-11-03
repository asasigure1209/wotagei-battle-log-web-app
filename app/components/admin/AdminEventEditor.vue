<script setup lang="ts">
// 1 つのイベントを書いて登録するまでの画面。エディター (useAdminEventEditor) を作って各セクションに渡し、並べるだけにする
import { onMounted } from 'vue'

const emit = defineEmits<{
  /** ログインが切れたとき */
  unauthorized: []
}>()

const editor = useAdminEventEditor(() => emit('unauthorized'))
onMounted(editor.events.reload)
</script>

<template>
  <div class="editor">
    <AdminEventSection />
    <AdminEntriesSection />
    <AdminVideosSection />
    <AdminRegisterSection />
    <AdminMessages :messages="editor.state.messages" />
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
