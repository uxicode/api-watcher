export type AuthProvider = 'email' | 'github' | 'google'

export interface User {
  id: string
  email: string
  name?: string
  provider?: AuthProvider
  emailVerified: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name?: string
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}
