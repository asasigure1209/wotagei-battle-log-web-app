<script setup lang="ts">
import AppEyebrow from './AppEyebrow.vue'
import AppNotice from './AppNotice.vue'

defineProps<{
  /** イベントの名前 */
  eventTitle: string
  /** 開催日 */
  date: string
  /** 動画の公開期限 (YYYY/MM/DD) */
  expiry: string
}>()

// 扇のように広げたサイリウムの飾り (色・長さ・傾き)
const lights = [
  { color: '#d9ff3b', height: 46, angle: -28 },
  { color: '#3ce1ff', height: 52, angle: -16 },
  { color: '#ff4d9d', height: 56, angle: -5 },
  { color: '#ff9a3c', height: 56, angle: 6 },
  { color: '#b07cff', height: 52, angle: 17 },
  { color: '#d9ff3b', height: 46, angle: 29 },
]
</script>

<template>
  <header class="event-header">
    <div class="lights" aria-hidden="true">
      <span
        v-for="light in lights"
        :key="light.angle"
        class="light"
        :style="{
          '--light': light.color,
          height: `${light.height}px`,
          transform: `rotate(${light.angle}deg)`,
        }"
      />
    </div>
    <AppEyebrow text="VIDEO ARCHIVE" />
    <h1 class="title">{{ eventTitle }}</h1>
    <p class="date">{{ date }}</p>
    <div class="guide">
      <p class="guide-text">
        自分の名前を探してタップすると、あなたの出場動画をダウンロードできます。
      </p>
      <AppNotice type="expiry" :text="`公開期限：${expiry} まで`" />
    </div>
  </header>
</template>

<style scoped>
.event-header {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 28px 20px 24px;
  border-bottom: 1px solid var(--color-line);
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
}

.lights {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  height: 60px;
  padding-left: 6px;
}

.light {
  display: block;
  width: 8px;
  border-radius: 4px;
  background: var(--light);
  box-shadow: 0 0 16px var(--light);
}

.title {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 400;
  font-size: 34px;
  line-height: 1.2;
}

.date {
  margin: 0;
  font-size: 14px;
  color: var(--color-muted);
}

.guide {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  background: #15151b;
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.guide-text {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.6;
}
</style>
