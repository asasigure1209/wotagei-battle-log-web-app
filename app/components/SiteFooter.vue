<script setup lang="ts">
defineProps<{
  /** 運営の連絡先として表示する文字 */
  contact: string
  /** 運営の連絡先の URL */
  contactHref: string
}>()
</script>

<template>
  <footer class="site-footer">
    <p class="message">
      名前が見つからない・動画が足りない場合は、運営までご連絡ください。
    </p>
    <a class="contact" :href="contactHref">{{ contact }}</a>
  </footer>
</template>

<style scoped>
.site-footer {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 20px 20px 40px;
  border-top: 1px solid var(--color-line);
  background: var(--color-bg);
  font-family: var(--font-body);
  font-size: 13px;
  line-height: 1.7;
  color: var(--color-muted);
}

.message {
  margin: 0;
}

.contact {
  color: var(--color-accent);
}
</style>
