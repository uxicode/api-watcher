# 📊 데이터 저장 최적화 계획 (SaaS 전환 대비)

## 🔍 현재 문제점

### ❌ 매번 스냅샷을 저장함
```typescript
// server/src/controllers/projectController.ts (현재)
export async function collectSwagger() {
  // 1. Swagger 문서 가져오기
  const swagger = await swaggerService.fetchProjectSwagger(project)
  
  // 2. ❌ 무조건 새 스냅샷 생성 (중복 체크 없음)
  const snapshot = await prisma.snapshot.create({
    data: {
      projectId: project.id,
      data: compressed,
      version: swagger.info.version
    }
  })
  
  // 3. 이전 스냅샷과 비교해서 Diff 생성
  const previousSnapshot = await prisma.snapshot.findFirst(...)
  if (previousSnapshot) {
    const diff = diffService.compareSwaggerDocuments(...)
    await prisma.diffResult.create({ data: diff })
  }
}
```

**문제:**
- API가 변경되지 않아도 매일 스냅샷이 쌓임
- 데이터베이스 용량 증가
- SaaS 서비스에서 비용 증가

---

## ✅ 개선 방안

### 중복 저장 방지 로직

```typescript
// 개선된 로직
export async function collectSwagger() {
  // 1. Swagger 문서 가져오기
  const swagger = await swaggerService.fetchProjectSwagger(project)
  const compressed = swaggerService.compressSwagger(swagger)
  
  // 2. ✅ 이전 스냅샷과 내용 비교
  const previousSnapshot = await prisma.snapshot.findFirst({
    where: { projectId: project.id },
    orderBy: { createdAt: 'desc' }
  })
  
  // 3. ✅ 내용이 100% 동일하면 저장하지 않고 종료
  if (previousSnapshot && previousSnapshot.data === compressed) {
    // 마지막 체크 시간만 업데이트
    await prisma.project.update({
      where: { id: project.id },
      data: { lastCheckedAt: new Date() }
    })
    
    return {
      status: 'no_changes',
      message: 'No changes detected',
      lastSnapshot: previousSnapshot
    }
  }
  
  // 4. ✅ 내용이 다르면 새 스냅샷 저장
  const snapshot = await prisma.snapshot.create({
    data: {
      projectId: project.id,
      data: compressed,
      version: swagger.info.version
    }
  })
  
  // 5. Diff 생성 (이전 스냅샷이 있는 경우)
  let diffResult = null
  if (previousSnapshot) {
    const previousSwagger = swaggerService.decompressSwagger(previousSnapshot.data)
    const diff = diffService.compareSwaggerDocuments(...)
    diffResult = await prisma.diffResult.create({ data: diff })
  }
  
  return {
    status: 'changes_detected',
    snapshot,
    diffResult
  }
}
```

---

## 📈 예상 효과

### Before (현재)
- **매일 체크 시:** 30일 = 30개 스냅샷 (변경 없어도)
- **변경 없는 기간:** 불필요한 데이터 저장

### After (개선)
- **매일 체크 시:** 변경된 날만 스냅샷 저장
- **변경 없는 기간:** `lastCheckedAt`만 업데이트
- **데이터 절약:** 실제 변경 시에만 저장

### 예시
```
Day 1: API 변경 → ✅ 스냅샷 저장
Day 2: 변경 없음 → ❌ 저장 안 함 (lastCheckedAt만 업데이트)
Day 3: 변경 없음 → ❌ 저장 안 함
Day 4: 변경 없음 → ❌ 저장 안 함
Day 5: API 변경 → ✅ 스냅샷 저장
...

결과: 30일 중 5번만 변경 = 5개 스냅샷 (vs 기존 30개)
```

---

## 🎯 구현 세부사항

### 1. 비교 로직
```typescript
// 간단한 문자열 비교 (압축된 데이터)
if (previousSnapshot.data === compressed) {
  // 동일함 - 저장하지 않음
}
```

