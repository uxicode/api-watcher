import { Request, Response, NextFunction } from 'express'
import { authService } from '../services/auth-service.js'
import { ApiError } from './errorHandler.js'

export interface AuthRequest extends Request {
  user?: {
    userId: string
    email: string
  }
}

/**
 * JWT 토큰 인증 미들웨어
 * Authorization 헤더에서 Bearer 토큰을 추출하고 검증합니다.
 */
export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // "Bearer TOKEN"

    if (!token) {
      const error: ApiError = new Error('인증 토큰이 필요합니다')
      error.statusCode = 401
      throw error
    }

    const decoded = authService.verifyToken(token)
    req.user = {
      userId: decoded.userId,
      email: decoded.email
    }

    next()
  } catch (error) {
    const apiError: ApiError = error instanceof Error 
      ? error as ApiError
      : new Error('인증에 실패했습니다')
    
    apiError.statusCode = 401
    next(apiError)
  }
}
