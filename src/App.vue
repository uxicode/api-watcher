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
  // 앱 시작 시 토큰 검증
  await authStore.checkAuth()
})
</script>

<style lang="scss">
#app {
  min-height: 100vh;
  background-color: var(--bg-primary);
}
</style>
