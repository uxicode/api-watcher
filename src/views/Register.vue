<template>
  <div class="register-page">
    <div class="register-container">
      <div class="register-header">
        <h1>회원가입</h1>
        <p class="subtitle">API Watcher에 오신 것을 환영합니다</p>
      </div>

      <form @submit.prevent="handleRegister" class="register-form">
        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <div class="form-group">
          <label for="email">이메일</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            required
            placeholder="your@email.com"
            :disabled="isLoading"
          />
        </div>

        <div class="form-group">
          <label for="password">비밀번호</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            required
            placeholder="비밀번호를 입력하세요"
            :disabled="isLoading"
            minlength="3"
          />
        </div>

        <div class="form-group">
          <label for="passwordConfirm">비밀번호 확인</label>
          <input
            id="passwordConfirm"
            v-model="form.passwordConfirm"
            type="password"
            required
            placeholder="비밀번호를 다시 입력하세요"
            :disabled="isLoading"
          />
          <p v-if="form.passwordConfirm && form.password !== form.passwordConfirm" class="error-text">
            비밀번호가 일치하지 않습니다.
          </p>
        </div>

        <div class="form-group">
          <label for="name">이름 (선택사항)</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            placeholder="홍길동"
            :disabled="isLoading"
          />
        </div>

        <button
          type="submit"
          class="btn btn-primary btn-block"
          :disabled="isLoading || !isFormValid"
        >
          {{ isLoading ? '가입 중...' : '회원가입' }}
        </button>

        <div class="form-footer">
          <p>
            이미 계정이 있으신가요?
            <router-link to="/login" class="link">로그인</router-link>
          </p>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth-store'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  email: '',
  password: '',
  passwordConfirm: '',
  name: ''
})

const error = ref<string | null>(null)
const isLoading = ref(false)

const isFormValid = computed(() => {
  return (
    form.value.email &&
    form.value.password.length >= 4 &&
    form.value.password === form.value.passwordConfirm // &&
    // /[a-zA-Z]/.test(form.value.password) &&
    // /[0-9]/.test(form.value.password)
  )
})

async function handleRegister() {
  if (!isFormValid.value) {
    error.value = '입력 정보를 확인해주세요.'
    return
  }

  error.value = null
  isLoading.value = true

  try {
    const result = await authStore.register({
      email: form.value.email,
      password: form.value.password,
      name: form.value.name || undefined
    })

    const needsVerification = !result.user?.email_confirmed_at

    // signUp 직후 자동 세션이 생기면 로그인 페이지로 이동하기 전 홈으로 리다이렉트될 수 있음
    if (authStore.isAuthenticated) {
      await authStore.logout()
    }

    await router.push({
      path: '/login',
      query: {
        registered: '1',
        email: form.value.email,
        ...(needsVerification ? { verify: '1' } : {})
      }
    })
  } catch (err: any) {
    if (err.code.includes('over_email_send_rate_limit')) {
      error.value = '인증 메일 전송 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.'
    } else {
      error.value = err.message || '회원가입에 실패했습니다'
    }
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  // 이미 로그인되어 있으면 홈으로 리다이렉트
  if (authStore.isAuthenticated) {
    router.push('/')
  }
})
</script>

<style lang="scss" scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-secondary);
  padding: $spacing-md;
}

.register-container {
  width: 100%;
  max-width: 400px;
  background-color: var(--bg-primary);
  border-radius: $radius-lg;
  box-shadow: $shadow-lg;
  padding: $spacing-2xl;
}

.register-header {
  text-align: center;
  margin-bottom: $spacing-2xl;

  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text-primary);
    margin-bottom: $spacing-sm;
  }

  .subtitle {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }
}

.register-form {
  .error-message {
    background-color: #fee2e2;
    color: var(--color-danger);
    padding: $spacing-md;
    border-radius: $radius-md;
    margin-bottom: $spacing-lg;
    font-size: 0.875rem;
  }

  .form-group {
    margin-bottom: $spacing-lg;

    label {
      display: block;
      margin-bottom: $spacing-sm;
      color: var(--color-text-primary);
      font-weight: 500;
      font-size: 0.875rem;
    }

    input {
      width: 100%;
      padding: $spacing-md;
      border: 1px solid var(--color-border);
      border-radius: $radius-md;
      font-size: 1rem;
      transition: border-color 0.2s;

      &:focus {
        outline: none;
        border-color: var(--color-primary);
      }

      &:disabled {
        background-color: var(--bg-secondary);
        cursor: not-allowed;
      }
    }

    .help-text {
      margin-top: $spacing-xs;
      color: var(--color-text-secondary);
      font-size: 0.75rem;
    }

    .error-text {
      margin-top: $spacing-xs;
      color: var(--color-danger);
      font-size: 0.75rem;
    }
  }

  .btn-block {
    width: 100%;
    margin-bottom: $spacing-lg;
  }

  .form-footer {
    text-align: center;
    margin-top: $spacing-lg;

    p {
      color: var(--color-text-secondary);
      font-size: 0.875rem;
    }

    .link {
      color: var(--color-primary);
      text-decoration: none;
      font-weight: 500;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}
</style>
