<script setup lang="ts">
const { params } = useRoute()
const eventPath = `/${params.series}/${params.event}`
const playerPath = `${eventPath}/players/${params.no}`
// URL を series・event・no に分けて書くと、API (server/api/[series]/[event]/) の戻り値の型が付く
const [{ data: event }, { data: playerData }] = await Promise.all([
  useEventInfo(),
  useApiFetch(`/api/${params.series}/${params.event}/players/${params.no}`),
])
// いないプレイヤーは API が 404 を返し、data が空になる
const player = playerData.value
if (!player) {
  throw createError({ status: 404, statusText: 'Page Not Found', fatal: true })
}
const { videos } = player

useHead({ title: () => `${player.name} | ${event.value?.title}` })

const selection = useVideoSelection(videos)
const download = useVideoDownload(playerPath)
const bulk = useBulkDownload(() => selection.targets, download.download)
const targetSize = computed(() => formatSize(sumMb(selection.targets)))
</script>

<template>
  <div class="player-page">
    <TopBar
      back-label="プレイヤー一覧"
      :back-href="eventPath"
      :event-name="event?.title ?? ''"
    />
    <main>
      <PlayerHeader
        :entry-no="player.no"
        :player-name="player.name"
        :count="videos.length"
        :total-size="formatSize(sumMb(videos))"
      />
      <div class="head">
        <h2 class="title">動画一覧</h2>
        <AppButton
          :label="selection.active ? 'キャンセル' : '選択'"
          variant="secondary"
          size="S"
          @click="selection.toggle"
        />
      </div>
      <ul class="list">
        <li v-for="video in videos" :key="video.no">
          <VideoItem
            v-model:selected="selection.selected[video.no]"
            :mode="selection.active ? 'select' : 'default'"
            :status="download.saved[video.no] ? 'done' : 'idle'"
            :no="video.no"
            :file="video.file"
            :duration="video.duration"
            :file-size="formatSize(video.mb)"
            @download="download.download(video)"
          />
        </li>
      </ul>
    </main>
    <BottomActionBar
      class="action-bar"
      :variant="selection.active ? 'selection' : 'all'"
      :count="selection.targets.length"
      :size="selection.targets.length ? targetSize : '未選択'"
      @download="bulk.show"
    />
    <BulkDownloadSheet
      v-model:open="bulk.open"
      v-model:method="bulk.method"
      :disabled-methods="bulk.disabledMethods"
      :step="bulk.step"
      :player-name="player.name"
      :count="selection.targets.length"
      :total-size="targetSize"
      :progress="bulk.progress"
      :detail="bulk.detail"
      @start="bulk.start"
    />
  </div>
</template>

<style scoped>
.player-page {
  /* 画面下に固定したバーに、一覧の最後が隠れないようにする */
  padding-bottom: 120px;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px 8px 20px;
  border-top: 1px solid var(--color-line);
}

.title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 4px 12px;
  list-style: none;
}

.action-bar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 10;
  max-width: 480px;
  margin: 0 auto;
}
</style>
