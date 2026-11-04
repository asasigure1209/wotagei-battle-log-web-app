<script setup lang="ts">
// 管理画面の親のページ。ログインを確かめ、ログインしていれば配下のページ (pages/admin/) を出す。
// - /admin: 登録操作の入り口
// - /admin/events: イベントの登録
// - /admin/entries: 登録済みのイベントに、エントリー・動画を登録する
// ログインしているかで中身が変わるので、サーバーでは描画しない (nuxt.config.ts の routeRules)
import { onMounted, ref } from 'vue'
import { provideAdminUnauthorized } from '~/composables/useAdminSession'
import '~/assets/css/admin.css'

useHead({
  titleTemplate: (title) => (title ? `${title} | 管理画面` : '管理画面'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

/** ログインしているか。確かめるまでは null */
const loggedIn = ref<boolean | null>(null)

provideAdminUnauthorized(() => {
  loggedIn.value = false
})

onMounted(async () => {
  try {
    await $fetch('/api/admin/session')
    loggedIn.value = true
  } catch {
    loggedIn.value = false
  }
})

async function logout() {
  await adminPost('/api/admin/logout', {}).catch(() => {})
  loggedIn.value = false
}
</script>

<template>
  <div class="admin">
    <AdminLogin v-if="loggedIn === false" @login="loggedIn = true" />
    <template v-else-if="loggedIn">
      <header class="bar">
        <a class="title" href="/admin">管理画面</a>
        <button type="button" class="admin-btn" @click="logout">
          ログアウト
        </button>
      </header>
      <NuxtPage />
    </template>
  </div>
</template>

<style scoped>
.admin {
  box-sizing: border-box;
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 16px;
}

.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 0;
}

.title {
  margin: 0;
  color: inherit;
  font-size: 22px;
  font-weight: 700;
  text-decoration: none;
}
</style>
