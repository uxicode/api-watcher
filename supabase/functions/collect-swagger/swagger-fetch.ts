import { errorResponse } from '../_shared/cors.ts'
import type { Project, SwaggerDocument } from './types.ts'

interface FetchSwaggerSuccess {
  ok: true
  swagger: SwaggerDocument
  compressed: string
}

interface FetchSwaggerFailure {
  ok: false
  response: Response
}

type FetchSwaggerResult = FetchSwaggerSuccess | FetchSwaggerFailure

/**
 * 헤더 정보 생성
 * @param project - 프로젝트 정보
 * @returns 헤더 정보
 */
function buildFetchHeaders(project: Project): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json, application/yaml, */*'
  }

  if (project.apiKey && project.apiKeyHeader) {
    headers[project.apiKeyHeader] = project.apiKey
  }

  return headers
}

/**
 * 스웨거 문서 파싱
 * @param responseText - 스웨거 문서 텍스트
 * @returns 스웨거 문서
 */
function parseSwaggerDocument(responseText: string): SwaggerDocument {
  return JSON.parse(responseText) as SwaggerDocument
}

/**
 * 스웨거 문서 가져오기
 * @param project - 프로젝트 정보
 * @returns 스웨거 문서 결과
 */
export async function fetchSwaggerDocument(project: Project): Promise<FetchSwaggerResult> {
  let swaggerResponse: Response

  // 스웨거 문서 가져오기 실패 시 에러 응답 반환
  try {
    swaggerResponse = await fetch(project.swaggerUrl, {
      headers: buildFetchHeaders(project)
    })
  } catch (fetchErr) {
    return {
      ok: false, // 스웨거 문서 가져오기 실패 시 에러 응답 반환
      response: errorResponse(
        `Swagger URL에 연결할 수 없습니다: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`,
        502 // 502 Bad Gateway
      )
    }
  }

  // 스웨거 문서 가져오기 실패 시 에러 응답 반환
  if (!swaggerResponse.ok) {
    return {
      ok: false,
      response: errorResponse(`Swagger 문서를 가져올 수 없습니다: ${swaggerResponse.status}`, 502)
    }
  }

  // 스웨거 문서 텍스트 가져오기
  const responseText = await swaggerResponse.text()

  // 스웨거 문서 파싱
  try {
    // 스웨거 문서 파싱 실패 시 에러 응답 반환
    const swagger = parseSwaggerDocument(responseText)
    // 스웨거 문서 압축 반환
    return { ok: true, swagger, compressed: JSON.stringify(swagger) }
  } catch (parseErr) {
    // 스웨거 문서 파싱 실패 시 에러 응답 반환
    return {
      ok: false,
      // 스웨거 문서 파싱 실패 시 에러 응답 반환
      response: errorResponse(
        `Swagger 문서 파싱 실패 (JSON 형식이 필요합니다): ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
        422 // 422 Unprocessable Entity
      )
    }
  }
}
