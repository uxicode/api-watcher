import { Router } from 'express'
import { getDiffsByProject, getDiff } from '../controllers/diffController.js'
import { authenticateToken } from '../middleware/auth.js'

export const diffRouter = Router()

// 모든 Diff 라우트에 인증 필요
diffRouter.use(authenticateToken)

diffRouter.get('/project/:projectId', getDiffsByProject)
diffRouter.get('/:id', getDiff)
