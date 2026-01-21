# ✅ 중복 저장 방지 구현 완료

## 🎯 목적
SaaS 서비스 전환을 대비하여 **매번 저장하는 대신, 내용이 변경된 경우에만 저장**하도록 로직 개선

---

## 📊 변경 사항

### Before (기존)
```
매일 체크 → 무조건 스냅샷 저장 → Diff 생성
```
- **문제:** 변경 없어도 매번 저장
- **결과:** 불필요한 데이터 증가

### After (개선)
```
매일 체크 → 이전 스냅샷과 비교 
          ↓
    내용 동일? 
    ├─ YES → lastCheckedAt만 업데이트 (저장 안 함)
    └─ NO  → 새 스냅샷 저장 + Diff 생성
```
- **장점:** 실제 변경 시에만 저장
- **결과:** 데이터 절감 (약 90%)

---

## 🔧 구현 내역

### 1. 백엔드 (server/src/controllers/projectController.ts)

```typescript
export async function collectSwagger(req, res, next) {
  // 1. Swagger 문서 가져오기
  const swagger = await swaggerService.fetchProjectSwagger(project)
  const compressed = swaggerService.compressSwagger(swagger)
  
  // 2. ✅ 이전 스냅샷 조회
  const previousSnapshot = await prisma.snapshot.findFirst({
    where: { projectId: project.id },
    orderBy: { createdAt: 'desc' }
  })
  
  // 3. ✅ 내용 비교 (100% 동일한지 체크)
  if (previousSnapshot && previousSnapshot.data === compressed) {
    // 마지막 체크 시간만 업데이트
    await prisma.project.update({
      where: { id: project.id },
      data: { lastCheckedAt: new Date() }
    })
    
    // "변경 없음" 응답
    return res.status(200).json({
      status: 'no_changes',
      message: 'No changes detected',
      lastSnapshot: previousSnapshot
    })
  }
  
  // 4. ✅ 변경 감지됨 - 새 스냅샷 저장
  const snapshot = await prisma.snapshot.create({ ... })
  
  // 5. Diff 생성
  if (previousSnapshot) {
    const diffResult = await prisma.diffResult.create({ ... })
  }
  
  return res.status(201).json({
    status: 'changes_detected',
    snapshot,
    diffResult
  })
}
```

**핵심:**
- 압축된 JSON 문자열 직접 비교 (`previousSnapshot.data === compressed`)
- 동일하면 DB에 저장하지 않음
- `lastCheckedAt`만 업데이트

### 2. 프론트엔드 (src/stores/project-store.ts)

#### 백엔드 API 사용 시
```typescript
const response = await apiService.post(`/api/projects/${projectId}/collect`)

// "변경 없음" 처리
if (response.status === 'no_changes') {
  console.log('No changes detected')
  await loadProjectsFromBackend() // lastCheckedAt 갱신
  return null
}

// "변경 감지" 처리
if (response.snapshot) {
  const snapshot = convertApiSnapshot(response.snapshot)
  snapshots.value.push(snapshot)
  // ...
}
```

#### LocalStorage 사용 시 (백엔드 없이)
```typescript
const compressed = swaggerService.compressSwagger(swagger)

// ✅ 이전 스냅샷 조회
const previousSnapshot = snapshots.value
  .filter(s => s.projectId === projectId)
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

// ✅ 내용 비교
if (previousSnapshot && previousSnapshot.data === compressed) {
  console.log('No changes detected')
  
  // lastCheckedAt만 업데이트
  projects.value[projectIndex].lastCheckedAt = new Date().toISOString()
  saveToStorage()
  
  return previousSnapshot
}

// ✅ 변경 감지됨 - 새 스냅샷 저장
const snapshot = { ... }
snapshots.value.push(snapshot)
// ...
```

---

## 📈 예상 효과

### 시나리오: 100개 프로젝트, 매일 체크, 평균 10% 변경률

| 항목 | Before | After | 절감률 |
|------|--------|-------|--------|
| **월 스냅샷 수** | 3,000개 | 300개 | **90%** ⬇️ |
| **연 스냅샷 수** | 36,000개 | 3,600개 | **90%** ⬇️ |
| **월 데이터** | 150MB | 15MB | **90%** ⬇️ |
| **연 데이터** | 1.8GB | 180MB | **90%** ⬇️ |

### 실제 예시
```
Day  1: API 변경 → ✅ 스냅샷 저장 (1개)
Day  2: 변경 없음 → ❌ 저장 안 함 (0개)
Day  3: 변경 없음 → ❌ 저장 안 함 (0개)
Day  4: 변경 없음 → ❌ 저장 안 함 (0개)
Day  5: 변경 없음 → ❌ 저장 안 함 (0개)
Day  6: 변경 없음 → ❌ 저장 안 함 (0개)
Day  7: 변경 없음 → ❌ 저장 안 함 (0개)
Day  8: API 변경 → ✅ 스냅샷 저장 (1개)
...
Day 30: 총 3번 변경 → 3개 스냅샷 (기존 30개 대비 90% 감소)
```

---

## 🔍 비교 로직 상세

### 왜 문자열 비교를 사용했나?

```typescript
// ✅ 간단하고 정확한 방법
if (previousSnapshot.data === compressed) {
  // 100% 동일함
}
```

