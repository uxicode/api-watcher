import { Request, Response, NextFunction } from 'express'
import prisma from '../prisma/client.js'
import { ApiError } from '../middleware/errorHandler.js'
import { diffService } from '../services/diff-service.js'
import { swaggerService } from '../services/swagger-service.js'
import type { AuthRequest } from '../middleware/auth.js'

export async function getProjects(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      const error: ApiError = new Error('인증이 필요합니다')
      error.statusCode = 401
      throw error
    }

    const projects = await prisma.project.findMany({
      where: { userId: req.user.userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        snapshots: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        },
        diffResults: {
          take: 1,
          orderBy: { comparedAt: 'desc' }
        }
      }
    })

    res.json(projects)
  } catch (error) {
    next(error)
  }
}

export async function getProject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      const error: ApiError = new Error('인증이 필요합니다')
      error.statusCode = 401
      throw error
    }

    const { id } = req.params

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        snapshots: {
          orderBy: { createdAt: 'desc' }
        },
        diffResults: {
          orderBy: { comparedAt: 'desc' },
          take: 10
        }
      }
    })

    if (!project) {
      const error: ApiError = new Error('Project not found')
      error.statusCode = 404
      throw error
    }

    // 사용자 소유 확인
    if (project.userId !== req.user.userId) {
      const error: ApiError = new Error('권한이 없습니다')
      error.statusCode = 403
      throw error
    }

    res.json(project)
  } catch (error) {
    next(error)
  }
}

export async function createProject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      const error: ApiError = new Error('인증이 필요합니다')
      error.statusCode = 401
      throw error
    }

    const { name, swaggerUrl, apiKey, apiKeyHeader, isActive } = req.body

    if (!name || !swaggerUrl) {
      const error: ApiError = new Error('Name and swaggerUrl are required')
      error.statusCode = 400
      throw error
    }

    const project = await prisma.project.create({
      data: {
        name,
        swaggerUrl,
        apiKey,
        apiKeyHeader,
        userId: req.user.userId,
        isActive: isActive ?? true
      }
    })

    res.status(201).json(project)
  } catch (error) {
    next(error)
  }
}

export async function updateProject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      const error: ApiError = new Error('인증이 필요합니다')
      error.statusCode = 401
      throw error
    }

    const { id } = req.params
    const { name, swaggerUrl, apiKey, apiKeyHeader, isActive } = req.body

    // 프로젝트 소유 확인
    const existingProject = await prisma.project.findUnique({
      where: { id }
    })

    if (!existingProject) {
      const error: ApiError = new Error('Project not found')
      error.statusCode = 404
      throw error
    }

    if (existingProject.userId !== req.user.userId) {
      const error: ApiError = new Error('권한이 없습니다')
      error.statusCode = 403
      throw error
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(swaggerUrl && { swaggerUrl }),
        ...(apiKey !== undefined && { apiKey }),
        ...(apiKeyHeader !== undefined && { apiKeyHeader }),
        ...(isActive !== undefined && { isActive })
      }
    })

    res.json(project)
  } catch (error) {
    if ((error as any).code === 'P2025') {
      const notFoundError: ApiError = new Error('Project not found')
      notFoundError.statusCode = 404
      throw notFoundError
    }
    next(error)
  }
}

export async function deleteProject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      const error: ApiError = new Error('인증이 필요합니다')
      error.statusCode = 401
      throw error
    }

    const { id } = req.params

    // 프로젝트 소유 확인
    const existingProject = await prisma.project.findUnique({
      where: { id }
    })

    if (!existingProject) {
      const error: ApiError = new Error('Project not found')
      error.statusCode = 404
      throw error
    }

    if (existingProject.userId !== req.user.userId) {
      const error: ApiError = new Error('권한이 없습니다')
      error.statusCode = 403
      throw error
    }

    await prisma.project.delete({
      where: { id }
    })

    res.status(204).send()
  } catch (error) {
    if ((error as any).code === 'P2025') {
      const notFoundError: ApiError = new Error('Project not found')
      notFoundError.statusCode = 404
      throw notFoundError
    }
    next(error)
  }
}

export async function collectSwagger(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      const error: ApiError = new Error('인증이 필요합니다')
      error.statusCode = 401
      throw error
    }

    const { id } = req.params

    const project = await prisma.project.findUnique({
      where: { id }
    })

    if (!project) {
      const error: ApiError = new Error('Project not found')
      error.statusCode = 404
      throw error
    }

    // 사용자 소유 확인
    if (project.userId !== req.user.userId) {
      const error: ApiError = new Error('권한이 없습니다')
      error.statusCode = 403
      throw error
    }

    // Swagger 문서 가져오기
    const swagger = await swaggerService.fetchProjectSwagger({
      id: project.id,
      name: project.name,
      swaggerUrl: project.swaggerUrl,
      apiKey: project.apiKey,
      apiKeyHeader: project.apiKeyHeader
    })

    if (!swaggerService.validateSwagger(swagger)) {
      const error: ApiError = new Error('Invalid Swagger document')
      error.statusCode = 400
      throw error
    }

    const compressed = swaggerService.compressSwagger(swagger)

    // ✅ 중복 저장 방지: 이전 스냅샷과 비교
    const previousSnapshot = await prisma.snapshot.findFirst({
      where: { projectId: project.id },
      orderBy: { createdAt: 'desc' }
    })

    // ✅ 내용이 100% 동일하면 저장하지 않고 종료
    if (previousSnapshot && previousSnapshot.data === compressed) {
      // 마지막 체크 시간만 업데이트
      const updatedProject = await prisma.project.update({
        where: { id: project.id },
        data: { lastCheckedAt: new Date() }
      })

      console.log(`[collectSwagger] No changes detected for project ${project.id}`)

      res.status(200).json({
        status: 'no_changes',
        message: 'No changes detected since last check',
        lastCheckedAt: updatedProject.lastCheckedAt,
        lastSnapshot: {
          id: previousSnapshot.id,
          createdAt: previousSnapshot.createdAt,
          version: previousSnapshot.version
        }
      })
      return
    }

    // ✅ 내용이 다르면 새 스냅샷 저장
    console.log(`[collectSwagger] Changes detected for project ${project.id}, creating new snapshot`)

    const snapshot = await prisma.snapshot.create({
      data: {
        projectId: project.id,
        data: compressed,
        version: swagger.info.version
      }
    })

    // Diff 생성 (이전 스냅샷이 있는 경우)
    let diffResult = null
    if (previousSnapshot) {
      const previousSwagger = swaggerService.decompressSwagger(previousSnapshot.data)
      
      const diff = diffService.compareSwaggerDocuments(
        previousSwagger,
        swagger,
        project.id,
        previousSnapshot.id,
        snapshot.id
      )

      diffResult = await prisma.diffResult.create({
        data: {
          projectId: project.id,
          previousSnapshotId: previousSnapshot.id,
          currentSnapshotId: snapshot.id,
          endpointDiffs: diff.endpointDiffs as any,
          summary: diff.summary as any
        }
      })
    }

    // 프로젝트 업데이트 시간 갱신
    await prisma.project.update({
      where: { id: project.id },
      data: { lastCheckedAt: snapshot.createdAt }
    })

    res.status(201).json({
      status: 'changes_detected',
      message: 'New changes detected and saved',
      snapshot,
      diffResult
    })
  } catch (error) {
    next(error)
  }
}
