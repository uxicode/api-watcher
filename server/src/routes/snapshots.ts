import { Router } from 'express'
import { getSnapshotsByProject, getSnapshot } from '../controllers/snapshotController.js'
import { authenticateToken } from '../middleware/auth.js'

export const snapshotRouter = Router()

// 모든 스냅샷 라우트에 인증 필요
snapshotRouter.use(authenticateToken)

snapshotRouter.get('/project/:projectId', getSnapshotsByProject)
snapshotRouter.get('/:id', getSnapshot)
