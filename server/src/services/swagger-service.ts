import axios from 'axios'
import type { SwaggerDocument } from '../../../src/types/swagger.js'

export interface ProjectData {
  id: string
  name: string
  swaggerUrl: string
  apiKey?: string | null
  apiKeyHeader?: string | null
}

export class SwaggerService {
  async fetchProjectSwagger(project: ProjectData): Promise<SwaggerDocument> {
    const config: any = {
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
