<script setup lang="ts">
import AppIcon from './AppIcon.vue'

defineProps<{
  /** 戻るリンクの文字 (戻り先のページの名前) */
  backLabel: string
  /** 戻り先のページの URL */
  backHref: string
  /** 右端に表示するイベントの名前 */
  eventName: string
}>()
</script>

<template>
  <div class="top-bar">
    <a class="back" :href="backHref">
      <AppIcon name="back" :size="20" />
      <span>{{ backLabel }}</span>
    </a>
    <span class="event-name">{{ eventName }}</span>
  </div>
</template>

<style scoped>
.top-bar {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 4px;
  height: 56px;
  padding: 0 8px;
  border-bottom: 1px solid var(--color-line);
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
}

.back {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 10px;
  color: inherit;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
}

.event-name {
  margin-left: auto;
  padding-right: 12px;
  font-size: 12px;
  color: var(--color-muted);
}
</style>
