<script setup lang="ts">
// エントリー・動画の登録。?event=シリーズID/イベントID があれば、そのイベントを選んで開く
import { useAdminUnauthorized } from '~/composables/useAdminSession'

useHead({ title: 'エントリー・動画の登録' })

const onUnauthorized = useAdminUnauthorized()
const initialEvent = String(useRoute().query.event ?? '')
</script>

<template>
  <AdminContentsEditor
    :initial-event="initialEvent"
    @unauthorized="onUnauthorized"
  />
</template>
