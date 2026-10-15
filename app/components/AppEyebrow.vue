<script setup lang="ts">
defineProps<{
  /** 表示する文字。英数字の大文字で短く書く */
  text: string
}>()
</script>

<template>
  <div class="app-eyebrow">{{ text }}</div>
</template>

<style scoped>
.app-eyebrow {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  line-height: 1.4;
  color: var(--color-accent);
}
</style>
