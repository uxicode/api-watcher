# 프론트엔드-백엔드 API 연결 확인

## ✅ 연결된 API 엔드포인트

### 프로젝트 관련
- ✅ `GET /api/projects` - 프로젝트 목록 조회
  - 프론트: `project-store.ts:158` - `loadProjectsFromBackend()`
  - 백엔드: `server/src/routes/projects.ts:13` - `getProjects`

- ✅ `POST /api/projects` - 프로젝트 생성
  - 프론트: `project-store.ts:222` - `addProject()`
  - 백엔드: `server/src/routes/projects.ts:15` - `createProject`

- ✅ `PUT /api/projects/:id` - 프로젝트 업데이트
  - 프론트: `project-store.ts:260` - `updateProject()`
  - 백엔드: `server/src/routes/projects.ts:16` - `updateProject`

- ✅ `DELETE /api/projects/:id` - 프로젝트 삭제
  - 프론트: `project-store.ts:294` - `deleteProject()`
  - 백엔드: `server/src/routes/projects.ts:17` - `deleteProject`

- ✅ `POST /api/projects/:id/collect` - Swagger 수집 및 스냅샷 생성
  - 프론트: `project-store.ts:332` - `collectSwagger()`
  - 백엔드: `server/src/routes/projects.ts:18` - `collectSwagger`

### 스냅샷 관련
- ✅ `GET /api/snapshots/project/:projectId` - 프로젝트별 스냅샷 목록
  - 프론트: `project-store.ts:184` - `loadSnapshotsFromBackend()`
  - 백엔드: `server/src/routes/snapshots.ts:6` - `getSnapshotsByProject`
  - 사용처: `ProjectDetail.vue:153`

### Diff 관련
- ✅ `GET /api/diffs/project/:projectId` - 프로젝트별 Diff 목록
  - 프론트: `project-store.ts:202` - `loadDiffsFromBackend()`
  - 백엔드: `server/src/routes/diffs.ts:6` - `getDiffsByProject`
  - 사용처: `ProjectDetail.vue:154`

- ✅ `GET /api/diffs/:id` - Diff 상세 조회 (추가됨)
  - 프론트: `project-store.ts:213` - `loadDiffById()` (새로 추가)
  - 백엔드: `server/src/routes/diffs.ts:7` - `getDiff`

## ⚠️ 백엔드에 있지만 프론트엔드에서 선택적으로 사용하는 API

### 프로젝트
- `GET /api/projects/:id` - 프로젝트 상세 조회
  - 백엔드: `server/src/routes/projects.ts:14` - `getProject`
  - 프론트: `store.getProject()` computed로 로컬에서 조회 (이미 로드된 목록에서 찾음)
  - 개선: `ProjectDetail.vue`에서 프로젝트가 없을 경우 백엔드에서 로드하도록 수정됨

### 스냅샷
- `GET /api/snapshots/:id` - 스냅샷 상세 조회
  - 백엔드: `server/src/routes/snapshots.ts:7` - `getSnapshot`
  - 프론트: 사용 안 함 (스냅샷 데이터는 이미 로드된 목록에서 사용)

## 📋 API 연결 상태 요약

### ✅ 완전히 연결된 API (7개)
1. GET /api/projects - 프로젝트 목록
2. POST /api/projects - 프로젝트 생성
3. PUT /api/projects/:id - 프로젝트 업데이트
4. DELETE /api/projects/:id - 프로젝트 삭제
5. POST /api/projects/:id/collect - Swagger 수집
6. GET /api/snapshots/project/:projectId - 스냅샷 목록
7. GET /api/diffs/project/:projectId - Diff 목록

### ✅ 추가 개선 사항
- `loadDiffById()` 함수 추가: 특정 diff를 백엔드에서 직접 로드 가능
- `ProjectDetail.vue`: 프로젝트가 없을 경우 백엔드에서 자동 로드
- `DiffView.vue`: diff가 없을 경우 백엔드에서 자동 로드

## 🔍 데이터 흐름

### 프로젝트 관리
1. **목록 조회**: Dashboard 진입 시 `GET /api/projects`
2. **생성**: 프로젝트 추가 시 `POST /api/projects`
3. **수정**: 프로젝트 수정 시 `PUT /api/projects/:id`
4. **삭제**: 프로젝트 삭제 시 `DELETE /api/projects/:id`

### Swagger 수집
1. **수집 요청**: `POST /api/projects/:id/collect`
2. **응답**: `{ snapshot, diffResult }` - 스냅샷과 diff 결과 함께 반환

### 스냅샷 및 Diff 조회
1. **프로젝트 상세 페이지**: `GET /api/snapshots/project/:projectId`, `GET /api/diffs/project/:projectId`
2. **Diff 상세 페이지**: 로컬 store에서 조회, 없으면 백엔드에서 로드

## ✅ 결론

**모든 필수 API가 정상적으로 연결되어 있습니다!**

- 프로젝트 CRUD: ✅ 완전 연결
- Swagger 수집: ✅ 연결됨
- 스냅샷 조회: ✅ 연결됨
- Diff 조회: ✅ 연결됨 (개선됨)

추가 개선 사항도 반영되어 데이터가 없을 경우 백엔드에서 자동으로 로드하도록 개선되었습니다.
