<template>
  <div class="callback-page">
    <p v-if="error" class="error-text">{{ error }}</p>
    <p v-else>로그인 처리 중...</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'

const router = useRouter()
const authStore = useAuthStore()
const error = ref<string | null>(null)

onMounted(async () => {
  // Supabase OAuth 콜백: URL 해시에서 세션 자동 파싱
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !session) {
    error.value = '로그인 처리 중 오류가 발생했습니다'
    setTimeout(() => router.push('/login?error=oauth_failed'), 2000)
    return
  }

  authStore.setSession(session)
  router.push('/')
})
</script>

<style lang="scss" scoped>
.callback-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  color: var(--text-secondary);

  .error-text {
    color: var(--color-danger);
  }
}
</style>
