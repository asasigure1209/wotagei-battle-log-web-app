<script setup lang="ts">
import type { Method } from '~/components/MethodOption.vue'

const { params } = useRoute()
const eventPath = `/${params.series}/${params.event}`
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

const selectMode = ref(false)
const selected = ref<Record<string, boolean>>({})
// 保存済みの見た目を出すため、モックと同じく 2 本目を保存済みにしておき、
// ダウンロードボタンを押した動画も保存済みにする (実際の保存は API ができてから)
const saved = ref<Record<string, boolean>>({ '02': true })

// まとめてダウンロードする動画。選択モードでは選んだ動画だけ
const targets = computed(() =>
  selectMode.value ? videos.filter((v) => selected.value[v.no]) : videos,
)
const targetMb = computed(() => sumMb(targets.value))

const method = ref<Method>('zip')
const sheetStep = ref<'choose' | 'preparing'>('choose')
const sheetOpen = ref(false)

// ダウンロードの処理は API ができてから作るので、準備の進み具合はモックと同じ 64% で止めておく
const progress = 64
const detail = computed(() =>
  method.value === 'zip'
    ? `${formatSize(Math.round((targetMb.value * progress) / 100))} / ${formatSize(targetMb.value)}`
    : `${Math.max(1, Math.round((targets.value.length * progress) / 100))} / ${targets.value.length} 本`,
)

function sumMb(list: { mb: number }[]) {
  return list.reduce((sum, v) => sum + v.mb, 0)
}

function formatSize(mb: number) {
  return mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb} MB`
}

function toggleSelectMode() {
  selectMode.value = !selectMode.value
  selected.value = {}
}

function openSheet() {
  sheetStep.value = 'choose'
  sheetOpen.value = true
}
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
          :label="selectMode ? 'キャンセル' : '選択'"
          variant="secondary"
          size="S"
          @click="toggleSelectMode"
        />
      </div>
      <ul class="list">
        <li v-for="video in videos" :key="video.no">
          <VideoItem
            v-model:selected="selected[video.no]"
            :mode="selectMode ? 'select' : 'default'"
            :status="saved[video.no] ? 'done' : 'idle'"
            :no="video.no"
            :file="video.file"
            :duration="video.duration"
            :file-size="formatSize(video.mb)"
            @download="saved[video.no] = true"
          />
        </li>
      </ul>
    </main>
    <BottomActionBar
      class="action-bar"
      :variant="selectMode ? 'selection' : 'all'"
      :count="targets.length"
      :size="targets.length ? formatSize(targetMb) : '未選択'"
      @download="openSheet"
    />
    <BulkDownloadSheet
      v-model:open="sheetOpen"
      v-model:method="method"
      :step="sheetStep"
      :player-name="player.name"
      :count="targets.length"
      :total-size="formatSize(targetMb)"
      :progress="progress"
      :detail="detail"
      @start="sheetStep = 'preparing'"
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
