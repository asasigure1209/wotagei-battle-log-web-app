<script setup lang="ts">
import { isId } from '~~/shared/utils/id'

definePageMeta({
  // シリーズ ID・イベント ID はリンクの URL に埋め込むので、規則 (isId) に合わないものは 404 にする。
  // vue-router が親の meta を子のページに引き継ぐので、イベント配下のページすべてに効く
  validate: ({ params }) => [params.series, params.event].every(isId),
})

// ないイベントは API が 404 を返し、data が空になる。ここで 404 にすれば、イベント配下のページすべてに効く
const { data: event } = await useEventInfo()
if (!event.value) {
  throw createError({ status: 404, statusText: 'Page Not Found', fatal: true })
}
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
