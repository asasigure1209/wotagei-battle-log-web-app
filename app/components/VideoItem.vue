<script setup lang="ts">
import { useId } from 'vue'
import AppIcon from './AppIcon.vue'
import AppIconButton from './AppIconButton.vue'
import VideoThumb from './VideoThumb.vue'

withDefaults(
  defineProps<{
    /** 表示のしかた。default は 1 本ずつのダウンロードボタン、select は選ぶためのチェックボックスを出す */
    mode?: 'default' | 'select'
    /** 保存の状態。done のときは「保存済み」と表示する */
    status?: 'idle' | 'done'
    /** 動画の番号 */
    no: string
    /** ファイル名 */
    file: string
    /** 再生時間 (mm:ss) */
    duration: string
    /** ファイルの容量 */
    fileSize: string
  }>(),
  { mode: 'default', status: 'idle' },
)

/** 選ばれているか (select のときだけ使う) */
const selected = defineModel<boolean>('selected', { default: false })

defineEmits<{
  /** ダウンロードボタンが押されたとき (default のときだけ) */
  download: []
}>()

const checkboxId = useId()
</script>

<template>
  <div :class="['video-item', { selected: mode === 'select' && selected }]">
    <input
      v-if="mode === 'select'"
      :id="checkboxId"
      v-model="selected"
      class="checkbox"
      type="checkbox"
    >
    <VideoThumb :no="no" :duration="duration" />
    <label class="info" :for="checkboxId">
      <span class="file">{{ file }}</span>
      <span class="size">{{ fileSize }}</span>
      <span v-if="status === 'done'" class="done">
        <AppIcon name="check" :size="14" :stroke="3" />
        保存済み
      </span>
    </label>
    <AppIconButton
      v-if="mode === 'default'"
      icon="download"
      :label="`${file} をダウンロード`"
      @click="$emit('download')"
    />
  </div>
</template>

<style scoped>
.video-item {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px;
  background: var(--color-surface);
  border: 1px solid #22222a;
  border-radius: 12px;
}

.selected {
  border-color: var(--color-accent);
}

.checkbox {
  flex: none;
  width: 22px;
  height: 22px;
  margin: 0 0 0 4px;
  accent-color: var(--color-accent);
}

.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file {
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.size {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-muted);
}

.done {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-accent);
}
</style>
