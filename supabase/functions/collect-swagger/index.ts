import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// ── 타입 정의 ──────────────────────────────────────────────
interface SwaggerDocument {
  openapi?: string; swagger?: string
  info: { title: string; version: string; description?: string }
  paths: Record<string, Record<string, unknown>>
  servers?: Array<{ url: string }>
}

const DIFF_TYPE = { ADDED: 'added', REMOVED: 'removed', MODIFIED: 'modified' } as const
type DiffType = typeof DIFF_TYPE[keyof typeof DIFF_TYPE]

interface DiffChange { type: DiffType; path: string; oldValue?: unknown; newValue?: unknown; description: string }
interface EndpointDiff { path: string; method: string; changes: DiffChange[]; isBreaking: boolean; tags?: string[] }

// ── Diff 로직 ───────────────────────────────────────────────
function getAllPaths(prev: SwaggerDocument, curr: SwaggerDocument): Set<string> {
  return new Set([...Object.keys(prev.paths || {}), ...Object.keys(curr.paths || {})])
}

function createDiffChange(type: DiffType, path: string, description: string, oldValue?: unknown, newValue?: unknown): DiffChange {
  const c: DiffChange = { type, path, description }
  if (oldValue !== undefined) c.oldValue = oldValue
  if (newValue !== undefined) c.newValue = newValue
  return c
}

function isValueChanged(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) !== JSON.stringify(b)
}

function extractTags(op: unknown): string[] | undefined {
  if (!op || typeof op !== 'object') return undefined
  const tags = (op as Record<string, unknown>).tags
  if (Array.isArray(tags) && tags.length > 0) return tags.filter(t => typeof t === 'string')
  return undefined
}

function createEndpointDiff(path: string, method: string, changes: DiffChange[], isBreaking: boolean, tags?: string[]): EndpointDiff {
  return { path, method, changes, isBreaking, tags }
}

function detectBreaking(changes: DiffChange[]): boolean {
  return changes.some(c => {
    if (c.type === DIFF_TYPE.REMOVED) return true
    if (c.type === DIFF_TYPE.ADDED && c.path.includes('/parameters/')) {
      return (c.newValue as Record<string, unknown>)?.required === true
    }
    if (c.type === DIFF_TYPE.MODIFIED && c.path.includes('/responses/')) return true
    return false
  })
}

function compareParams(prev: unknown[], curr: unknown[], path: string, method: string): DiffChange[] {
  const prevMap = new Map((prev as Array<{name: string}>).map(p => [p.name, p]))
  const currMap = new Map((curr as Array<{name: string}>).map(p => [p.name, p]))
  const changes: DiffChange[] = []
  for (const [name, param] of prevMap) {
    if (!currMap.has(name)) changes.push(createDiffChange(DIFF_TYPE.REMOVED, `${method.toUpperCase()} ${path}/parameters/${name}`, `파라미터 삭제: ${name}`, param))
  }
  for (const [name, currParam] of currMap) {
    const prevParam = prevMap.get(name)
    if (!prevParam) changes.push(createDiffChange(DIFF_TYPE.ADDED, `${method.toUpperCase()} ${path}/parameters/${name}`, `파라미터 추가: ${name}`, undefined, currParam))
    else if (isValueChanged(prevParam, currParam)) changes.push(createDiffChange(DIFF_TYPE.MODIFIED, `${method.toUpperCase()} ${path}/parameters/${name}`, `파라미터 변경: ${name}`, prevParam, currParam))
  }
  return changes
}

function compareMethod(path: string, method: string, prev: unknown, curr: unknown): EndpointDiff | null {
  if (!prev && curr) return createEndpointDiff(path, method, [createDiffChange(DIFF_TYPE.ADDED, `${method.toUpperCase()} ${path}`, `신규 API 추가: ${method.toUpperCase()} ${path}`, undefined, curr)], false, extractTags(curr))
  if (prev && !curr) return createEndpointDiff(path, method, [createDiffChange(DIFF_TYPE.REMOVED, `${method.toUpperCase()} ${path}`, `API 삭제: ${method.toUpperCase()} ${path}`, prev)], true, extractTags(prev))
  if (prev && curr) {
    const po = prev as Record<string, unknown>
    const co = curr as Record<string, unknown>
    const changes: DiffChange[] = [
      ...compareParams((po.parameters || []) as unknown[], (co.parameters || []) as unknown[], path, method),
      ...(() => {
        const bp = `${method.toUpperCase()} ${path}/requestBody`
        if (!po.requestBody && co.requestBody) return [createDiffChange(DIFF_TYPE.ADDED, bp, 'Request Body 추가', undefined, co.requestBody)]
        if (po.requestBody && !co.requestBody) return [createDiffChange(DIFF_TYPE.REMOVED, bp, 'Request Body 삭제', po.requestBody)]
        if (po.requestBody && co.requestBody && isValueChanged(po.requestBody, co.requestBody)) return [createDiffChange(DIFF_TYPE.MODIFIED, bp, 'Request Body 변경', po.requestBody, co.requestBody)]
        return []
      })(),
      ...(() => {
        const prevResp = (po.responses || {}) as Record<string, unknown>
        const currResp = (co.responses || {}) as Record<string, unknown>
        const changes: DiffChange[] = []
        const codes = new Set([...Object.keys(prevResp), ...Object.keys(currResp)])
        for (const code of codes) {
          const rp = `${method.toUpperCase()} ${path}/responses/${code}`
          if (!prevResp[code] && currResp[code]) changes.push(createDiffChange(DIFF_TYPE.ADDED, rp, `Response 추가: ${code}`, undefined, currResp[code]))
          else if (prevResp[code] && !currResp[code]) changes.push(createDiffChange(DIFF_TYPE.REMOVED, rp, `Response 삭제: ${code}`, prevResp[code]))
          else if (prevResp[code] && currResp[code] && isValueChanged(prevResp[code], currResp[code])) changes.push(createDiffChange(DIFF_TYPE.MODIFIED, rp, `Response 변경: ${code}`, prevResp[code], currResp[code]))
        }
        return changes
      })()
    ]
    if (changes.length > 0) return createEndpointDiff(path, method, changes, detectBreaking(changes), extractTags(curr) || extractTags(prev))
  }
  return null
}

