<script setup lang="ts">
// イベントの登録。?event=シリーズID/イベントID があれば、そのイベントを選んで開く
import { useAdminUnauthorized } from '~/composables/useAdminSession'

useHead({ title: 'イベントの登録' })

const onUnauthorized = useAdminUnauthorized()
const initialEvent = String(useRoute().query.event ?? '')
</script>

<template>
  <AdminEventForm
    :initial-event="initialEvent"
    @unauthorized="onUnauthorized"
  />
</template>