**장점:**
1. **빠름** - O(n) 문자열 비교
2. **정확** - 압축된 JSON이 동일 = 완전히 동일
3. **간단** - 추가 라이브러리 불필요
4. **안전** - 순서 변경도 감지 (JSON.stringify는 순서 보존)

**대안 (선택적):**
```typescript
// 해시 비교 (더 빠르지만 추가 구현 필요)
import crypto from 'crypto'

const currentHash = crypto.createHash('sha256').update(compressed).digest('hex')
const previousHash = crypto.createHash('sha256').update(previousSnapshot.data).digest('hex')

if (currentHash === previousHash) {
  // 동일함
}
```

---

## 📝 API 응답 형식

### "변경 없음" 응답
```json
{
  "status": "no_changes",
  "message": "No changes detected since last check",
  "lastCheckedAt": "2026-01-20T12:00:00Z",
  "lastSnapshot": {
    "id": "abc-123",
    "createdAt": "2026-01-15T10:00:00Z",
    "version": "1.0.0"
  }
}
```

### "변경 감지" 응답
```json
{
  "status": "changes_detected",
  "message": "New changes detected and saved",
  "snapshot": {
    "id": "xyz-789",
    "projectId": "proj-456",
    "createdAt": "2026-01-20T12:00:00Z",
    "data": "...압축된 JSON...",
    "version": "1.1.0"
  },
  "diffResult": {
    "id": "diff-999",
    "summary": {
      "added": 5,
      "removed": 2,
      "modified": 3,
      "breaking": 1
    },
    "endpointDiffs": [ /* ... */ ]
  }
}
```

---

## 🧪 테스트 방법

### 1. 수동 테스트

**시나리오 1: 변경 없음**
```bash
# 1차 체크 (새 스냅샷 생성)
curl -X POST http://localhost:3001/api/projects/{id}/collect

# 2차 체크 (동일한 API - 저장 안 됨)
curl -X POST http://localhost:3001/api/projects/{id}/collect

# 응답: { "status": "no_changes", ... }
```

**시나리오 2: 변경 감지**
```bash
# 1차 체크
curl -X POST http://localhost:3001/api/projects/{id}/collect

# API 수정 (swagger.json 변경)

# 2차 체크 (변경된 API - 새 스냅샷 생성)
curl -X POST http://localhost:3001/api/projects/{id}/collect

# 응답: { "status": "changes_detected", ... }
```

### 2. 데이터베이스 확인

```sql
-- 스냅샷 개수 확인
SELECT projectId, COUNT(*) as snapshot_count
FROM snapshots
GROUP BY projectId;

-- 최근 스냅샷 확인
SELECT id, projectId, createdAt, version
FROM snapshots
ORDER BY createdAt DESC
LIMIT 10;
```

### 3. 프론트엔드 테스트

1. 프로젝트 상세 페이지에서 "체크하기" 버튼 클릭
2. Console 확인:
   - `[collectSwagger] No changes detected` → 저장 안 됨 ✅
   - `[collectSwagger] Changes detected` → 저장됨 ✅
3. 프로젝트 목록에서 `lastCheckedAt` 업데이트 확인

---

## 🎯 다음 단계 (선택사항)

### Phase 2: 해시 기반 최적화
- Snapshot 모델에 `hash` 필드 추가
- 해시 인덱스로 빠른 중복 체크
- 대규모 데이터에 유리

### Phase 3: 압축 개선
- JSON.stringify → gzip 압축
- 60-80% 추가 데이터 절감

### Phase 4: 보관 정책
- 오래된 스냅샷 자동 정리
- 90일 이상: 월 1회만 보관

**현재 Phase 1 구현으로 충분!** ✅

---

## 📚 관련 문서

- **[DATA_OPTIMIZATION_PLAN.md](./DATA_OPTIMIZATION_PLAN.md)** - 전체 최적화 계획
- **[SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)** - 보안 체크리스트
- **[server/README.md](./server/README.md)** - 백엔드 API 문서

---

## ✅ 체크리스트

- [x] 백엔드 `collectSwagger` 함수 수정
  - [x] 이전 스냅샷 조회
  - [x] 압축된 데이터 비교
  - [x] 동일 시 저장 안 함 + `lastCheckedAt` 업데이트
  - [x] 다를 시 기존 로직 실행
- [x] 응답 구조 개선
  - [x] `status` 필드 추가
  - [x] "변경 없음" 응답 구조
  - [x] "변경 감지" 응답 구조
- [x] 프론트엔드 백엔드 API 처리
  - [x] `no_changes` 상태 처리
  - [x] `changes_detected` 상태 처리
  - [x] 프로젝트 정보 갱신
- [x] 프론트엔드 LocalStorage 로직
  - [x] 동일한 중복 체크 로직 구현
  - [x] `lastCheckedAt` 업데이트
  - [x] 콘솔 로그 추가

---

## 🎉 완료!

**이제 SaaS 서비스로 전환할 준비가 되었습니다!**

- ✅ 불필요한 데이터 저장 방지
- ✅ 약 90% 데이터 절감
- ✅ DB 비용 절감
- ✅ 쿼리 성능 향상