function compareSwagger(prev: SwaggerDocument, curr: SwaggerDocument, projectId: string, prevSnapId: string, currSnapId: string) {
  const endpointDiffs: EndpointDiff[] = []
  for (const path of getAllPaths(prev, curr)) {
    const prevPath = prev.paths?.[path] || {}
    const currPath = curr.paths?.[path] || {}
    const allMethods = new Set([...Object.keys(prevPath), ...Object.keys(currPath)])
    for (const method of allMethods) {
      const d = compareMethod(path, method, prevPath[method], currPath[method])
      if (d) endpointDiffs.push(d)
    }
  }
  return {
    projectId, previousSnapshotId: prevSnapId, currentSnapshotId: currSnapId,
    comparedAt: new Date().toISOString(),
    endpointDiffs,
    summary: {
      added: endpointDiffs.filter(d => d.changes.some(c => c.type === DIFF_TYPE.ADDED)).length,
      removed: endpointDiffs.filter(d => d.changes.some(c => c.type === DIFF_TYPE.REMOVED)).length,
      modified: endpointDiffs.filter(d => d.changes.some(c => c.type === DIFF_TYPE.MODIFIED)).length,
      breaking: endpointDiffs.filter(d => d.isBreaking).length
    }
  }
}

// ── 메인 핸들러 ─────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: '인증 토큰이 필요합니다' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const anonClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!)

    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) return new Response(JSON.stringify({ error: '유효하지 않은 토큰입니다' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { projectId } = await req.json()
    if (!projectId) return new Response(JSON.stringify({ error: 'projectId가 필요합니다' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: project, error: projectError } = await supabase.from('projects').select('*').eq('id', projectId).single()
    if (projectError || !project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    if (project.userId !== user.id) return new Response(JSON.stringify({ error: '권한이 없습니다' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Swagger 문서 가져오기 (GET 요청에 Content-Type을 넣으면 일부 서버가 거부함)
    const fetchHeaders: Record<string, string> = { Accept: 'application/json, application/yaml, */*' }
    if (project.apiKey && project.apiKeyHeader) fetchHeaders[project.apiKeyHeader] = project.apiKey

    let swaggerRes: Response
    try {
      swaggerRes = await fetch(project.swaggerUrl, { headers: fetchHeaders })
    } catch (fetchErr) {
      return new Response(
        JSON.stringify({ error: `Swagger URL에 연결할 수 없습니다: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!swaggerRes.ok) return new Response(JSON.stringify({ error: `Swagger 문서를 가져올 수 없습니다: ${swaggerRes.status}` }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const responseText = await swaggerRes.text()
    let swagger: SwaggerDocument
    try {
      swagger = JSON.parse(responseText) as SwaggerDocument
    } catch (parseErr) {
      return new Response(
        JSON.stringify({ error: `Swagger 문서 파싱 실패 (JSON 형식이 필요합니다): ${parseErr instanceof Error ? parseErr.message : String(parseErr)}` }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const compressed = JSON.stringify(swagger)

    // 이전 스냅샷 조회
    const { data: prevSnapshot } = await supabase.from('snapshots').select('*').eq('projectId', projectId).order('createdAt', { ascending: false }).limit(1).maybeSingle()

    if (prevSnapshot && prevSnapshot.data === compressed) {
      await supabase.from('projects').update({ lastCheckedAt: new Date().toISOString() }).eq('id', projectId)
      return new Response(JSON.stringify({
        status: 'no_changes', message: 'No changes detected',
        lastSnapshot: { id: prevSnapshot.id, createdAt: prevSnapshot.createdAt, version: prevSnapshot.version }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 새 스냅샷 저장
    const snapshotId = crypto.randomUUID()
    const now = new Date().toISOString()
    const { data: snapshot, error: snapError } = await supabase.from('snapshots')
      .insert({ id: snapshotId, projectId, data: compressed, version: swagger.info.version, createdAt: now })
      .select().single()
    if (snapError || !snapshot) throw new Error(`스냅샷 저장 실패: ${snapError?.message ?? 'unknown'}`)

    // Diff 계산 및 저장
    let diffResult = null
    if (prevSnapshot) {
      const prevSwagger: SwaggerDocument = JSON.parse(prevSnapshot.data)
      const diff = compareSwagger(prevSwagger, swagger, projectId, prevSnapshot.id, snapshotId)
      const { data: dr } = await supabase.from('diff_results').insert({
        id: crypto.randomUUID(), projectId,
        previousSnapshotId: prevSnapshot.id, currentSnapshotId: snapshotId,
        endpointDiffs: diff.endpointDiffs, summary: diff.summary, comparedAt: now
      }).select().single()
      diffResult = dr
    }

    await supabase.from('projects').update({ lastCheckedAt: now, updatedAt: now }).eq('id', projectId)

    return new Response(JSON.stringify({ status: 'changes_detected', message: 'New changes saved', snapshot, diffResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : '오류가 발생했습니다' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
