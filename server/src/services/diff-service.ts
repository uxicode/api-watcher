import type { SwaggerDocument, SwaggerPath } from '../types/swagger.js'
import type { DiffResult, EndpointDiff, DiffChange } from '../types/diff.js'
import { DIFF_TYPE } from '../types/diff.js'

export class DiffService {
  compareSwaggerDocuments(
    previous: SwaggerDocument,
    current: SwaggerDocument,
    projectId: string,
    previousSnapshotId: string,
    currentSnapshotId: string
  ): DiffResult {
    const endpointDiffs: EndpointDiff[] = []
    const allPaths = new Set([
      ...Object.keys(previous.paths || {}),
      ...Object.keys(current.paths || {})
    ])

    for (const path of allPaths) {
      const prevPath = previous.paths?.[path]
      const currPath = current.paths?.[path]

      if (!prevPath && currPath) {
        // 신규 API 추가
        const methods = Object.keys(currPath)
        for (const method of methods) {
          endpointDiffs.push({
            path,
            method,
            changes: [
              {
                type: DIFF_TYPE.ADDED,
                path: `${method.toUpperCase()} ${path}`,
                newValue: currPath[method],
                description: `신규 API 추가: ${method.toUpperCase()} ${path}`
              }
            ],
            isBreaking: false
          })
        }
      } else if (prevPath && !currPath) {
        // API 삭제
        const methods = Object.keys(prevPath)
        for (const method of methods) {
          endpointDiffs.push({
            path,
            method,
            changes: [
              {
                type: DIFF_TYPE.REMOVED,
                path: `${method.toUpperCase()} ${path}`,
                oldValue: prevPath[method],
                description: `API 삭제: ${method.toUpperCase()} ${path}`
              }
            ],
            isBreaking: true
          })
        }
      } else if (prevPath && currPath) {
        // 기존 API 변경 사항 확인
        const allMethods = new Set([
          ...Object.keys(prevPath),
          ...Object.keys(currPath)
        ])

        for (const method of allMethods) {
          const prevMethod = prevPath[method]
          const currMethod = currPath[method]

          if (!prevMethod && currMethod) {
            endpointDiffs.push({
              path,
              method,
              changes: [
                {
                  type: DIFF_TYPE.ADDED,
                  path: `${method.toUpperCase()} ${path}`,
                  newValue: currMethod,
                  description: `신규 메서드 추가: ${method.toUpperCase()} ${path}`
                }
              ],
              isBreaking: false
            })
          } else if (prevMethod && !currMethod) {
            endpointDiffs.push({
              path,
              method,
              changes: [
                {
                  type: DIFF_TYPE.REMOVED,
                  path: `${method.toUpperCase()} ${path}`,
                  oldValue: prevMethod,
                  description: `메서드 삭제: ${method.toUpperCase()} ${path}`
                }
              ],
              isBreaking: true
            })
          } else if (prevMethod && currMethod) {
            const changes = this.compareEndpoint(prevMethod, currMethod, path, method)
            if (changes.length > 0) {
              const isBreaking = this.detectBreakingChange(changes)
              endpointDiffs.push({
                path,
                method,
                changes,
                isBreaking
              })
            }
          }
        }
      }
    }

    const summary = {
      added: endpointDiffs.filter(d => d.changes.some(c => c.type === DIFF_TYPE.ADDED)).length,
      removed: endpointDiffs.filter(d => d.changes.some(c => c.type === DIFF_TYPE.REMOVED)).length,
      modified: endpointDiffs.filter(d => d.changes.some(c => c.type === DIFF_TYPE.MODIFIED)).length,
      breaking: endpointDiffs.filter(d => d.isBreaking).length
    }

    return {
      projectId,
      previousSnapshotId,
      currentSnapshotId,
      comparedAt: new Date().toISOString(),
      endpointDiffs,
      summary
    }
  }

