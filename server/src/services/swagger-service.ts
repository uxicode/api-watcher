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
        const status = error.response?.status
        const statusText = error.response?.statusText
        
        // 상세한 에러 메시지 생성
        let errorMessage = `Swagger 문서를 가져올 수 없습니다.\n`
        errorMessage += `URL: ${project.swaggerUrl}\n`
        
        if (status) {
          errorMessage += `HTTP 상태: ${status} ${statusText}\n`
          
          // 상태 코드별 구체적인 안내
          if (status === 503) {
            errorMessage += `\n❌ 서버가 현재 사용 불가능합니다. (Service Unavailable)\n`
            errorMessage += `- 서버가 점검 중이거나 다운되었을 수 있습니다.\n`
            errorMessage += `- 잠시 후 다시 시도해주세요.`
          } else if (status === 404) {
            errorMessage += `\n❌ Swagger 문서를 찾을 수 없습니다. (Not Found)\n`
            errorMessage += `- URL이 올바른지 확인해주세요.\n`
            errorMessage += `- JSON 문서 경로인지 확인해주세요. (예: /v3/api-docs)`
          } else if (status === 401 || status === 403) {
            errorMessage += `\n❌ 인증 오류 (${status === 401 ? 'Unauthorized' : 'Forbidden'})\n`
            errorMessage += `- API Key가 올바른지 확인해주세요.\n`
            errorMessage += `- API Key Header가 올바른지 확인해주세요.`
          } else if (status === 500) {
            errorMessage += `\n❌ 서버 내부 오류 (Internal Server Error)\n`
            errorMessage += `- 대상 서버에 문제가 있습니다.\n`
            errorMessage += `- 서버 관리자에게 문의하세요.`
          }
        } else {
          errorMessage += `네트워크 오류: ${error.message}\n`
          errorMessage += `- 인터넷 연결을 확인해주세요.\n`
          errorMessage += `- 방화벽이나 프록시 설정을 확인해주세요.`
        }
        
        throw new Error(errorMessage)
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
