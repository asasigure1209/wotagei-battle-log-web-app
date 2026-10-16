<script setup lang="ts">
definePageMeta({
  // シリーズ ID・イベント ID は、動画をアップロードするとき (video_upload の mise upload) と同じく英数字と _ - だけ。
  // リンクの URL に埋め込むので、ほかの文字を含むものは 404 にする。
  // vue-router が親の meta を子のページに引き継ぐので、イベント配下のページすべてに効く
  validate: ({ params }) =>
    [params.series, params.event].every((id) => /^[\w-]+$/.test(String(id))),
})
</script>

<template>
  <div class="event-layout">
    <NuxtPage />
  </div>
</template>

<style scoped>
.event-layout {
  max-width: 480px;
  margin: 0 auto;
}
</style>
