import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '@/services/auth-service'
import type { User, LoginCredentials, RegisterData } from '@/types/auth'

const TOKEN_KEY = 'api-watcher-auth-token'
const REFRESH_TOKEN_KEY = 'api-watcher-refresh-token'
const USER_KEY = 'api-watcher-user'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const refreshTokenValue = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  /**
   * localStorage에서 토큰 로드
   */
  function loadTokenFromStorage() {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY)
      const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY)
      const storedUser = localStorage.getItem(USER_KEY)

      if (storedToken && storedUser) {
        token.value = storedToken
        user.value = JSON.parse(storedUser)
      }
      if (storedRefresh) {
        refreshTokenValue.value = storedRefresh
      }
    } catch (e) {
      console.error('Failed to load token from storage:', e)
      clearAuth()
    }
  }

  /**
   * localStorage에 토큰 저장
   */
  function saveTokenToStorage(authToken: string, userData: User, authRefreshToken?: string) {
    try {
      localStorage.setItem(TOKEN_KEY, authToken)
      localStorage.setItem(USER_KEY, JSON.stringify(userData))
      token.value = authToken
      user.value = userData
      if (authRefreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, authRefreshToken)
        refreshTokenValue.value = authRefreshToken
      }
    } catch (e) {
      console.error('Failed to save token to storage:', e)
    }
  }

  /**
   * 인증 정보 초기화
   */
  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    token.value = null
    refreshTokenValue.value = null
    user.value = null
    error.value = null
  }

  /**
   * 로그인
   */
  async function login(credentials: LoginCredentials) {
    isLoading.value = true
    error.value = null

    try {
      const response = await authService.login(credentials)
      saveTokenToStorage(response.accessToken, response.user, response.refreshToken)
      return response
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || '로그인에 실패했습니다'
      error.value = errorMessage
      throw new Error(errorMessage)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 회원가입
   */
  async function register(data: RegisterData) {
    isLoading.value = true
    error.value = null

    try {
      const response = await authService.register(data)
      saveTokenToStorage(response.accessToken, response.user, response.refreshToken)
      return response
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || '회원가입에 실패했습니다'
      error.value = errorMessage
      throw new Error(errorMessage)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 로그아웃
   */
  async function logout() {
    isLoading.value = true
    error.value = null

    try {
      await authService.logout()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      clearAuth()
      isLoading.value = false
    }
  }

  /**
   * 리프레시 토큰으로 액세스 토큰 갱신
   * 성공 시 true, 실패 시 false 반환 (실패하면 로그아웃)
   */
  async function refreshTokens(): Promise<boolean> {
    const storedRefresh = refreshTokenValue.value || localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!storedRefresh) {
      clearAuth()
      return false
    }

    try {
      const response = await authService.refreshAccessToken(storedRefresh)
      saveTokenToStorage(response.accessToken, response.user, response.refreshToken)
      return true
    } catch {
      clearAuth()
      return false
    }
  }

  /**
   * 토큰 검증 및 사용자 정보 로드
   */
  async function checkAuth() {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    if (!storedToken) {
      clearAuth()
      return false
    }

    try {
      const userData = await authService.getCurrentUser(storedToken)
      token.value = storedToken
      user.value = userData
      saveTokenToStorage(storedToken, userData)
      return true
    } catch {
      // 액세스 토큰 만료 → 리프레시 토큰으로 재시도
      return await refreshTokens()
    }
  }

  // 초기화 시 토큰 로드
  loadTokenFromStorage()

  return {
    user,
    token,
    refreshTokenValue,
    isLoading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
    checkAuth,
    refreshTokens,
    loadTokenFromStorage,
    clearAuth
  }
})
