<script setup lang="ts">
const { params } = useRoute()
const eventPath = `/${params.series}/${params.event}`
// URL を series と event に分けて書くと、API (server/api/[series]/[event]/) の戻り値の型が付く
const [{ data: event }, { data: players }] = await Promise.all([
  useFetch(`/api/${params.series}/${params.event}`, { headers: apiHeaders() }),
  useFetch(`/api/${params.series}/${params.event}/players`, {
    headers: apiHeaders(),
  }),
])

useHead({ title: () => event.value?.title })
</script>

<template>
  <div>
    <EventHeader :event-title="event?.title ?? ''" :date="event?.date ?? ''" />
    <main class="players">
      <div class="head">
        <h2 class="title">出場プレイヤー</h2>
        <span class="meta">
          <span class="total">{{ players?.length ?? 0 }}</span>名 ·
          エントリーNo.順
        </span>
      </div>
      <ul class="list">
        <li v-for="player in players" :key="player.no">
          <PlayerRow
            :entry-no="player.no"
            :player-name="player.name"
            :count="player.count"
            :href="`${eventPath}/players/${player.no}`"
          />
        </li>
      </ul>
    </main>
    <SiteFooter :contact="event?.contact ?? ''" contact-href="#" />
  </div>
</template>

<style scoped>
.players {
  padding-bottom: 28px;
}

.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 22px 20px 12px;
}

.title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.meta {
  font-size: 13px;
  color: var(--color-muted);
}

.total {
  font-family: var(--font-mono);
  color: var(--color-text);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0 12px;
  list-style: none;
}
</style>
