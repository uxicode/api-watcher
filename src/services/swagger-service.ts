import axios, { type AxiosRequestConfig } from 'axios'
import type { SwaggerDocument } from '@/types/swagger'
import type { Project } from '@/types/project'

export class SwaggerService {
  async fetchProjectSwagger(project: Project): Promise<SwaggerDocument> {
    const config: AxiosRequestConfig = {
      url: project.swaggerUrl,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }

    if (project.apiKey && project.apiKeyHeader) {
      config.headers = {
        ...config.headers,
        [project.apiKeyHeader]: project.apiKey
      }
    }

    try {
      const response = await axios(config)
      return response.data as SwaggerDocument
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Swagger fetch failed: ${error.message}`)
      }
      throw error
    }
  }

  compressSwagger(swagger: SwaggerDocument): string {
    // JSON 압축 (실제로는 더 정교한 압축 로직 필요)
    return JSON.stringify(swagger)
  }

  decompressSwagger(compressed: string): SwaggerDocument {
    return JSON.parse(compressed) as SwaggerDocument
  }

  validateSwagger(swagger: unknown): swagger is SwaggerDocument {
    if (typeof swagger !== 'object' || swagger === null) {
      return false
    }

    const doc = swagger as Record<string, unknown>
    return (
      (typeof doc.openapi === 'string' || typeof doc.swagger === 'string') &&
      typeof doc.info === 'object' &&
      doc.info !== null &&
      typeof (doc.info as Record<string, unknown>).title === 'string' &&
      typeof doc.paths === 'object' &&
      doc.paths !== null
    )
  }
}

export const swaggerService = new SwaggerService()
