<script setup lang="ts">
defineProps<{
  /** 動画の番号。サムネイル画像がないときに大きく表示する */
  no: string
  /** 再生時間 (mm:ss) */
  duration: string
  /** サムネイル画像の URL。ないときは番号入りの仮の画像を表示する */
  src?: string
}>()
</script>

<template>
  <div class="video-thumb" aria-hidden="true">
    <img v-if="src" class="image" :src="src" alt="">
    <span v-else class="no">{{ no }}</span>
    <span class="duration">{{ duration }}</span>
  </div>
</template>

<style scoped>
.video-thumb {
  position: relative;
  flex: none;
  width: 112px;
  height: 63px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  overflow: hidden;
  background: repeating-linear-gradient(
    135deg,
    #1c1c24 0 10px,
    #212129 10px 20px
  );
  font-family: var(--font-mono);
  color: var(--color-text);
}

.image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no {
  font-family: var(--font-display);
  font-size: 22px;
  color: #44444f;
}

.duration {
  position: absolute;
  right: 5px;
  bottom: 5px;
  padding: 1px 5px;
  background: rgb(0 0 0 / 78%);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}
</style>
