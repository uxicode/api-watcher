import { Request, Response, NextFunction } from 'express'
import prisma from '../prisma/client.js'
import { ApiError } from '../middleware/errorHandler.js'
import type { AuthRequest } from '../middleware/auth.js'

export async function getSnapshotsByProject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      const error: ApiError = new Error('인증이 필요합니다')
      error.statusCode = 401
      throw error
    }

    const { projectId } = req.params

    // 프로젝트 소유 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      const error: ApiError = new Error('Project not found')
      error.statusCode = 404
      throw error
    }

    if (project.userId !== req.user.userId) {
      const error: ApiError = new Error('권한이 없습니다')
      error.statusCode = 403
      throw error
    }

    const snapshots = await prisma.snapshot.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    })

    res.json(snapshots)
  } catch (error) {
    next(error)
  }
}

export async function getSnapshot(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      const error: ApiError = new Error('인증이 필요합니다')
      error.statusCode = 401
      throw error
    }

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

    // 프로젝트 소유 확인
    if (snapshot.project.userId !== req.user.userId) {
      const error: ApiError = new Error('권한이 없습니다')
      error.statusCode = 403
      throw error
    }

    res.json(snapshot)
  } catch (error) {
    next(error)
  }
}
