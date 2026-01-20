import { Router } from 'express'
import { getSnapshotsByProject, getSnapshot } from '../controllers/snapshotController.js'

export const snapshotRouter = Router()

snapshotRouter.get('/project/:projectId', getSnapshotsByProject)
snapshotRouter.get('/:id', getSnapshot)
