import passport from 'passport'
import { Strategy as GitHubStrategy } from 'passport-github2'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import prisma from '../prisma/client.js'
import { authService } from './auth-service.js'
import type { AuthProvider } from '../types/auth.js'

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const OAUTH_REDIRECT_BASE_URL = process.env.OAUTH_REDIRECT_BASE_URL || 'http://localhost:5173'
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001'

/**
 * 소셜 로그인 사용자 찾기 또는 생성
 */
async function findOrCreateSocialUser(
  provider: AuthProvider,
  providerId: string,
  email: string,
  name: string | null
) {
  // provider와 providerId로 기존 사용자 조회
  const existingUser = await prisma.user.findUnique({
    where: {
      provider_providerId: {
        provider,
        providerId
      }
    }
  })

  if (existingUser) {
    // 마지막 로그인 시간 업데이트
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { lastLoginAt: new Date() }
    })
    return existingUser
  }

  // 이메일로 기존 사용자 확인 (다른 provider로 가입한 경우)
  const userByEmail = await prisma.user.findUnique({
    where: { email }
  })

  if (userByEmail) {
    // 기존 사용자가 있으면 provider 정보 업데이트
    const updatedUser = await prisma.user.update({
      where: { id: userByEmail.id },
      data: {
        provider,
        providerId,
        lastLoginAt: new Date()
      }
    })
    return updatedUser
  }

  // 새 사용자 생성
  const newUser = await prisma.user.create({
    data: {
      email,
      name,
      provider,
      providerId,
      passwordHash: null, // 소셜 로그인은 비밀번호 없음
      emailVerified: true, // 소셜 로그인은 이메일 인증됨으로 간주
      lastLoginAt: new Date()
    }
  })

  return newUser
}

/**
 * GitHub OAuth 전략 설정
 */
if (GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
        callbackURL: `${SERVER_URL}/api/auth/github/callback`
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          const email = profile.emails?.[0]?.value || `${profile.username}@github.local`
          const name = profile.displayName || profile.username
          const providerId = profile.id.toString()

          const user = await findOrCreateSocialUser('github', providerId, email, name)
          return done(null, user)
        } catch (error) {
          return done(error, null)
        }
      }
    )
  )
}

/**
 * Google OAuth 전략 설정
 */
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: `${SERVER_URL}/api/auth/google/callback`
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          const email = profile.emails?.[0]?.value
          if (!email) {
            return done(new Error('이메일 정보를 가져올 수 없습니다'), null)
          }

          const name = profile.displayName || profile.name?.givenName || null
          const providerId = profile.id

          const user = await findOrCreateSocialUser('google', providerId, email, name)
          return done(null, user)
        } catch (error) {
          return done(error, null)
        }
      }
    )
  )
}

/**
 * Passport 세션 직렬화 (JWT 사용 시 필요 없지만 설정)
 */
passport.serializeUser((user: any, done) => {
  done(null, user.id)
})

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } })
    done(null, user)
  } catch (error) {
    done(error, null)
  }
})

export default passport
