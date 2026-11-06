<script setup lang="ts">
// 3. DB に登録: 書いた名前を、選んだイベントのエントリーとして登録する。登録できたら、動画の登録へ案内する

import { useAdminEntriesForm } from '~/composables/useAdminEntriesForm'

const { state, canSave, currentKey, save } = useAdminEntriesForm()
</script>

<template>
  <section class="admin-card">
    <h2 class="admin-heading">3. DB に登録</h2>
    <p class="admin-hint">
      登録すると、選んだイベントのエントリーを書いた名前で入れ直します (No.
      は書いた順に 1
      から)。動画・出演者はそのまま残ります。動画に出ているエントリーが消える登録はできません。
    </p>
    <p v-if="state.entryNosProblem" class="admin-warn">
      {{ state.entryNosProblem }}
    </p>
    <div class="admin-actions">
      <button
        type="button"
        class="admin-btn"
        :disabled="!canSave"
        @click="save(true)"
      >
        確認だけ
      </button>
      <button
        type="button"
        class="admin-btn primary"
        :disabled="!canSave"
        @click="save(false)"
      >
        登録する
      </button>
      <NuxtLink
        v-if="state.registered && currentKey"
        class="link"
        :to="`/admin/videos?event=${currentKey}`"
      >
        このイベントの動画を登録する
      </NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.link {
  color: var(--color-accent);
  font-size: 14px;
}
</style>
