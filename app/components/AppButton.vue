<script setup lang="ts">
withDefaults(
  defineProps<{
    /** ボタンに表示する文字 */
    label: string
    /** 見た目の種類。主要な操作には primary、それ以外には secondary を使う */
    variant?: 'primary' | 'secondary'
    /** true にするとボタンを押せなくなる */
    disabled?: boolean
  }>(),
  { variant: 'primary', disabled: false },
)

defineEmits<{
  /** ボタンが押されたとき (disabled のときは発火しない) */
  click: [event: MouseEvent]
}>()
</script>

<template>
  <button
    type="button"
    :class="['app-button', variant]"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    {{ label }}
  </button>
</template>

<style scoped>
.app-button {
  padding: 0.5em 1.25em;
  border: 2px solid #e4007f;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
}

.primary {
  background: #e4007f;
  color: #fff;
}

.secondary {
  background: transparent;
  color: #e4007f;
}

.app-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
