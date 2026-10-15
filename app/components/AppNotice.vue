<script setup lang="ts">
import AppIcon from './AppIcon.vue'

defineProps<{
  /** 種類。wifi は通信量の注意、expiry は公開期限、caution は待っている間の注意 (枠で囲む) */
  type: 'wifi' | 'expiry' | 'caution'
  /** 表示する文。caution では改行 (\n) をそのまま改行として表示する */
  text: string
}>()
</script>

<template>
  <p :class="['app-notice', type]">
    <AppIcon v-if="type === 'wifi'" name="wifi" :size="18" :stroke="2" />
    <span>{{ text }}</span>
  </p>
</template>

<style scoped>
.app-notice {
  margin: 0;
  font-family: var(--font-body);
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-muted);
}

.wifi {
  display: flex;
  align-items: center;
  gap: 8px;
}

.caution {
  padding: 14px 16px;
  background: #0f0f14;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  line-height: 1.7;
  color: #c9c9d1;
  white-space: pre-line;
}
</style>