**장점:**
- ✅ 빠른 비교 (문자열 비교)
- ✅ 100% 정확 (압축된 JSON이 동일하면 완전히 동일)

### 2. 해시 비교 (선택적 최적화)
```typescript
import crypto from 'crypto'

// SHA-256 해시 생성
function generateHash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

// 해시 비교
const currentHash = generateHash(compressed)
const previousHash = generateHash(previousSnapshot.data)

if (currentHash === previousHash) {
  // 동일함
}
```

**장점:**
- ✅ 더 빠른 비교 (해시 길이 고정)
- ✅ 해시를 DB에 저장하면 쿼리 최적화 가능

### 3. 응답 구조
```typescript
// 변경 없음
{
  status: 'no_changes',
  message: 'No changes detected since last check',
  lastCheckedAt: '2026-01-20T12:00:00Z',
  lastSnapshot: {
    id: '...',
    createdAt: '2026-01-15T12:00:00Z',
    version: '1.0.0'
  }
}

// 변경 있음
{
  status: 'changes_detected',
  message: 'New changes detected',
  snapshot: { /* 새 스냅샷 */ },
  diffResult: { /* Diff 결과 */ },
  summary: {
    added: 5,
    removed: 2,
    modified: 3,
    breaking: 1
  }
}
```

---

## 🚀 추가 최적화 (선택사항)

### 1. 스냅샷 보관 정책
```typescript
// 오래된 스냅샷 자동 삭제
// - 최근 30일 스냅샷은 모두 보관
// - 30일 ~ 90일: 주 1회만 보관
// - 90일 이상: 월 1회만 보관

async function cleanupOldSnapshots(projectId: string) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  
  // 30-90일 사이: 주 1회만 유지
  // 90일 이상: 월 1회만 유지
  // 구현...
}
```

### 2. 압축 개선
```typescript
// 현재: JSON.stringify
// 개선: gzip 압축
import zlib from 'zlib'

function compressSwagger(swagger: SwaggerDocument): string {
  const json = JSON.stringify(swagger)
  const compressed = zlib.gzipSync(json)
  return compressed.toString('base64')
}

function decompressSwagger(compressed: string): SwaggerDocument {
  const buffer = Buffer.from(compressed, 'base64')
  const decompressed = zlib.gunzipSync(buffer)
  return JSON.parse(decompressed.toString())
}
```

**효과:** 데이터 크기 60-80% 감소

### 3. 해시 필드 추가 (스키마 변경)
```prisma
model Snapshot {
  id        String   @id @default(uuid())
  projectId String
  data      String   // 압축된 JSON
  version   String
  hash      String   // ✅ 추가: SHA-256 해시
  createdAt DateTime @default(now())
  
  @@index([projectId, hash])  // ✅ 해시 인덱스
}
```

빠른 중복 체크:
```typescript
const existingSnapshot = await prisma.snapshot.findFirst({
  where: {
    projectId: project.id,
    hash: currentHash  // 해시로 빠른 조회
  }
})
```

---

## 📋 구현 체크리스트

### Phase 1: 중복 저장 방지 (필수)
- [ ] `collectSwagger` 함수 수정
  - [ ] 이전 스냅샷 조회를 먼저 수행
  - [ ] 압축된 데이터 비교
  - [ ] 동일하면 저장 안 함 + `lastCheckedAt` 업데이트
  - [ ] 다르면 기존 로직 실행
- [ ] 응답 구조 개선
  - [ ] `status` 필드 추가 (`no_changes`, `changes_detected`)
  - [ ] 변경 없을 때 이전 스냅샷 정보 반환
- [ ] 프론트엔드 처리
  - [ ] "변경 없음" 상태 표시
  - [ ] UI에 마지막 체크 시간 표시

