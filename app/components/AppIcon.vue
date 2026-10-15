<script lang="ts">
// 24×24 の座標で描いた線
const paths = {
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  chevron: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7',
  // 最後は中心 (12, 19.5)・半径 0.8 の円
  wifi: 'M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0M11.2 19.5a.8.8 0 1 0 1.6 0a.8.8 0 1 0-1.6 0',
}

export type IconName = keyof typeof paths
</script>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** アイコンの種類 */
    name: IconName
    /** 一辺の大きさ (px) */
    size?: number
    /** 線の太さ */
    stroke?: number
  }>(),
  { size: 24, stroke: 2.2 },
)
</script>

<template>
  <svg
    class="app-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="stroke"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name]" />
  </svg>
</template>

<style scoped>
.app-icon {
  flex: none;
}
</style>
