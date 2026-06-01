import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isAuthFailure, requireAuthUser } from '../_shared/auth.ts'
import { errorResponse, jsonResponse } from '../_shared/cors.ts'
import { compareSwagger } from './swagger-diff.ts'
import { fetchSwaggerDocument } from './swagger-fetch.ts'
import type { Project, Snapshot, SwaggerDocument } from './types.ts'

// Supabase 서비스 역할 클라이언트 생성
function createServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
}

// 프로젝트 로드
async function loadProject(projectId: string, userId: string): Promise<Project | Response> {
  const supabase = createServiceClient()
  // 프로젝트 조회
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  // 프로젝트 조회 실패 시 에러 응답 반환 (404 Not Found)
  if (projectError || !project) return errorResponse('Project not found', 404)
  // 프로젝트 소유자 확인
  if (project.userId !== userId) return errorResponse('권한이 없습니다', 403)
  // 프로젝트 반환
  // 프로젝트 반환 실패 시 에러 응답 반환 (500 Internal Server Error)
  return project as Project
}

// 최신 스냅샷 로드 (최신 스냅샷 조회)
async function loadLatestSnapshot(projectId: string): Promise<Snapshot | null> {
  const supabase = createServiceClient()
  // 스냅샷 조회
  const { data: prevSnapshot } = await supabase
    .from('snapshots') // 스냅샷 테이블 조회
    .select('*') // 모든 필드 선택
    .eq('projectId', projectId) // 프로젝트 ID 필터
    .order('createdAt', { ascending: false }) // 생성일 내림차순 정렬
    .limit(1) // 최신 스냅샷 1개 제한
    .maybeSingle() // 최신 스냅샷 반환

  // 최신 스냅샷 반환
  return prevSnapshot as Snapshot | null
}

// 프로젝트 마지막 확인일 업데이트
async function touchProjectLastChecked(projectId: string, updatedAt?: string) {
  const supabase = createServiceClient() // Supabase 서비스 역할 클라이언트 생성  
  const payload = updatedAt
    ? { lastCheckedAt: updatedAt, updatedAt } // 마지막 확인일 업데이트
    : { lastCheckedAt: new Date().toISOString() } // 마지막 확인일 생성

  // 프로젝트 마지막 확인일 업데이트
  await supabase.from('projects').update(payload).eq('id', projectId)
}

// 스냅샷 저장
async function saveSnapshot(
  projectId: string,
  compressed: string,
  version: string,
  now: string
) {
  const supabase = createServiceClient()
  const snapshotId = crypto.randomUUID()

  // 스냅샷 저장
  const { data: snapshot, error: snapError } = await supabase
    .from('snapshots') // 스냅샷 테이블 저장      
    .insert({
      id: snapshotId,
      projectId,
      data: compressed,
      version,
      createdAt: now
    })
    .select() // 모든 필드 선택
    .single() // 스냅샷 반환

  if (snapError || !snapshot) {
    throw new Error(`스냅샷 저장 실패: ${snapError?.message ?? 'unknown'}`)
  }

  return { snapshot: snapshot as Snapshot, snapshotId }
}

// 차이 결과 저장
async function saveDiffResult(
  projectId: string,
  prevSnapshotId: string,
  snapshotId: string,
  diff: ReturnType<typeof compareSwagger>,
  now: string
) {
  const supabase = createServiceClient()
  const { data: diffResult } = await supabase
    .from('diff_results')
    .insert({
      id: crypto.randomUUID(),
      projectId,
      previousSnapshotId: prevSnapshotId,
      currentSnapshotId: snapshotId,
      endpointDiffs: diff.endpointDiffs,
      summary: diff.summary,
      comparedAt: now
    })
    .select()
    .single()

  return diffResult
}

// 변경 없음 응답 생성  
function buildNoChangesResponse(prevSnapshot: Snapshot) {
  return jsonResponse({
    status: 'no_changes',
    message: 'No changes detected', // 변경 없음 메시지
    lastSnapshot: { // 최신 스냅샷 정보
      id: prevSnapshot.id, // 스냅샷 ID
      createdAt: prevSnapshot.createdAt, // 생성일
      version: prevSnapshot.version // 버전
    }
  })
}

// 스와그그 수집 핸들러
export async function handleCollectSwagger(req: Request): Promise<Response> {
  // 인증 결과 확인
  const authResult = await requireAuthUser(req)
  if (isAuthFailure(authResult)) return authResult.response

  const { projectId } = await req.json()
  if (!projectId) return errorResponse('projectId가 필요합니다', 400)

  const projectResult = await loadProject(projectId, authResult.user.id)
  if (projectResult instanceof Response) return projectResult

  const fetchResult = await fetchSwaggerDocument(projectResult)
  if (!fetchResult.ok) return fetchResult.response

  const { swagger, compressed } = fetchResult
  const prevSnapshot = await loadLatestSnapshot(projectId)

  if (prevSnapshot?.data === compressed) {
    await touchProjectLastChecked(projectId)
    return buildNoChangesResponse(prevSnapshot)
  }

  const now = new Date().toISOString()
  const { snapshot, snapshotId } = await saveSnapshot(
    projectId,
    compressed,
    swagger.info.version,
    now
  )

  let diffResult = null
  if (prevSnapshot) {
    const prevSwagger = JSON.parse(prevSnapshot.data) as SwaggerDocument
    const diff = compareSwagger(prevSwagger, swagger, projectId, prevSnapshot.id, snapshotId)
    diffResult = await saveDiffResult(projectId, prevSnapshot.id, snapshotId, diff, now)
  }

  // 프로젝트 마지막 확인일 업데이트
  await touchProjectLastChecked(projectId, now)

  return jsonResponse({ // 변경 감지 응답 생성
    status: 'changes_detected',
    message: 'New changes saved',
    snapshot,
    diffResult
  })
}
