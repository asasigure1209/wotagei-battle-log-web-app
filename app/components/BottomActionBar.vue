<script setup lang="ts">
import AppButton from './AppButton.vue'

withDefaults(
  defineProps<{
    /** 表示のしかた。all はすべての動画をダウンロードするボタン、selection は選んだ動画の数とダウンロードボタンを出す */
    variant?: 'all' | 'selection'
    /** 動画の本数。all ではすべての動画、selection では選んだ動画の本数。selection で 0 本のときはダウンロードボタンを押せない */
    count: number
    /** count 本の動画の合計の容量 */
    size: string
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
      :meta="`${count}本 · ${size}`"
      full
      @click="$emit('download')"
    />
    <div v-else class="selection">
      <div class="summary">
        <span class="sel-count">{{ count }}本を選択中</span>
        <span class="sel-size">{{ size }}</span>
      </div>
      <AppButton
        label="ダウンロード"
        :disabled="count === 0"
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
  background: color-mix(in srgb, var(--color-bg) 94%, transparent);
  border-top: 1px solid var(--color-line);
  backdrop-filter: blur(8px);
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
