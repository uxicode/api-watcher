# 🔧 프로젝트 수정 기능 추가

## ✅ 구현 완료

프로젝트 이름과 Swagger URL을 수정할 수 있는 기능이 추가되었습니다.

---

## 🎯 기능 요약

### 1. **프로젝트 상세 화면에서 수정**
- **위치**: `/projects/:id` (프로젝트 상세보기)
- **버튼**: "수정" 버튼 클릭
- **기능**: 프로젝트 이름, Swagger URL, API Key 설정 수정 가능

### 2. **대시보드에서 수정**
- **위치**: `/` (대시보드)
- **버튼**: 각 프로젝트 카드의 "수정" 버튼 클릭
- **기능**: 즉시 수정 모달 팝업

---

## 📝 수정된 파일

### 1. **`ProjectFormModal.vue`** (프로젝트 추가/수정 모달)

#### Before (추가 전용)
```vue
<h2>프로젝트 추가</h2>
<button>추가</button>
```

#### After (추가/수정 지원)
```vue
<h2>{{ isEditMode ? '프로젝트 수정' : '프로젝트 추가' }}</h2>
<button>{{ isEditMode ? '저장' : '추가' }}</button>
```

**주요 변경사항:**
- ✅ `project` prop 추가 (수정 모드 판단)
- ✅ `isEditMode` computed 추가
- ✅ `update` 이벤트 추가 (수정용)
- ✅ `onMounted`에서 초기값 설정
- ✅ 제목과 버튼 텍스트 동적 변경

```typescript
interface Props {
  project?: Project  // 수정 모드일 때 전달
}

const isEditMode = computed(() => !!props.project)

// 수정 모드일 때 초기값 설정
onMounted(() => {
  if (props.project) {
    form.name = props.project.name
    form.swaggerUrl = props.project.swaggerUrl
    form.apiKey = props.project.apiKey || ''
    form.apiKeyHeader = props.project.apiKeyHeader || ''
    hasApiKey.value = !!(props.project.apiKey || props.project.apiKeyHeader)
  }
})
```

---

### 2. **`ProjectDetail.vue`** (프로젝트 상세보기)

**추가된 요소:**
- ✅ "수정" 버튼
- ✅ `showEditModal` ref
- ✅ `ProjectFormModal` 컴포넌트 import
- ✅ `handleUpdate` 함수

```vue
<!-- 버튼 추가 -->
<button class="btn btn-secondary" @click="showEditModal = true">
  수정
</button>

<!-- 모달 추가 -->
<ProjectFormModal
  v-if="showEditModal"
  :project="project"
  @close="showEditModal = false"
  @update="handleUpdate"
/>
```

```typescript
// 수정 핸들러
async function handleUpdate(id: string, updates: Partial<Project>) {
  try {
    await store.updateProject(id, updates)
    showEditModal.value = false
    alert('✅ 프로젝트가 성공적으로 수정되었습니다.')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    alert(`❌ 프로젝트 수정 실패\n\n${errorMessage}`)
  }
}
```

---

### 3. **`ProjectCard.vue`** (대시보드 프로젝트 카드)

**추가된 요소:**
- ✅ "수정" 버튼
- ✅ `showEditModal` ref
- ✅ `ProjectFormModal` 컴포넌트 import
- ✅ `handleEditClick` 함수
- ✅ `handleUpdate` 함수

```vue
<!-- 버튼 추가 -->
<button class="btn btn-sm btn-secondary" @click="handleEditClick">
  수정
</button>

<!-- 모달 추가 -->
<ProjectFormModal
  v-if="showEditModal"
  :project="project"
  @close="showEditModal = false"
  @update="handleUpdate"
/>
```

---

## 🔗 API 연동

### 백엔드 API (이미 구현됨)
```typescript
// PUT /api/projects/:id
export async function updateProject(req: Request, res: Response) {
  const { id } = req.params
  const { name, swaggerUrl, apiKey, apiKeyHeader, isActive } = req.body

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(swaggerUrl && { swaggerUrl }),
      ...(apiKey !== undefined && { apiKey }),
      ...(apiKeyHeader !== undefined && { apiKeyHeader }),
      ...(isActive !== undefined && { isActive })
    }
  })

  res.json(project)
}
```

