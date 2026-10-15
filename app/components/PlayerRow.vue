<script setup lang="ts">
import AppIcon from './AppIcon.vue'

defineProps<{
  /** エントリー番号 (2 桁にそろえた文字列) */
  entryNo: string
  /** プレイヤーの名前 */
  playerName: string
  /** 動画の本数 */
  count: number
  /** プレイヤーの動画一覧ページの URL */
  href: string
}>()
</script>

<template>
  <a class="player-row" :href="href">
    <span class="entry-no">No.{{ entryNo }}</span>
    <span class="name">{{ playerName }}</span>
    <span class="count">{{ count }}本</span>
    <AppIcon class="chevron" name="chevron" :size="18" />
  </a>
</template>

<style scoped>
.player-row {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 0 12px 0 16px;
  background: var(--color-surface);
  border-radius: 10px;
  color: var(--color-text);
  text-decoration: none;
}

.entry-no {
  flex: none;
  min-width: 52px;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--color-accent);
}

.name {
  flex: 1;
  min-width: 0;
  font-size: 17px;
  font-weight: 700;
}

.count {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--color-muted);
}

.chevron {
  color: var(--color-muted);
}
</style>
