import { Request, Response, NextFunction } from 'express'
import prisma from '../prisma/client.js'
import { ApiError } from '../middleware/errorHandler.js'
import type { AuthRequest } from '../middleware/auth.js'

export async function getDiffsByProject(req: AuthRequest, res: Response, next: NextFunction) {
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

    // 프로젝트별 Diff 목록 조회 (previousSnapshot, currentSnapshot 포함)
    const diffs = await prisma.diffResult.findMany({
      where: { projectId },
      orderBy: { comparedAt: 'desc' },
      include: {
        previousSnapshot: true,
        currentSnapshot: true
      }
    })

    res.json(diffs)
  } catch (error) {
    next(error)
  }
}

export async function getDiff(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      const error: ApiError = new Error('인증이 필요합니다')
      error.statusCode = 401
      throw error
    }

    const { id } = req.params

    // 특정 Diff 조회 (project, previousSnapshot, currentSnapshot 포함)
    const diff = await prisma.diffResult.findUnique({
      where: { id },
      include: {
        project: true,
        previousSnapshot: true,
        currentSnapshot: true
      }
    })

    if (!diff) {
      const error: ApiError = new Error('Diff not found')
      error.statusCode = 404
      throw error
    }

    // 프로젝트 소유 확인
    if (diff.project.userId !== req.user.userId) {
      const error: ApiError = new Error('권한이 없습니다')
      error.statusCode = 403
      throw error
    }

    res.json(diff)
  } catch (error) {
    next(error)
  }
}
