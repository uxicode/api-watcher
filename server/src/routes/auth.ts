import { Router } from 'express'
import {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  githubAuth,
  githubCallback,
  googleAuth,
  googleCallback
} from '../controllers/authController.js'
import { authenticateToken } from '../middleware/auth.js'

export const authRouter = Router()

// 공개 라우트
authRouter.post('/register', register)
authRouter.post('/login', login)
authRouter.post('/logout', logout)
authRouter.post('/refresh', refreshToken)

// 소셜 로그인 라우트
authRouter.get('/github', githubAuth)
authRouter.get('/github/callback', githubCallback)
authRouter.get('/google', googleAuth)
authRouter.get('/google/callback', googleCallback)

// 인증 필요 라우트
authRouter.get('/me', authenticateToken, getMe)
