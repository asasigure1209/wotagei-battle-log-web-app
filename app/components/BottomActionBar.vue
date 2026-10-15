<script setup lang="ts">
import AppButton from './AppButton.vue'

withDefaults(
  defineProps<{
    /** 表示のしかた。all はすべての動画をダウンロードするボタン、selection は選んだ動画の数とダウンロードボタンを出す */
    variant?: 'all' | 'selection'
    /** 動画の本数 (all のときに使う) */
    count: number
    /** 動画の合計の容量 (all のときに使う) */
    totalSize: string
    /** 選んだ動画の本数 (selection のときに使う)。0 本のときはダウンロードボタンを押せない */
    selCount: number
    /** 選んだ動画の合計の容量 (selection のときに使う) */
    selSize: string
  }>(),
  { variant: 'all' },
)

defineEmits<{
  /** ダウンロードボタンが押されたとき */
  download: []
}>()
</script>

<template>
  <div class="bottom-action-bar">
    <AppButton
      v-if="variant === 'all'"
      label="すべてダウンロード"
      size="L"
      icon="download"
      :meta="`${count}本 · ${totalSize}`"
      full
      @click="$emit('download')"
    />
    <div v-else class="selection">
      <div class="summary">
        <span class="sel-count">{{ selCount }}本を選択中</span>
        <span class="sel-size">{{ selSize }}</span>
      </div>
      <AppButton
        label="ダウンロード"
        :disabled="selCount === 0"
        @click="$emit('download')"
      />
    </div>
  </div>
</template>

<style scoped>
.bottom-action-bar {
  box-sizing: border-box;
  width: 100%;
  padding: 12px 16px 20px;
  background: rgb(10 10 13 / 94%);
  border-top: 1px solid var(--color-line);
  backdrop-filter: blur(8px);
  color: var(--color-text);
  font-family: var(--font-body);
}

.selection {
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sel-count {
  font-size: 15px;
  font-weight: 700;
}

.sel-size {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-muted);
}
</style>
