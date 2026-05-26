import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import session from 'express-session'
import passport from 'passport'
import { projectRouter } from './routes/projects.js'
import { snapshotRouter } from './routes/snapshots.js'
import { diffRouter } from './routes/diffs.js'
import { authRouter } from './routes/auth.js'
import { proxyRouter } from './routes/proxy.js'
import { errorHandler } from './middleware/errorHandler.js'
import './services/passport-strategies.js' // Passport 전략 초기화

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
// app.use -> 미들웨어 함수를 등록하는 메서드이다.
// cors -> 크로스 오리진 요청을 허용하는 미들웨어 함수이다.
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}))
// express.json -> JSON 형식의 요청 본문을 파싱하는 미들웨어 함수이다.
app.use(express.json())
// express.urlencoded -> URL 인코딩된 요청 본문을 파싱하는 미들웨어 함수이다.
app.use(express.urlencoded({ extended: true }))

// Passport 세션 설정 (OAuth 인증용)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'default-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24시간
    }
  })
)

// Passport 초기화
app.use(passport.initialize())
app.use(passport.session())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/auth', authRouter)
app.use('/api/projects', projectRouter)
app.use('/api/snapshots', snapshotRouter)
app.use('/api/diffs', diffRouter)
app.use('/api/proxy', proxyRouter)

// Error handler
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`)
})
