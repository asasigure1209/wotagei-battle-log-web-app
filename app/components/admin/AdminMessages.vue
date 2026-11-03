<script setup lang="ts">
import type { EditorMessages } from '~/utils/adminEditor/state'

defineProps<{
  /** 画面の下に出す知らせ。null なら何も出さない */
  messages: EditorMessages | null
}>()
</script>

<template>
  <div
    v-if="messages"
    :class="['messages', messages.kind]"
    role="status"
    aria-live="polite"
  >
    <p v-for="line in messages.lines" :key="line">{{ line }}</p>
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
  border-color: #ff7a7a;
  color: #ffb3b3;
}
</style>
