import { Request, Response, NextFunction } from 'express'
import prisma from '../prisma/client.js'
import { ApiError } from '../middleware/errorHandler.js'

export async function getSnapshotsByProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params

    const snapshots = await prisma.snapshot.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    })

    res.json(snapshots)
  } catch (error) {
    next(error)
  }
}

export async function getSnapshot(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params

    const snapshot = await prisma.snapshot.findUnique({
      where: { id },
      include: {
        project: true
      }
    })

    if (!snapshot) {
      const error: ApiError = new Error('Snapshot not found')
      error.statusCode = 404
      throw error
    }

    res.json(snapshot)
  } catch (error) {
    next(error)
  }
}
