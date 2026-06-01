<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-header">
        <h1>API Watcher</h1>
        <p class="subtitle">API 변경 사항 추적 시스템</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div v-if="successMessage" class="success-message">
          {{ successMessage }}
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <div v-if="showVerificationPanel" class="verification-panel">
          <p class="verification-text">
            이메일 인증이 필요합니다. 메일함에서 인증 링크를 확인해주세요.
          </p>
          <button
            type="button"
            class="btn btn-secondary btn-block"
            :disabled="isResending || !form.email"
            @click="handleResendVerification"
          >
            {{ isResending ? '재전송 중...' : '인증 메일 다시 보내기' }}
          </button>
          <p v-if="resendMessage" class="resend-message">
            {{ resendMessage }}
          </p>
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
          />
        </div>

        <button
          type="submit"
          class="btn btn-primary btn-block"
          :disabled="isLoading"
        >
          {{ isLoading ? '로그인 중...' : '로그인' }}
        </button>

        <div class="divider">
          <span>또는</span>
        </div>

        <div class="social-login">
          <button
            type="button"
            class="btn btn-social btn-github"
            @click="handleSocialLogin('github')"
            :disabled="isLoading"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub로 로그인
          </button>
          <button
            type="button"
            class="btn btn-social btn-google"
            @click="handleSocialLogin('google')"
            :disabled="isLoading"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google로 로그인
          </button>
        </div>

        <div class="form-footer">
          <p>
            계정이 없으신가요?
            <router-link to="/register" class="link">회원가입</router-link>
          </p>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth-store'
import { authService } from '@/services/auth-service'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const form = ref({ email: '', password: '' })
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const resendMessage = ref<string | null>(null)
const showVerificationPanel = ref(false)
const isLoading = ref(false)
const isResending = ref(false)

function isEmailNotConfirmed(message: string): boolean {
  const normalized = message.toLowerCase()
  return normalized.includes('email not confirmed') || normalized.includes('email_not_confirmed')
}

function applyRegisteredQuery() {
  if (route.query.registered !== '1') return

  const email = route.query.email as string | undefined
  if (email) form.value.email = email

  if (route.query.verify === '1') {
    successMessage.value = '회원가입이 완료되었습니다. 이메일 인증 후 로그인해주세요.'
    showVerificationPanel.value = true
    return
  }

  successMessage.value = '회원가입이 완료되었습니다. 로그인해주세요.'
}

async function handleLogin() {
  error.value = null
  resendMessage.value = null
  isLoading.value = true
  try {
    await authStore.login(form.value)
    router.push('/')
  } catch (err: any) {
    const message = err.message || '로그인에 실패했습니다'
    error.value = message

    if (isEmailNotConfirmed(message)) {
      showVerificationPanel.value = true
      successMessage.value = '이메일 인증이 완료되지 않았습니다. 인증 후 다시 로그인해주세요.'
    }
  } finally {
    isLoading.value = false
  }
}

async function handleResendVerification() {
  if (!form.value.email) {
    error.value = '인증 메일을 재전송하려면 이메일을 입력해주세요.'
    return
  }

  error.value = null
  resendMessage.value = null
  isResending.value = true

  try {
    await authStore.resendSignupVerification(form.value.email)
    resendMessage.value = '인증 메일을 다시 보냈습니다. 메일함을 확인해주세요.'
  } catch (err: any) {
    error.value = err.message || '인증 메일 재전송에 실패했습니다'
  } finally {
    isResending.value = false
  }
}

async function handleSocialLogin(provider: 'github' | 'google') {
  isLoading.value = true
  error.value = null
  try {
    if (provider === 'github') await authService.loginWithGithub()
    else await authService.loginWithGoogle()
  } catch (err: any) {
    error.value = err.message || `${provider} 로그인에 실패했습니다`
    isLoading.value = false
  }
}

onMounted(() => {
  if (authStore.isAuthenticated) router.push('/')

  applyRegisteredQuery()

  const errorParam = route.query.error as string | undefined
  if (errorParam === 'oauth_failed') error.value = '소셜 로그인에 실패했습니다'
})
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-secondary);
  padding: $spacing-md;
}

.login-container {
  width: 100%;
  max-width: 400px;
  background-color: var(--bg-primary);
  border-radius: $radius-lg;
  box-shadow: $shadow-lg;
  padding: $spacing-2xl;
}

.login-header {
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

.login-form {
  .success-message {
    background-color: #dcfce7;
    color: #166534;
    padding: $spacing-md;
    border-radius: $radius-md;
    margin-bottom: $spacing-lg;
    font-size: 0.875rem;
  }

  .error-message {
    background-color: #fee2e2;
    color: var(--color-danger);
    padding: $spacing-md;
    border-radius: $radius-md;
    margin-bottom: $spacing-lg;
    font-size: 0.875rem;
  }

  .verification-panel {
    background-color: var(--bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: $radius-md;
    padding: $spacing-md;
    margin-bottom: $spacing-lg;

    .verification-text {
      color: var(--color-text-secondary);
      font-size: 0.875rem;
      margin-bottom: $spacing-md;
      line-height: 1.5;
    }

    .resend-message {
      margin-top: $spacing-md;
      color: #166534;
      font-size: 0.875rem;
    }
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
  }

  .btn-block {
    width: 100%;
    margin-bottom: $spacing-lg;
  }

  .divider {
    display: flex;
    align-items: center;
    margin: $spacing-xl 0;
    text-align: center;

    &::before,
    &::after {
      content: '';
      flex: 1;
      height: 1px;
      background-color: var(--color-border);
    }

    span {
      padding: 0 $spacing-md;
      color: var(--color-text-secondary);
      font-size: 0.875rem;
    }
  }

  .social-login {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
    margin-bottom: $spacing-lg;

    .btn-social {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: $spacing-sm;
      width: 100%;
      padding: $spacing-md;
      border: 1px solid var(--color-border);
      border-radius: $radius-md;
      background-color: var(--bg-primary);
      color: var(--color-text-primary);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;

      &:hover:not(:disabled) {
        background-color: var(--bg-secondary);
        border-color: var(--color-primary);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      svg {
        flex-shrink: 0;
      }

      &.btn-github {
        &:hover:not(:disabled) {
          border-color: #24292e;
          color: #24292e;
        }
      }

      &.btn-google {
        &:hover:not(:disabled) {
          border-color: #4285f4;
          color: #4285f4;
        }
      }
    }
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
