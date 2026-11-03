<script setup lang="ts">
// 画面の下に出す知らせ (エラーや、終わったことの知らせ)
import { useAdminEditor } from '~/composables/useAdminEventEditor'

const { state } = useAdminEditor()
</script>

<template>
  <div
    v-if="state.messages"
    :class="['messages', state.messages.kind]"
    role="status"
    aria-live="polite"
  >
    <p v-for="line in state.messages.lines" :key="line">{{ line }}</p>
  </div>
</template>

<style scoped>
.messages {
  position: sticky;
  bottom: 16px;
  padding: 14px 16px;
  border: 1px solid var(--color-border-strong);
  border-radius: 12px;
  background: var(--color-surface-raised);
  font-size: 14px;
  line-height: 1.6;
}

.messages p {
  margin: 0;
}

.error {
  border-color: var(--color-danger);
  color: var(--color-danger-soft);
}
</style>
