import { supabase } from '@/lib/supabase'
import type { LoginCredentials, RegisterData } from '@/types/auth'

class AuthService {
  /**
   * 이메일/비밀번호 로그인
   * Supabase가 세션(accessToken + refreshToken)을 자동 관리
   */
  async login(credentials: LoginCredentials) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    })
    if (error) throw new Error(error.message)
    return data
  }

  /**
   * 회원가입
   */
  async register(data: RegisterData) {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { name: data.name ?? null }
      }
    })
    if (error) throw new Error(error.message)
    return authData
  }

  /**
   * 회원가입 확인 메일 재전송
   */
  async resendSignupVerification(email: string) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) throw new Error(error.message)
  }

  /**
   * 로그아웃
   */
  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('[AuthService] 로그아웃 오류:', error.message)
  }

  /**
   * GitHub OAuth 로그인
   */
  async loginWithGithub() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) throw new Error(error.message)
  }

  /**
   * Google OAuth 로그인
   */
  async loginWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) throw new Error(error.message)
  }

  /**
   * 현재 세션 가져오기
   */
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }

  /**
   * 현재 사용자 정보
   */
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }
}

export const authService = new AuthService()
