import type { SwaggerDocument, SwaggerPath, SwaggerOperation, SwaggerParameter } from '../types/swagger.js'
import type { DiffResult, EndpointDiff, DiffChange, DiffType } from '../types/diff.js'
import { DIFF_TYPE } from '../types/diff.js'

export class DiffService {
  /**
   * Swagger 문서 비교
   * - 두 개의 Swagger 문서를 비교하여 변경 사항을 감지
   */
  compareSwaggerDocuments(
    previous: SwaggerDocument,
    current: SwaggerDocument,
    projectId: string,
    previousSnapshotId: string,
    currentSnapshotId: string
  ): DiffResult {
    const endpointDiffs: EndpointDiff[] = []
    const allPaths = this.getAllPaths(previous, current)

    // 각 경로별 변경사항 수집
    for (const path of allPaths) {
      const pathDiffs = this.comparePath(
        path,
        previous.paths?.[path],
        current.paths?.[path]
      )
      endpointDiffs.push(...pathDiffs)
    }

    const summary = this.createSummary(endpointDiffs)

    return {
      projectId,
      previousSnapshotId,
      currentSnapshotId,
      comparedAt: new Date().toISOString(),
      endpointDiffs,
      summary
    }
  }

  /**
   * 모든 경로(path) 추출
   */
  private getAllPaths(previous: SwaggerDocument, current: SwaggerDocument): Set<string> {
    return new Set([
      ...Object.keys(previous.paths || {}),
      ...Object.keys(current.paths || {})
    ])
  }

  /**
   * 단일 경로(path) 비교
   */
  private comparePath(
    path: string,
    prevPath: Record<string, unknown> | undefined,
    currPath: Record<string, unknown> | undefined
  ): EndpointDiff[] {
    // 경로가 새로 추가됨
    if (!prevPath && currPath) {
      return this.handleAddedPath(path, currPath)
    }
    
    // 경로가 삭제됨
    if (prevPath && !currPath) {
      return this.handleRemovedPath(path, prevPath)
    }
    
    // 경로가 수정됨 (메서드 비교)
    if (prevPath && currPath) {
      return this.handleModifiedPath(path, prevPath, currPath)
    }

    return []
  }

  /**
   * 새로 추가된 경로 처리
   */
  private handleAddedPath(path: string, currPath: Record<string, unknown>): EndpointDiff[] {
    const diffs: EndpointDiff[] = []
    const methods = Object.keys(currPath)

    for (const method of methods) {
      diffs.push(this.createEndpointDiff(
        path,
        method,
        [{
          type: DIFF_TYPE.ADDED,
          path: `${method.toUpperCase()} ${path}`,
          newValue: currPath[method],
          description: `신규 API 추가: ${method.toUpperCase()} ${path}`
        }],
        false
      ))
    }

    return diffs
  }

  /**
   * 삭제된 경로 처리
   */
  private handleRemovedPath(path: string, prevPath: Record<string, unknown>): EndpointDiff[] {
    const diffs: EndpointDiff[] = []
    const methods = Object.keys(prevPath)

    for (const method of methods) {
      diffs.push(this.createEndpointDiff(
        path,
        method,
        [{
          type: DIFF_TYPE.REMOVED,
          path: `${method.toUpperCase()} ${path}`,
          oldValue: prevPath[method],
          description: `API 삭제: ${method.toUpperCase()} ${path}`
        }],
        true // 삭제는 항상 Breaking Change
      ))
    }

    return diffs
  }

  /**
   * 수정된 경로 처리 (메서드 비교)
   */
  private handleModifiedPath(
    path: string,
    prevPath: Record<string, unknown>,
    currPath: Record<string, unknown>
  ): EndpointDiff[] {
    const diffs: EndpointDiff[] = []
    const allMethods = new Set([
      ...Object.keys(prevPath),
      ...Object.keys(currPath)
    ])

    for (const method of allMethods) {
      const methodDiff = this.compareMethod(
        path,
        method,
        prevPath[method],
        currPath[method]
      )
      
      if (methodDiff) {
        diffs.push(methodDiff)
      }
    }

    return diffs
  }

