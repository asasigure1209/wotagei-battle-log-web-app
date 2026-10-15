<script setup lang="ts">
import AppIcon, { type IconName } from './AppIcon.vue'

withDefaults(
  defineProps<{
    /** 表示するアイコン */
    icon: IconName
    /** 見た目の種類。単独で目立たせたいときは outline、シートの隅などに控えめに置くときは ghost を使う */
    variant?: 'outline' | 'ghost'
    /** 読み上げ用の名前 (画面には表示しない) */
    label: string
  }>(),
  { variant: 'outline' },
)

defineEmits<{
  /** ボタンが押されたとき */
  click: [event: MouseEvent]
}>()
</script>

<template>
  <button
    type="button"
    :class="['app-icon-button', variant]"
    :aria-label="label"
    @click="$emit('click', $event)"
  >
    <AppIcon :name="icon" :size="20" />
  </button>
</template>

<style scoped>
.app-icon-button {
  box-sizing: border-box;
  flex: none;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 12px;
  cursor: pointer;
}

.outline {
  background: #1e1e26;
  border: 1px solid var(--color-border-strong);
  color: var(--color-text);
}

.ghost {
  background: transparent;
  border: none;
  color: var(--color-muted);
}
</style>
