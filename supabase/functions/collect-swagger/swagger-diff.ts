import {
  DIFF_TYPE,
  type DiffChange,
  type DiffResultPayload,
  type DiffType,
  type EndpointDiff,
  type SwaggerDocument
} from './types.ts'

function operationPath(method: string, path: string, suffix = ''): string {
  return `${method.toUpperCase()} ${path}${suffix}`
}

// 차이 변경 생성 
function createDiffChange(
  type: DiffType,
  path: string,
  description: string,
  oldValue?: unknown,
  newValue?: unknown
): DiffChange {
  const change: DiffChange = { type, path, description }
  if (oldValue !== undefined) change.oldValue = oldValue
  if (newValue !== undefined) change.newValue = newValue
  return change
}

// 값 변경 여부 확인
function isValueChanged(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) !== JSON.stringify(b)
}

// 태그 추출
function extractTags(op: unknown): string[] | undefined {
  if (!op || typeof op !== 'object') return undefined
  const tags = (op as Record<string, unknown>).tags
  if (!Array.isArray(tags) || tags.length === 0) return undefined
  return tags.filter((tag): tag is string => typeof tag === 'string')
}

// 엔드포인트 차이 생성
function createEndpointDiff(
  path: string,
  method: string,
  changes: DiffChange[],
  isBreaking: boolean,
  tags?: string[]
): EndpointDiff {
  return { path, method, changes, isBreaking, tags }
}

// 차이 결과 판단
function detectBreaking(changes: DiffChange[]): boolean {
  return changes.some((change) => {
    if (change.type === DIFF_TYPE.REMOVED) return true
    if (change.type === DIFF_TYPE.ADDED && change.path.includes('/parameters/')) {
      return (change.newValue as Record<string, unknown>)?.required === true
    }
    if (change.type === DIFF_TYPE.MODIFIED && change.path.includes('/responses/')) return true
    return false
  })
}

// 파라미터 차이 비교
function compareParams(
  prev: unknown[],
  curr: unknown[],
  path: string,
  method: string
): DiffChange[] {
  const prevMap = new Map((prev as Array<{ name: string }>).map((param) => [param.name, param]))
  const currMap = new Map((curr as Array<{ name: string }>).map((param) => [param.name, param]))
  const changes: DiffChange[] = []

  for (const [name, param] of prevMap) {
    if (!currMap.has(name)) {
      // 파라미터 삭제 처리
      changes.push(createDiffChange(
        DIFF_TYPE.REMOVED,
        operationPath(method, path, `/parameters/${name}`),
        `파라미터 삭제: ${name}`,
        param
      ))
    }
  }

  for (const [name, currParam] of currMap) {
    const prevParam = prevMap.get(name)
    const paramPath = operationPath(method, path, `/parameters/${name}`)

    // 파라미터 추가 처리
    if (!prevParam) {
      changes.push(createDiffChange(DIFF_TYPE.ADDED, paramPath, `파라미터 추가: ${name}`, undefined, currParam))
      continue
    }
    // 파라미터 변경 처리
    if (isValueChanged(prevParam, currParam)) {
      changes.push(createDiffChange(DIFF_TYPE.MODIFIED, paramPath, `파라미터 변경: ${name}`, prevParam, currParam))
    }
  }

  return changes
}

// 요청 본문 차이 비교
function compareRequestBody(
  prev: Record<string, unknown>,
  curr: Record<string, unknown>,
  path: string,
  method: string
): DiffChange[] {
  const bodyPath = operationPath(method, path, '/requestBody')
  const prevBody = prev.requestBody
  const currBody = curr.requestBody
  const hasPrevBody = prevBody != null
  const hasCurrBody = currBody != null

  if (!hasPrevBody && !hasCurrBody) return []

  // hasPrevBody 이 false 이고 hasCurrBody 이 true 인 경우 요청 본문 추가 처리
  if (!hasPrevBody) {
    return [createDiffChange(DIFF_TYPE.ADDED, bodyPath, 'Request Body 추가', undefined, currBody)]
  }

  // hasCurrBody 이 false 이고 hasPrevBody 이 true 인 경우 요청 본문 삭제 처리  
  if (!hasCurrBody) {
    return [createDiffChange(DIFF_TYPE.REMOVED, bodyPath, 'Request Body 삭제', prevBody)]
  }

  // 요청 본문 변경 처리
  if (!isValueChanged(prevBody, currBody)) return []

  // 요청 본문 변경 처리
  return [createDiffChange(DIFF_TYPE.MODIFIED, bodyPath, 'Request Body 변경', prevBody, currBody)]
}

