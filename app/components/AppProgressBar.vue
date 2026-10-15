<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  /** 進み具合 (0〜100)。範囲の外の値は 0 か 100 に丸める */
  value: number
  /** 左下に表示する詳細 (容量や本数) */
  detail: string
  /** 読み上げ用の名前 */
  label: string
}>()

const percent = computed(() => Math.max(0, Math.min(100, props.value)))
</script>

<template>
  <div class="app-progress-bar">
    <div
      class="track"
      role="progressbar"
      :aria-label="label"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="percent"
    >
      <div class="fill" :style="{ width: `${percent}%` }" />
    </div>
    <div class="caption">
      <span>{{ detail }}</span>
      <span class="percent">{{ percent }}%</span>
    </div>
  </div>
</template>

<style scoped>
.app-progress-bar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  font-family: var(--font-mono);
  color: var(--color-muted);
}

.track {
  height: 10px;
  border-radius: 5px;
  background: var(--color-border);
  overflow: hidden;
}

.fill {
  height: 100%;
  border-radius: 5px;
  background: var(--color-accent);
  box-shadow: 0 0 12px rgb(217 255 59 / 60%);
}

.caption {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.percent {
  color: var(--color-text);
  font-weight: 700;
}
</style>