  /**
   * 단일 메서드(HTTP Method) 비교
   */
  private compareMethod(
    path: string,
    method: string,
    prevMethod: unknown,
    currMethod: unknown
  ): EndpointDiff | null {
    // 메서드가 새로 추가됨
    if (!prevMethod && currMethod) {
      return this.createEndpointDiff(
        path,
        method,
        [{
          type: DIFF_TYPE.ADDED,
          path: `${method.toUpperCase()} ${path}`,
          newValue: currMethod,
          description: `신규 메서드 추가: ${method.toUpperCase()} ${path}`
        }],
        false
      )
    }

    // 메서드가 삭제됨
    if (prevMethod && !currMethod) {
      return this.createEndpointDiff(
        path,
        method,
        [{
          type: DIFF_TYPE.REMOVED,
          path: `${method.toUpperCase()} ${path}`,
          oldValue: prevMethod,
          description: `메서드 삭제: ${method.toUpperCase()} ${path}`
        }],
        true // 삭제는 항상 Breaking Change
      )
    }

    // 메서드가 수정됨 (상세 비교)
    if (prevMethod && currMethod) {
      const changes = this.compareEndpoint(
        prevMethod as SwaggerOperation,
        currMethod as SwaggerOperation,
        path,
        method
      )

      if (changes.length > 0) {
        const isBreaking = this.detectBreakingChange(changes)
        return this.createEndpointDiff(path, method, changes, isBreaking)
      }
    }

    return null
  }

  /**
   * EndpointDiff 객체 생성 헬퍼
   */
  private createEndpointDiff(
    path: string,
    method: string,
    changes: DiffChange[],
    isBreaking: boolean
  ): EndpointDiff {
    return {
      path,
      method,
      changes,
      isBreaking
    }
  }

  /**
   * 요약 정보 생성
   */
  private createSummary(endpointDiffs: EndpointDiff[]) {
    return {
      added: endpointDiffs.filter(d => d.changes.some(c => c.type === DIFF_TYPE.ADDED)).length,
      removed: endpointDiffs.filter(d => d.changes.some(c => c.type === DIFF_TYPE.REMOVED)).length,
      modified: endpointDiffs.filter(d => d.changes.some(c => c.type === DIFF_TYPE.MODIFIED)).length,
      breaking: endpointDiffs.filter(d => d.isBreaking).length
    }
  }

  /**
   * 엔드포인트 상세 비교 (Parameters, Request Body, Responses)
   */
  private compareEndpoint(
    previous: SwaggerOperation,
    current: SwaggerOperation,
    path: string,
    method: string
  ): DiffChange[] {
    const changes: DiffChange[] = []

    // Parameters 비교
    const paramChanges = this.compareParameters(
      previous.parameters || [],
      current.parameters || [],
      path,
      method
    )
    changes.push(...paramChanges)

    // Request Body 비교
    const bodyChanges = this.compareRequestBody(
      previous.requestBody,
      current.requestBody,
      path,
      method
    )
    changes.push(...bodyChanges)

    // Response 비교
    const responseChanges = this.compareResponses(
      previous.responses || {},
      current.responses || {},
      path,
      method
    )
    changes.push(...responseChanges)

    return changes
  }

  /**
   * Parameters 비교
   */
  private compareParameters(
    prev: SwaggerParameter[],
    curr: SwaggerParameter[],
    path: string,
    method: string
  ): DiffChange[] {
    const changes: DiffChange[] = []
    const prevParams = this.createParameterMap(prev)
    const currParams = this.createParameterMap(curr)

    // 삭제된 파라미터 감지
    changes.push(...this.findRemovedParameters(prevParams, currParams, path, method))

    // 추가/변경된 파라미터 감지
    changes.push(...this.findAddedOrModifiedParameters(prevParams, currParams, path, method))

    return changes
  }

  /**
   * Parameter 배열을 Map으로 변환
   */
  private createParameterMap(params: SwaggerParameter[]): Map<string, SwaggerParameter> {
    return new Map(
      params.map(p => [p.name, p])
    )
  }

  /**
   * 삭제된 파라미터 찾기
   */
  private findRemovedParameters(
    prevParams: Map<string, SwaggerParameter>,
    currParams: Map<string, SwaggerParameter>,
    path: string,
    method: string
  ): DiffChange[] {
    const changes: DiffChange[] = []

    for (const [name, param] of prevParams) {
      if (!currParams.has(name)) {
        changes.push(this.createDiffChange(
          DIFF_TYPE.REMOVED,
          `${method.toUpperCase()} ${path}/parameters/${name}`,
          `파라미터 삭제: ${name}`,
          param,
          undefined
        ))
      }
    }

    return changes
  }

  /**
   * 추가되거나 변경된 파라미터 찾기
   */
  private findAddedOrModifiedParameters(
    prevParams: Map<string, SwaggerParameter>,
    currParams: Map<string, SwaggerParameter>,
    path: string,
    method: string
  ): DiffChange[] {
    const changes: DiffChange[] = []

    for (const [name, currParam] of currParams) {
      const prevParam = prevParams.get(name)

      if (!prevParam) {
        // 새로 추가된 파라미터
        changes.push(this.createDiffChange(
          DIFF_TYPE.ADDED,
          `${method.toUpperCase()} ${path}/parameters/${name}`,
          `파라미터 추가: ${name}`,
          undefined,
          currParam
        ))
      } else if (this.isValueChanged(prevParam, currParam)) {
        // 변경된 파라미터
        changes.push(this.createDiffChange(
          DIFF_TYPE.MODIFIED,
          `${method.toUpperCase()} ${path}/parameters/${name}`,
          `파라미터 변경: ${name}`,
          prevParam,
          currParam
        ))
      }
    }

    return changes
  }