  private compareEndpoint(
    previous: SwaggerPath[string],
    current: SwaggerPath[string],
    path: string,
    method: string
  ): DiffChange[] {
    const changes: DiffChange[] = []

    // Parameters 비교
    if (previous.parameters || current.parameters) {
      const paramChanges = this.compareParameters(
        previous.parameters || [],
        current.parameters || [],
        path,
        method
      )
      changes.push(...paramChanges)
    }

    // Request Body 비교
    if (previous.requestBody || current.requestBody) {
      const bodyChanges = this.compareRequestBody(
        previous.requestBody,
        current.requestBody,
        path,
        method
      )
      changes.push(...bodyChanges)
    }

    // Response 비교
    if (previous.responses || current.responses) {
      const responseChanges = this.compareResponses(
        previous.responses || {},
        current.responses || {},
        path,
        method
      )
      changes.push(...responseChanges)
    }

    return changes
  }

  private compareParameters(
    prev: unknown[],
    curr: unknown[],
    path: string,
    method: string
  ): DiffChange[] {
    const changes: DiffChange[] = []
    const prevParams = new Map(
      (prev as Array<{ name: string }>).map(p => [p.name, p])
    )
    const currParams = new Map(
      (curr as Array<{ name: string }>).map(p => [p.name, p])
    )

    // 삭제된 파라미터
    for (const [name, param] of prevParams) {
      if (!currParams.has(name)) {
        changes.push({
          type: DIFF_TYPE.REMOVED,
          path: `${method.toUpperCase()} ${path}/parameters/${name}`,
          oldValue: param,
          description: `파라미터 삭제: ${name}`
        })
      }
    }

    // 추가된 파라미터
    for (const [name, param] of currParams) {
      if (!prevParams.has(name)) {
        changes.push({
          type: DIFF_TYPE.ADDED,
          path: `${method.toUpperCase()} ${path}/parameters/${name}`,
          newValue: param,
          description: `파라미터 추가: ${name}`
        })
      } else {
        // 변경된 파라미터
        const prevParam = prevParams.get(name)
        if (JSON.stringify(prevParam) !== JSON.stringify(param)) {
          changes.push({
            type: DIFF_TYPE.MODIFIED,
            path: `${method.toUpperCase()} ${path}/parameters/${name}`,
            oldValue: prevParam,
            newValue: param,
            description: `파라미터 변경: ${name}`
          })
        }
      }
    }

    return changes
  }

  private compareRequestBody(
    prev: unknown,
    curr: unknown,
    path: string,
    method: string
  ): DiffChange[] {
    const changes: DiffChange[] = []

    if (!prev && curr) {
      changes.push({
        type: DIFF_TYPE.ADDED,
        path: `${method.toUpperCase()} ${path}/requestBody`,
        newValue: curr,
        description: 'Request Body 추가'
      })
    } else if (prev && !curr) {
      changes.push({
        type: DIFF_TYPE.REMOVED,
        path: `${method.toUpperCase()} ${path}/requestBody`,
        oldValue: prev,
        description: 'Request Body 삭제'
      })
    } else if (prev && curr) {
      const prevStr = JSON.stringify(prev)
      const currStr = JSON.stringify(curr)
      if (prevStr !== currStr) {
        changes.push({
          type: DIFF_TYPE.MODIFIED,
          path: `${method.toUpperCase()} ${path}/requestBody`,
          oldValue: prev,
          newValue: curr,
          description: 'Request Body 변경'
        })
      }
    }

    return changes
  }

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
      const prevResp = prev[statusCode]
      const currResp = curr[statusCode]

      if (!prevResp && currResp) {
        changes.push({
          type: DIFF_TYPE.ADDED,
          path: `${method.toUpperCase()} ${path}/responses/${statusCode}`,
          newValue: currResp,
          description: `Response 추가: ${statusCode}`
        })
      } else if (prevResp && !currResp) {
        changes.push({
          type: DIFF_TYPE.REMOVED,
          path: `${method.toUpperCase()} ${path}/responses/${statusCode}`,
          oldValue: prevResp,
          description: `Response 삭제: ${statusCode}`
        })
      } else if (prevResp && currResp) {
        const prevStr = JSON.stringify(prevResp)
        const currStr = JSON.stringify(currResp)
        if (prevStr !== currStr) {
          changes.push({
            type: DIFF_TYPE.MODIFIED,
            path: `${method.toUpperCase()} ${path}/responses/${statusCode}`,
            oldValue: prevResp,
            newValue: currResp,
            description: `Response 변경: ${statusCode}`
          })
        }
      }
    }

    return changes
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
