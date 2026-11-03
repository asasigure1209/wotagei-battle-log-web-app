<script setup lang="ts">
// 1 つのイベントを書いて登録するまでの画面。エディターを作って各セクションに渡し、並べるだけにする
const emit = defineEmits<{
  /** ログインが切れたとき */
  unauthorized: []
}>()

provideAdminEditor(() => emit('unauthorized'))
</script>

<template>
  <div class="editor">
    <AdminEventSection />
    <AdminEntriesSection />
    <AdminVideosSection />
    <AdminRegisterSection />
    <AdminMessages />
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
