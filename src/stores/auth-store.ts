import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { authService } from '@/services/auth-service'
import type { User } from '@/types/auth'
import type { Session } from '@supabase/supabase-js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!session.value && !!user.value)
  // api-service 인터셉터에서 token 사용하므로 computed로 노출
  const token = computed(() => session.value?.access_token ?? null)

  function setSession(newSession: Session | null) {
    session.value = newSession
    if (newSession?.user) {
      user.value = {
        id: newSession.user.id,
        email: newSession.user.email ?? '',
        name: newSession.user.user_metadata?.name ?? null,
        emailVerified: !!newSession.user.email_confirmed_at,
        createdAt: newSession.user.created_at,
        updatedAt: newSession.user.updated_at ?? newSession.user.created_at,
        lastLoginAt: newSession.user.last_sign_in_at ?? null
      }
    } else {
      user.value = null
    }
  }

  function clearAuth() {
    session.value = null
    user.value = null
    error.value = null
  }

  async function login(credentials: { email: string; password: string }) {
    isLoading.value = true
    error.value = null
    try {
      const data = await authService.login(credentials)
      setSession(data.session)
      return data
    } catch (err: any) {
      error.value = err.message || '로그인에 실패했습니다'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function register(data: { email: string; password: string; name?: string }) {
    isLoading.value = true
    error.value = null
    try {
      return await authService.register(data)
    } catch (err: any) {
      error.value = err.message || '회원가입에 실패했습니다'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function resendSignupVerification(email: string) {
    isLoading.value = true
    error.value = null
    try {
      await authService.resendSignupVerification(email)
    } catch (err: any) {
      error.value = err.message || '인증 메일 재전송에 실패했습니다'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    isLoading.value = true
    try {
      await authService.logout()
    } finally {
      clearAuth()
      isLoading.value = false
    }
  }

  /**
   * 앱 시작 시 Supabase 세션 복원 + 변경 감지
   */
  async function checkAuth(): Promise<boolean> {
    const currentSession = await authService.getSession()
    setSession(currentSession)
    return !!currentSession
  }

  /**
   * Supabase 자동 토큰 갱신: onAuthStateChange로 세션 업데이트
   * App.vue에서 한 번만 호출
   */
  function listenAuthChanges() {
    supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
  }

  // refreshTokens: Supabase가 자동 처리하지만 api-service 호환성을 위해 유지
  async function refreshTokens(): Promise<boolean> {
    const { data, error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError || !data.session) {
      clearAuth()
      return false
    }
    setSession(data.session)
    return true
  }

  return {
    user,
    token,
    session,
    isLoading,
    error,
    isAuthenticated,
    login,
    register,
    resendSignupVerification,
    logout,
    checkAuth,
    clearAuth,
    setSession,
    listenAuthChanges,
    refreshTokens
  }
})
