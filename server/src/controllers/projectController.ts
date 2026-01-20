import { Request, Response, NextFunction } from 'express'
import prisma from '../prisma/client.js'
import { ApiError } from '../middleware/errorHandler.js'
import { diffService } from '../services/diff-service.js'
import { swaggerService } from '../services/swagger-service.js'

export async function getProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const projects = await prisma.project.findMany({
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

export async function getProject(req: Request, res: Response, next: NextFunction) {
  try {
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

    res.json(project)
  } catch (error) {
    next(error)
  }
}

export async function createProject(req: Request, res: Response, next: NextFunction) {
  try {
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
        isActive: isActive ?? true
      }
    })

    res.status(201).json(project)
  } catch (error) {
    next(error)
  }
}

export async function updateProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { name, swaggerUrl, apiKey, apiKeyHeader, isActive } = req.body

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

export async function deleteProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params

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

export async function collectSwagger(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params

    const project = await prisma.project.findUnique({
      where: { id }
    })

    if (!project) {
      const error: ApiError = new Error('Project not found')
      error.statusCode = 404
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

    // 스냅샷 생성
    const snapshot = await prisma.snapshot.create({
      data: {
        projectId: project.id,
        data: compressed,
        version: swagger.info.version
      }
    })

    // 이전 스냅샷과 비교
    const previousSnapshot = await prisma.snapshot.findFirst({
      where: {
        projectId: project.id,
        id: { not: snapshot.id }
      },
      orderBy: { createdAt: 'desc' }
    })

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
      snapshot,
      diffResult
    })
  } catch (error) {
    next(error)
  }
}