### 프론트엔드 Store
```typescript
// project-store.ts
async function updateProject(id: string, updates: Partial<Project>) {
  if (useBackend.value) {
    // 백엔드 API 호출
    const apiProject = await apiService.put<ApiProject>(`/api/projects/${id}`, updates)
    const updatedProject = convertApiProject(apiProject)
    
    // 로컬 상태 업데이트
    const index = projects.value.findIndex(p => p.id === id)
    if (index !== -1) {
      projects.value[index] = updatedProject
    }
  } else {
    // LocalStorage 모드
    const project = projects.value.find(p => p.id === id)
    if (project) {
      Object.assign(project, updates, { updatedAt: new Date().toISOString() })
      saveToStorage()
    }
  }
}
```

---

## 🧪 사용 방법

### 1. **프로젝트 상세 화면에서 수정**

1. 대시보드에서 프로젝트 카드의 "상세보기" 클릭
2. 우측 상단 "수정" 버튼 클릭
3. 모달에서 정보 수정
   - 프로젝트 이름
   - Swagger 문서 URL
   - API Key 설정 (선택)
4. "저장" 버튼 클릭
5. ✅ 성공 메시지 확인

### 2. **대시보드에서 바로 수정**

1. 대시보드에서 프로젝트 카드 확인
2. "수정" 버튼 클릭
3. 모달에서 정보 수정
4. "저장" 버튼 클릭
5. ✅ 카드가 즉시 업데이트됨

---

## 🎨 UI/UX 특징

### 1. **모달 재사용**
- 기존 `ProjectFormModal` 컴포넌트 재사용
- `project` prop 유무로 추가/수정 모드 자동 전환
- 코드 중복 없음

### 2. **즉각적인 피드백**
- 수정 완료 시 성공 메시지 표시
- 에러 발생 시 상세한 에러 메시지 표시
- 모달 자동 닫힘

### 3. **버튼 배치**
```
[지금 체크하기] [수정] [삭제]  ← 프로젝트 상세
[체크하기] [수정] [상세보기]   ← 대시보드 카드
```

---

## 🔒 수정 가능 항목

### ✅ 수정 가능
- **프로젝트 이름** (`name`)
- **Swagger 문서 URL** (`swaggerUrl`)
- **API Key** (`apiKey`)
- **API Key Header** (`apiKeyHeader`)

### ❌ 수정 불가 (자동 생성/관리)
- **프로젝트 ID** (`id`) - UUID, 변경 불가
- **생성 시간** (`createdAt`) - 자동 생성
- **수정 시간** (`updatedAt`) - 자동 업데이트
- **마지막 체크 시간** (`lastCheckedAt`) - 체크 시 자동 업데이트

---

## 🚀 테스트 시나리오

### 시나리오 1: 프로젝트 이름 수정
1. 프로젝트 이름을 "백엔드 API" → "Admin API v2"로 변경
2. "저장" 클릭
3. ✅ 헤더와 카드에서 즉시 변경 확인

### 시나리오 2: Swagger URL 수정
1. URL을 `http://old-url/v3/api-docs` → `http://new-url/v3/api-docs`로 변경
2. "저장" 클릭
3. ✅ 다음 체크부터 새 URL 사용

### 시나리오 3: API Key 추가/변경
1. "API Key 인증 사용" 체크
2. Header: `X-API-Key`, Key: `new-secret-key` 입력
3. "저장" 클릭
4. ✅ 다음 체크부터 API Key 포함하여 요청

### 시나리오 4: API Key 제거
1. "API Key 인증 사용" 체크 해제
2. "저장" 클릭
3. ✅ API Key 없이 요청

---

## 📊 Before vs After

### Before ❌
- 프로젝트 정보 수정 불가
- 잘못 입력한 경우 삭제 후 재생성 필요
- 불편한 사용자 경험

### After ✅
- 언제든지 프로젝트 정보 수정 가능
- 상세보기 또는 대시보드에서 즉시 수정
- 편리한 사용자 경험

---

## 🎉 완성!

이제 프로젝트 이름, Swagger URL, API Key 설정을 언제든지 수정할 수 있습니다!

**수정 방법:**
1. **프로젝트 상세 화면**: 우측 상단 "수정" 버튼
2. **대시보드**: 각 카드의 "수정" 버튼

**특징:**
- ✅ 직관적인 UI
- ✅ 즉각적인 반영
- ✅ 상세한 에러 메시지
- ✅ 모달 재사용으로 코드 중복 없음
