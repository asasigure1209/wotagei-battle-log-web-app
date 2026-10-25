<script setup lang="ts">
const { params } = useRoute()
const eventPath = `/${params.series}/${params.event}`

useHead({ title: mockEvent.title })
</script>

<template>
  <div>
    <EventHeader :event-title="mockEvent.title" :date="mockEvent.date" />
    <main class="players">
      <div class="head">
        <h2 class="title">出場プレイヤー</h2>
        <span class="meta">
          <span class="total">{{ mockPlayers.length }}</span>名 ·
          エントリーNo.順
        </span>
      </div>
      <ul class="list">
        <li v-for="player in mockPlayers" :key="player.no">
          <PlayerRow
            :entry-no="player.no"
            :player-name="player.name"
            :count="player.count"
            :href="`${eventPath}/players/${player.no}`"
          />
        </li>
      </ul>
    </main>
    <SiteFooter :contact="mockEvent.contact" contact-href="#" />
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
