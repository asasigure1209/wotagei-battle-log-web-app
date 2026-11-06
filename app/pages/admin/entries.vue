<script setup lang="ts">
// エントリーと動画の登録は /admin/videos に移った。前の URL (ブックマークなど) で開いても、
// ?event= を引き継いで /admin/videos へ移す
definePageMeta({
  redirect: (to) => ({ path: '/admin/videos', query: to.query }),
})
</script>

<template>
  <div />
</template>
