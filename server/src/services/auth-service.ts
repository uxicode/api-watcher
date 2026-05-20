import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

export interface TokenPayload {
  userId: string
  email: string
}

export interface Tokens {
  accessToken: string
  refreshToken: string
}

export class AuthService {
  /**
   * 비밀번호를 bcrypt로 해싱
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12
    return bcrypt.hash(password, saltRounds)
  }

  /**
   * 비밀번호 검증
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  /**
   * JWT 토큰 생성 (Access Token + Refresh Token)
   */
  generateTokens(userId: string, email: string): Tokens {
    const payload: TokenPayload = { userId, email }

    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    })

    const refreshToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN
    })

    return { accessToken, refreshToken }
  }

  /**
   * JWT 토큰 검증
   */
  verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload
      return decoded
    } catch (error) {
      throw new Error('Invalid or expired token')
    }
  }
}

export const authService = new AuthService()
