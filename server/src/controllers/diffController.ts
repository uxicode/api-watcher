import { Request, Response, NextFunction } from 'express'
import prisma from '../prisma/client.js'
import { ApiError } from '../middleware/errorHandler.js'

export async function getDiffsByProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params

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

export async function getDiff(req: Request, res: Response, next: NextFunction) {
  try {
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

    res.json(diff)
  } catch (error) {
    next(error)
  }
}
