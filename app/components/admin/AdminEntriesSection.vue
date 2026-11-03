<script setup lang="ts">
import { computed } from 'vue'
// 2. エントリー: 「No.: 名前」の形で 1 行に 1 人ずつ書く
import { useAdminEditor } from '~/composables/useAdminEventEditor'

const { state, entries } = useAdminEditor()
const count = computed(() => Object.keys(entries.value.entries).length)
</script>

<template>
  <section class="admin-card">
    <h2 class="admin-heading">2. エントリー</h2>
    <label class="admin-field">
      <span>1 行に 1 人、「No.: 名前」の形で書く ({{ count }} 人)</span>
      <textarea
        v-model="state.entriesText"
        class="admin-input entries"
        rows="8"
        placeholder="1: BLAZE&#10;2: しぐれ"
      />
    </label>
    <ul v-if="entries.problems.length" class="admin-warn problems">
      <li v-for="p in entries.problems" :key="p">{{ p }}</li>
    </ul>
  </section>
</template>

<style scoped>
.entries {
  padding: 10px;
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
}

.problems {
  padding-left: 20px;
}
</style>