### Phase 2: 해시 기반 최적화 (선택)
- [ ] Snapshot 모델에 `hash` 필드 추가
- [ ] 마이그레이션 생성
- [ ] 해시 생성 로직 추가
- [ ] 해시 기반 비교로 변경
- [ ] 기존 스냅샷에 해시 추가 (마이그레이션 스크립트)

### Phase 3: 압축 개선 (선택)
- [ ] gzip 압축 구현
- [ ] 기존 데이터 마이그레이션
- [ ] 압축률 테스트 및 검증

### Phase 4: 보관 정책 (선택)
- [ ] 오래된 스냅샷 정리 로직
- [ ] 크론 잡 설정
- [ ] 관리자 대시보드

---

## 💰 비용 절감 효과 (예상)

### 시나리오: 100개 프로젝트, 매일 체크

**Before:**
- 100 프로젝트 × 30일 = 3,000 스냅샷/월
- 평균 스냅샷 크기: 50KB
- 월 데이터: 150MB
- 연간 데이터: 1.8GB

**After (평균 10% 변경률 가정):**
- 100 프로젝트 × 3일 (변경) = 300 스냅샷/월
- 월 데이터: 15MB
- 연간 데이터: 180MB

**절감률: 90%** 🎉

---

## 🔧 테스트 계획

### 1. 단위 테스트
```typescript
describe('collectSwagger', () => {
  it('동일한 데이터일 때 스냅샷을 저장하지 않아야 함', async () => {
    // Given
    const project = await createTestProject()
    const swagger = await fetchSwagger(project)
    
    // 첫 번째 호출 - 스냅샷 생성
    await collectSwagger(project.id)
    const snapshotCount1 = await prisma.snapshot.count()
    
    // 두 번째 호출 - 동일한 데이터
    const result = await collectSwagger(project.id)
    const snapshotCount2 = await prisma.snapshot.count()
    
    // Then
    expect(result.status).toBe('no_changes')
    expect(snapshotCount2).toBe(snapshotCount1) // 스냅샷 수 동일
  })
  
  it('변경된 데이터일 때 스냅샷을 저장해야 함', async () => {
    // Given
    const project = await createTestProject()
    await collectSwagger(project.id)
    
    // Swagger 문서 변경 시뮬레이션
    await updateSwaggerDocument(project.swaggerUrl)
    
    // When
    const result = await collectSwagger(project.id)
    
    // Then
    expect(result.status).toBe('changes_detected')
    expect(result.snapshot).toBeDefined()
    expect(result.diffResult).toBeDefined()
  })
})
```

### 2. 통합 테스트
- 실제 API 호출로 전체 플로우 테스트
- 성능 측정 (응답 시간, DB 쿼리 수)

### 3. 부하 테스트
- 100개 프로젝트 동시 체크
- 메모리 사용량 확인
- DB 연결 풀 확인

---

## 📝 마이그레이션 가이드

### 기존 데이터 처리

```typescript
// 기존 스냅샷에 해시 추가 (Phase 2)
async function addHashToExistingSnapshots() {
  const snapshots = await prisma.snapshot.findMany()
  
  for (const snapshot of snapshots) {
    const hash = crypto
      .createHash('sha256')
      .update(snapshot.data)
      .digest('hex')
    
    await prisma.snapshot.update({
      where: { id: snapshot.id },
      data: { hash }
    })
  }
  
  console.log(`✅ ${snapshots.length}개 스냅샷에 해시 추가 완료`)
}
```

---

## 🎯 결론

**Phase 1 (중복 저장 방지)만 구현해도:**
- ✅ 90% 데이터 절감 (변경률 10% 가정)
- ✅ DB 비용 절감
- ✅ 쿼리 성능 향상
- ✅ SaaS 서비스 준비 완료

**우선순위:**
1. **Phase 1** - 즉시 구현 필요 ⭐⭐⭐
2. **Phase 2** - 사용자 증가 후 고려 ⭐⭐
3. **Phase 3, 4** - 대규모 서비스 시 고려 ⭐
