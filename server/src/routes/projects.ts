import { Router } from 'express'
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  collectSwagger
} from '../controllers/projectController.js'
import { authenticateToken } from '../middleware/auth.js'

export const projectRouter = Router()

// 모든 프로젝트 라우트에 인증 필요
projectRouter.use(authenticateToken)

projectRouter.get('/', getProjects)
projectRouter.get('/:id', getProject)
projectRouter.post('/', createProject)
projectRouter.put('/:id', updateProject)
projectRouter.delete('/:id', deleteProject)
projectRouter.post('/:id/collect', collectSwagger)
