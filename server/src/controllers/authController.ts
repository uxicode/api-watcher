import { Request, Response, NextFunction } from 'express'
import passport from 'passport'
import prisma from '../prisma/client.js'
import { authService } from '../services/auth-service.js'
import { registerSchema, loginSchema } from '../types/auth.js'
import { ApiError } from '../middleware/errorHandler.js'
import type { AuthRequest } from '../middleware/auth.js'

const OAUTH_REDIRECT_BASE_URL = process.env.OAUTH_REDIRECT_BASE_URL || 'http://localhost:5173'

/**
 * 회원가입
 */
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    // 유효성 검사
    const validatedData = registerSchema.parse(req.body)

    // 이메일 중복 체크
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      const error: ApiError = new Error('이미 사용 중인 이메일입니다')
      error.statusCode = 409
      throw error
    }

    // 비밀번호 해싱
    const passwordHash = await authService.hashPassword(validatedData.password)

    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        passwordHash,
        name: validatedData.name || null,
        provider: 'email'
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    })

    // JWT 토큰 생성
    const tokens = authService.generateTokens(user.id, user.email)

    res.status(201).json({
      user,
      ...tokens
    })
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      next(error)
    } else {
      const apiError: ApiError = new Error('회원가입에 실패했습니다')
      apiError.statusCode = 400
      next(apiError)
    }
  }
}

/**
 * 로그인
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    // 유효성 검사
    const validatedData = loginSchema.parse(req.body)

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (!user) {
      const error: ApiError = new Error('이메일 또는 비밀번호가 올바르지 않습니다')
      error.statusCode = 401
      throw error
    }

    // 소셜 로그인 사용자는 이메일/비밀번호로 로그인할 수 없음
    if (user.provider !== 'email' || !user.passwordHash) {
      const error: ApiError = new Error('이 계정은 소셜 로그인으로 가입된 계정입니다')
      error.statusCode = 401
      throw error
    }

    // 비밀번호 검증
    const isPasswordValid = await authService.comparePassword(
      validatedData.password,
      user.passwordHash
    )

    if (!isPasswordValid) {
      const error: ApiError = new Error('이메일 또는 비밀번호가 올바르지 않습니다')
      error.statusCode = 401
      throw error
    }

    // 마지막 로그인 시간 업데이트
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    // JWT 토큰 생성
    const tokens = authService.generateTokens(user.id, user.email)

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      },
      ...tokens
    })
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      next(error)
    } else {
      const apiError: ApiError = new Error('로그인에 실패했습니다')
      apiError.statusCode = 400
      next(apiError)
    }
  }
}

/**
 * 리프레시 토큰으로 새 액세스 토큰 발급
 */
export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken: token } = req.body

    if (!token) {
      const error: ApiError = new Error('리프레시 토큰이 필요합니다')
      error.statusCode = 401
      throw error
    }

    // 리프레시 토큰 검증
    let payload: { userId: string; email: string }
    try {
      payload = authService.verifyToken(token)
    } catch {
      const error: ApiError = new Error('유효하지 않은 리프레시 토큰입니다')
      error.statusCode = 401
      throw error
    }

    // 사용자 존재 여부 확인
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, createdAt: true }
    })

    if (!user) {
      const error: ApiError = new Error('사용자를 찾을 수 없습니다')
      error.statusCode = 401
      throw error
    }

    // 새 토큰 쌍 발급
    const tokens = authService.generateTokens(user.id, user.email)

    res.json({ ...tokens, user })
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      next(error)
    } else {
      const apiError: ApiError = new Error('토큰 갱신에 실패했습니다')
      apiError.statusCode = 401
      next(apiError)
    }
  }
}

/**
 * 로그아웃 (클라이언트에서 토큰 삭제)
 * 향후 refresh token 무효화 기능 추가 가능
 */
export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    // 클라이언트에서 토큰을 삭제하도록 안내
    // 향후 refresh token을 무효화하는 로직 추가 가능
    res.json({ message: '로그아웃되었습니다' })
  } catch (error) {
    next(error)
  }
}

/**
 * 현재 사용자 정보 조회
 */
export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      const error: ApiError = new Error('인증이 필요합니다')
      error.statusCode = 401
      throw error
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true
      }
    })

    if (!user) {
      const error: ApiError = new Error('사용자를 찾을 수 없습니다')
      error.statusCode = 404
      throw error
    }

    res.json(user)
  } catch (error) {
    next(error)
  }
}

/**
 * GitHub OAuth 시작
 */
export function githubAuth(req: Request, res: Response, next: NextFunction) {
  passport.authenticate('github', { scope: ['user:email'] })(req, res, next)
}

/**
 * GitHub OAuth 콜백
 */
export function githubCallback(req: Request, res: Response, next: NextFunction) {
  passport.authenticate('github', { session: false }, (err: any, user: any) => {
    if (err || !user) {
      return res.redirect(`${OAUTH_REDIRECT_BASE_URL}/login?error=github_auth_failed`)
    }

    try {
      const tokens = authService.generateTokens(user.id, user.email)
      const tokenParam = encodeURIComponent(tokens.accessToken)
      res.redirect(`${OAUTH_REDIRECT_BASE_URL}/auth/callback?token=${tokenParam}`)
    } catch (error) {
      res.redirect(`${OAUTH_REDIRECT_BASE_URL}/login?error=token_generation_failed`)
    }
  })(req, res, next)
}

/**
 * Google OAuth 시작
 */
export function googleAuth(req: Request, res: Response, next: NextFunction) {
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next)
}

/**
 * Google OAuth 콜백
 */
export function googleCallback(req: Request, res: Response, next: NextFunction) {
  passport.authenticate('google', { session: false }, (err: any, user: any) => {
    if (err || !user) {
      return res.redirect(`${OAUTH_REDIRECT_BASE_URL}/login?error=google_auth_failed`)
    }

    try {
      const tokens = authService.generateTokens(user.id, user.email)
      const tokenParam = encodeURIComponent(tokens.accessToken)
      res.redirect(`${OAUTH_REDIRECT_BASE_URL}/auth/callback?token=${tokenParam}`)
    } catch (error) {
      res.redirect(`${OAUTH_REDIRECT_BASE_URL}/login?error=token_generation_failed`)
    }
  })(req, res, next)
}
