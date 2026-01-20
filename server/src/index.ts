import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { projectRouter } from './routes/projects.js'
import { snapshotRouter } from './routes/snapshots.js'
import { diffRouter } from './routes/diffs.js'
import { errorHandler } from './middleware/errorHandler.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/projects', projectRouter)
app.use('/api/snapshots', snapshotRouter)
app.use('/api/diffs', diffRouter)

// Error handler
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`)
})
