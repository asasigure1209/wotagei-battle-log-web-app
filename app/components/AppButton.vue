<script setup lang="ts">
import AppIcon from './AppIcon.vue'

withDefaults(
  defineProps<{
    /** ボタンに表示する文字 */
    label: string
    /** 見た目の種類。主要な操作には primary、それ以外には secondary を使う */
    variant?: 'primary' | 'secondary'
    /** 大きさ。画面下の大きな操作には L、一覧の見出しの横に置く小さな操作には S を使う */
    size?: 'L' | 'M' | 'S'
    /** 文字の前に置くアイコン */
    icon?: 'download'
    /** 文字の後ろに添える補足 (本数や容量など) */
    meta?: string
    /** true にすると親の幅いっぱいに広がる */
    full?: boolean
    /** true にするとボタンを押せなくなる */
    disabled?: boolean
  }>(),
  { variant: 'primary', size: 'M', full: false, disabled: false },
)

defineEmits<{
  /** ボタンが押されたとき (disabled のときは発火しない) */
  click: [event: MouseEvent]
}>()
</script>

<template>
  <button
    type="button"
    :class="['app-button', variant, `size-${size}`, { full }]"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <AppIcon v-if="icon" :name="icon" :size="20" :stroke="2.4" />
    <span>{{ label }}</span>
    <span v-if="meta" class="meta">{{ meta }}</span>
  </button>
</template>

<style scoped>
.app-button {
  box-sizing: border-box;
  width: fit-content;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: none;
  font-family: var(--font-body);
  cursor: pointer;
}

.full {
  width: 100%;
}

.size-L {
  min-height: 56px;
  padding: 0 24px;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 700;
}

.size-M {
  min-height: 52px;
  padding: 0 22px;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 700;
}

.size-S {
  min-height: 44px;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
}

.primary {
  background: var(--color-accent);
  color: var(--color-bg);
}

.secondary {
  background: transparent;
  border: 1px solid var(--color-border-strong);
  color: var(--color-text);
}

.app-button:disabled {
  background: var(--color-border);
  border: none;
  color: #8a8a96;
  cursor: default;
}

.meta {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
}
</style>