  /**
   * DiffChange 객체 생성 헬퍼
   */
  private createDiffChange(
    type: DiffType,
    path: string,
    description: string,
    oldValue?: unknown,
    newValue?: unknown
  ): DiffChange {
    const change: DiffChange = {
      type,
      path,
      description
    }

    if (oldValue !== undefined) {
      change.oldValue = oldValue
    }

    if (newValue !== undefined) {
      change.newValue = newValue
    }

    return change
  }

  /**
   * 값이 변경되었는지 확인
   */
  private isValueChanged(prev: unknown, curr: unknown): boolean {
    return JSON.stringify(prev) !== JSON.stringify(curr)
  }

  /**
   * Request Body 비교
   */
  private compareRequestBody(
    prev: unknown,
    curr: unknown,
    path: string,
    method: string
  ): DiffChange[] {
    const changes: DiffChange[] = []
    const bodyPath = `${method.toUpperCase()} ${path}/requestBody`

    // Request Body가 새로 추가됨
    if (!prev && curr) {
      changes.push(this.createDiffChange(
        DIFF_TYPE.ADDED,
        bodyPath,
        'Request Body 추가',
        undefined,
        curr
      ))
      return changes
    }

    // Request Body가 삭제됨
    if (prev && !curr) {
      changes.push(this.createDiffChange(
        DIFF_TYPE.REMOVED,
        bodyPath,
        'Request Body 삭제',
        prev,
        undefined
      ))
      return changes
    }

    // Request Body가 변경됨
    if (prev && curr && this.isValueChanged(prev, curr)) {
      changes.push(this.createDiffChange(
        DIFF_TYPE.MODIFIED,
        bodyPath,
        'Request Body 변경',
        prev,
        curr
      ))
    }

    return changes
  }

  /**
   * Responses 비교
   */
  private compareResponses(
    prev: Record<string, unknown>,
    curr: Record<string, unknown>,
    path: string,
    method: string
  ): DiffChange[] {
    const changes: DiffChange[] = []
    const allStatusCodes = new Set([
      ...Object.keys(prev),
      ...Object.keys(curr)
    ])

    for (const statusCode of allStatusCodes) {
      const responseChange = this.compareResponse(
        statusCode,
        prev[statusCode],
        curr[statusCode],
        path,
        method
      )

      if (responseChange) {
        changes.push(responseChange)
      }
    }

    return changes
  }

  /**
   * 단일 Response (상태코드별) 비교
   */
  private compareResponse(
    statusCode: string,
    prevResp: unknown,
    currResp: unknown,
    path: string,
    method: string
  ): DiffChange | null {
    const responsePath = `${method.toUpperCase()} ${path}/responses/${statusCode}`

    // Response가 새로 추가됨
    if (!prevResp && currResp) {
      return this.createDiffChange(
        DIFF_TYPE.ADDED,
        responsePath,
        `Response 추가: ${statusCode}`,
        undefined,
        currResp
      )
    }

    // Response가 삭제됨
    if (prevResp && !currResp) {
      return this.createDiffChange(
        DIFF_TYPE.REMOVED,
        responsePath,
        `Response 삭제: ${statusCode}`,
        prevResp,
        undefined
      )
    }

    // Response가 변경됨
    if (prevResp && currResp && this.isValueChanged(prevResp, currResp)) {
      return this.createDiffChange(
        DIFF_TYPE.MODIFIED,
        responsePath,
        `Response 변경: ${statusCode}`,
        prevResp,
        currResp
      )
    }

    return null
  }

  private detectBreakingChange(changes: DiffChange[]): boolean {
    // Breaking change 감지 로직
    return changes.some(change => {
      // API 삭제는 항상 breaking
      if (change.type === DIFF_TYPE.REMOVED) {
        return true
      }

      // Required 파라미터 추가는 breaking
      if (change.type === DIFF_TYPE.ADDED && change.path.includes('/parameters/')) {
        const param = change.newValue as { required?: boolean }
        if (param.required === true) {
          return true
        }
      }

      // Response 스키마 변경은 breaking (간단한 예시)
      if (change.type === DIFF_TYPE.MODIFIED && change.path.includes('/responses/')) {
        return true
      }

      return false
    })
  }
}

export const diffService = new DiffService()