function compareResponses(
  prev: Record<string, unknown>,
  curr: Record<string, unknown>,
  path: string,
  method: string
): DiffChange[] {
  const prevResponses = (prev.responses || {}) as Record<string, unknown>
  const currResponses = (curr.responses || {}) as Record<string, unknown>
  const changes: DiffChange[] = []
  const statusCodes = new Set([...Object.keys(prevResponses), ...Object.keys(currResponses)])

  for (const code of statusCodes) {
    // 응답 경로 생성 
    const responsePath = operationPath(method, path, `/responses/${code}`)

    // prevResponses[code] 이 false 이고 currResponses[code] 이 true 인 경우 응답 추가 처리
    if (!prevResponses[code] && currResponses[code]) {
      changes.push(createDiffChange(DIFF_TYPE.ADDED, responsePath, `Response 추가: ${code}`, undefined, currResponses[code]))
      continue
    }
    // prevResponses[code] 이 true 이고 currResponses[code] 이 false 인 경우 응답 삭제 처리  
    if (prevResponses[code] && !currResponses[code]) {
      changes.push(createDiffChange(DIFF_TYPE.REMOVED, responsePath, `Response 삭제: ${code}`, prevResponses[code]))
      continue
    }
    // prevResponses[code] 이 true 이고 currResponses[code] 이 true 이고 값이 변경된 경우 응답 변경 처리  
    if (prevResponses[code] && currResponses[code] && isValueChanged(prevResponses[code], currResponses[code])) {
      changes.push(createDiffChange(DIFF_TYPE.MODIFIED, responsePath, `Response 변경: ${code}`, prevResponses[code], currResponses[code]))
    }
  }

  return changes
}

function compareMethod(path: string, method: string, prev: unknown, curr: unknown): EndpointDiff | null {
  const endpointPath = operationPath(method, path)

  if (!prev && curr) {
    return createEndpointDiff(
      path,
      method,
      [createDiffChange(DIFF_TYPE.ADDED, endpointPath, `신규 API 추가: ${endpointPath}`, undefined, curr)],
      false,
      extractTags(curr)
    )
  }

  if (prev && !curr) {
    return createEndpointDiff(
      path,
      method,
      [createDiffChange(DIFF_TYPE.REMOVED, endpointPath, `API 삭제: ${endpointPath}`, prev)],
      true,
      extractTags(prev)
    )
  }

  if (!prev || !curr) return null

  const prevOperation = prev as Record<string, unknown>
  const currOperation = curr as Record<string, unknown>
  const changes: DiffChange[] = [
    ...compareParams(
      (prevOperation.parameters || []) as unknown[],
      (currOperation.parameters || []) as unknown[],
      path,
      method
    ),
    ...compareRequestBody(prevOperation, currOperation, path, method),
    ...compareResponses(prevOperation, currOperation, path, method)
  ]

  if (changes.length === 0) return null

  return createEndpointDiff(
    path,
    method,
    changes,
    detectBreaking(changes),
    extractTags(curr) || extractTags(prev)
  )
}

function buildDiffSummary(endpointDiffs: EndpointDiff[]) {
  return {
    added: endpointDiffs.filter((diff) => diff.changes.some((change) => change.type === DIFF_TYPE.ADDED)).length,
    removed: endpointDiffs.filter((diff) => diff.changes.some((change) => change.type === DIFF_TYPE.REMOVED)).length,
    modified: endpointDiffs.filter((diff) => diff.changes.some((change) => change.type === DIFF_TYPE.MODIFIED)).length,
    breaking: endpointDiffs.filter((diff) => diff.isBreaking).length
  }
}

export function compareSwagger(
  prev: SwaggerDocument,
  curr: SwaggerDocument,
  projectId: string,
  prevSnapId: string,
  currSnapId: string
): DiffResultPayload {
  const endpointDiffs: EndpointDiff[] = []
  const allPaths = new Set([
    ...Object.keys(prev.paths || {}),
    ...Object.keys(curr.paths || {})
  ])

  for (const path of allPaths) {
    const prevPath = prev.paths?.[path] || {}
    const currPath = curr.paths?.[path] || {}
    const allMethods = new Set([...Object.keys(prevPath), ...Object.keys(currPath)])

    for (const method of allMethods) {
      const endpointDiff = compareMethod(path, method, prevPath[method], currPath[method])
      if (endpointDiff) endpointDiffs.push(endpointDiff)
    }
  }

  return {
    projectId,
    previousSnapshotId: prevSnapId,
    currentSnapshotId: currSnapId,
    comparedAt: new Date().toISOString(),
    endpointDiffs,
    summary: buildDiffSummary(endpointDiffs)
  }
}
