<script setup lang="ts">
// イベントの登録 (直す・消すのもここ)。?event=<シリーズID>/<イベントID> で、そのイベントを選んだ状態で開く
useHead({ title: 'イベントの登録 | 管理画面' })

const loggedIn = useAdminLoggedIn()
const initialEvent = String(useRoute().query.event ?? '')
</script>

<template>
  <div>
    <h2 class="heading">イベントの登録</h2>
    <AdminEventRegistration
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
