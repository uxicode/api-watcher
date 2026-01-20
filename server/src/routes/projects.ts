import { Router } from 'express'
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  collectSwagger
} from '../controllers/projectController.js'

export const projectRouter = Router()

projectRouter.get('/', getProjects)
projectRouter.get('/:id', getProject)
projectRouter.post('/', createProject)
projectRouter.put('/:id', updateProject)
projectRouter.delete('/:id', deleteProject)
projectRouter.post('/:id/collect', collectSwagger)
