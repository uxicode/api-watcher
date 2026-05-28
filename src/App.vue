<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth-store'

const authStore = useAuthStore()

onMounted(async () => {
  // Supabase 세션 복원 + 변경 감지 등록
  authStore.listenAuthChanges()
  await authStore.checkAuth()
})
</script>

<style lang="scss">
#app {
  min-height: 100vh;
  background-color: var(--bg-primary);
}
</style>
