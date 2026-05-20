import axios from 'axios'
import type { LoginCredentials, RegisterData, AuthResponse, User } from '@/types/auth'
import { useSettingsStore } from '@/stores/settings-store'

class AuthService {
  private getBaseURL(): string {
    const settingsStore = useSettingsStore()
    return settingsStore.apiBaseUrl || ''
  }

  /**
   * 로그인
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const baseURL = this.getBaseURL()
    if (!baseURL) {
      throw new Error('백엔드 서버 주소가 설정되지 않았습니다')
    }

    const response = await axios.post<AuthResponse>(
      `${baseURL}/api/auth/login`,
      credentials
    )
    return response.data
  }

  /**
   * 회원가입
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const baseURL = this.getBaseURL()
    if (!baseURL) {
      throw new Error('백엔드 서버 주소가 설정되지 않았습니다')
    }

    const response = await axios.post<AuthResponse>(
      `${baseURL}/api/auth/register`,
      data
    )
    return response.data
  }

  /**
   * 로그아웃
   */
  async logout(): Promise<void> {
    const baseURL = this.getBaseURL()
    if (!baseURL) {
      return
    }

    try {
      await axios.post(`${baseURL}/api/auth/logout`)
    } catch (error) {
      // 로그아웃 실패해도 클라이언트에서 토큰 삭제는 진행
      console.error('Logout error:', error)
    }
  }

  /**
   * 리프레시 토큰으로 새 액세스 토큰 발급
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthResponse> {
    const baseURL = this.getBaseURL()
    if (!baseURL) {
      throw new Error('백엔드 서버 주소가 설정되지 않았습니다')
    }

    const response = await axios.post<AuthResponse>(
      `${baseURL}/api/auth/refresh`,
      { refreshToken }
    )
    return response.data
  }

  /**
   * 현재 사용자 정보 조회
   */
  async getCurrentUser(token: string): Promise<User> {
    const baseURL = this.getBaseURL()
    if (!baseURL) {
      throw new Error('백엔드 서버 주소가 설정되지 않았습니다')
    }

    const response = await axios.get<User>(`${baseURL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    return response.data
  }
}

export const authService = new AuthService()
