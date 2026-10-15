<script setup lang="ts">
import AppEyebrow from './AppEyebrow.vue'
import AppNotice from './AppNotice.vue'

defineProps<{
  /** エントリー番号 (2 桁にそろえた文字列) */
  entryNo: string
  /** プレイヤーの名前 */
  playerName: string
  /** 動画の本数 */
  count: number
  /** 動画の合計の容量 */
  totalSize: string
}>()
</script>

<template>
  <header class="player-header">
    <AppEyebrow :text="`ENTRY No.${entryNo}`" />
    <h1 class="name">{{ playerName }}</h1>
    <div class="stats">
      <span>動画 <strong>{{ count }}</strong> 本</span>
      <span>合計 <strong>{{ totalSize }}</strong></span>
    </div>
    <div class="notice">
      <AppNotice
        type="wifi"
        text="容量が大きいため、Wi-Fi 環境でのダウンロードをおすすめします"
      />
    </div>
  </header>
</template>

<style scoped>
.player-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 24px 20px 20px;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
}

.name {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 400;
  font-size: 40px;
  line-height: 1.15;
}

.stats {
  display: flex;
  gap: 18px;
  font-size: 14px;
  color: var(--color-muted);
}

.stats strong {
  font-family: var(--font-mono);
  color: var(--color-text);
}

.notice {
  margin-top: 6px;
}
</style>
