import { Router } from 'express'
import { getDiffsByProject, getDiff } from '../controllers/diffController.js'

export const diffRouter = Router()

diffRouter.get('/project/:projectId', getDiffsByProject)
diffRouter.get('/:id', getDiff)
