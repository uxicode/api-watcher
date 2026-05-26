import axios from 'axios'
import type { LoginCredentials, RegisterData, AuthResponse, User } from '@/types/auth'

// 자체 백엔드 주소: 환경변수 우선, 없으면 localhost:3001 폴백
const AUTH_BASE_URL = (import.meta.env.VITE_AUTH_API_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:3001'

class AuthService {
  /**
   * 로그인
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(
      `${AUTH_BASE_URL}/api/auth/login`,
      credentials
    )
    return response.data
  }

  /**
   * 회원가입
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(
      `${AUTH_BASE_URL}/api/auth/register`,
      data
    )
    return response.data
  }

  /**
   * 로그아웃
   */
  async logout(): Promise<void> {
    try {
      await axios.post(`${AUTH_BASE_URL}/api/auth/logout`)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  /**
   * 리프레시 토큰으로 새 액세스 토큰 발급
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(
      `${AUTH_BASE_URL}/api/auth/refresh`,
      { refreshToken }
    )
    return response.data
  }

  /**
   * 현재 사용자 정보 조회
   */
  async getCurrentUser(token: string): Promise<User> {
    const response = await axios.get<User>(`${AUTH_BASE_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    return response.data
  }
}

export const authService = new AuthService()
