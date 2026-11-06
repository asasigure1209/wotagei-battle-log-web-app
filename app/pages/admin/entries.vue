<script setup lang="ts">
// エントリーの登録。登録済みのイベントを選んで行う。?event=<シリーズID>/<イベントID> で、そのイベントを選んだ状態で開く
useHead({ title: 'エントリーの登録 | 管理画面' })

const loggedIn = useAdminLoggedIn()
const initialEvent = String(useRoute().query.event ?? '')
</script>

<template>
  <div>
    <h2 class="heading">エントリーの登録</h2>
    <AdminEntriesRegistration
      :initial-event="initialEvent"
      @unauthorized="loggedIn = false"
    />
  </div>
</template>

<style scoped>
.heading {
  margin: 0 0 16px;
  font-size: 18px;
}
</style>
