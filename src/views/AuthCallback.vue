<template>
  <div class="auth-callback-page">
    <div class="auth-callback-container">
      <div v-if="isLoading" class="loading">
        <div class="spinner"></div>
        <p>로그인 처리 중...</p>
      </div>
      <div v-else-if="error" class="error">
        <p>{{ error }}</p>
        <router-link to="/login" class="btn btn-primary">로그인 페이지로 돌아가기</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth-store'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const isLoading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const token = route.query.token as string | undefined

    if (!token) {
      error.value = '토큰을 받지 못했습니다'
      isLoading.value = false
      return
    }

    // 토큰 저장
    authStore.token = token

    // 사용자 정보 가져오기
    await authStore.checkAuth()

    // 홈으로 리다이렉트
    router.push('/')
  } catch (err: any) {
    error.value = err.message || '로그인 처리 중 오류가 발생했습니다'
    isLoading.value = false
  }
})
</script>

<style lang="scss" scoped>
.auth-callback-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-secondary);
  padding: $spacing-md;
}

.auth-callback-container {
  width: 100%;
  max-width: 400px;
  background-color: var(--bg-primary);
  border-radius: $radius-lg;
  box-shadow: $shadow-lg;
  padding: $spacing-2xl;
  text-align: center;
}

.loading {
  .spinner {
    width: 40px;
    height: 40px;
    margin: 0 auto $spacing-lg;
    border: 4px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  p {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }
}

.error {
  p {
    color: var(--color-danger);
    margin-bottom: $spacing-lg;
    font-size: 0.875rem;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
