export type AuthProvider = 'email' | 'github' | 'google'

export interface User {
  id: string
  email: string
  name?: string | null
  provider?: AuthProvider
  emailVerified: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt?: string | null
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
