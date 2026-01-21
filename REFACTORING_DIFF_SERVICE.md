# 🔧 diff-service.ts 리팩토링 완료

## 🎯 리팩토링 목적

`compareSwaggerDocuments()` 함수가 너무 길고 if/else if 구문이 중첩되어 있어 가독성과 유지보수성이 낮았습니다.

---

## 📊 Before vs After

### Before (기존)
```typescript
// 112줄의 하나의 거대한 함수
compareSwaggerDocuments() {
  // 19-112 라인까지 길게 작성
  for (const path of allPaths) {
    if (!prevPath && currPath) {
      // 30줄 코드...
    } else if (prevPath && !currPath) {
      // 30줄 코드...
    } else if (prevPath && currPath) {
      for (const method of allMethods) {
        if (!prevMethod && currMethod) {
          // 20줄 코드...
        } else if (prevMethod && !currMethod) {
          // 20줄 코드...
        } else if (prevMethod && currMethod) {
          // 15줄 코드...
        }
      }
    }
  }
  // summary 생성...
}
```

**문제점:**
- ❌ 함수가 너무 김 (112줄)
- ❌ 중첩된 if/else if 구문
- ❌ 책임이 너무 많음 (Single Responsibility 위반)
- ❌ 테스트하기 어려움
- ❌ 재사용성 낮음

### After (개선)
```typescript
// 메인 함수는 33줄로 축소 - 흐름만 표현
compareSwaggerDocuments() {
  const allPaths = this.getAllPaths(previous, current)
  
  for (const path of allPaths) {
    const pathDiffs = this.comparePath(path, prevPath, currPath)
    endpointDiffs.push(...pathDiffs)
  }
  
  const summary = this.createSummary(endpointDiffs)
  return { ...result }
}

// 각 책임별로 분리된 함수들
- getAllPaths()              // 경로 추출
- comparePath()               // 경로 비교
- handleAddedPath()           // 추가된 경로 처리
- handleRemovedPath()         // 삭제된 경로 처리
- handleModifiedPath()        // 수정된 경로 처리
- compareMethod()             // 메서드 비교
- createEndpointDiff()        // EndpointDiff 생성
- createSummary()             // 요약 생성
```

**장점:**
- ✅ 각 함수가 단일 책임만 가짐
- ✅ 가독성 향상 (함수명이 의도를 명확히 표현)
- ✅ 테스트하기 쉬움 (각 함수를 독립적으로 테스트 가능)
- ✅ 재사용 가능
- ✅ 유지보수 쉬움

---

## 🔨 리팩토링 상세 내역

### 1. Path 처리 로직 분리

**분리된 함수들:**
- `getAllPaths(previous, current)` - 모든 경로 추출
- `comparePath(path, prevPath, currPath)` - 단일 경로 비교
- `handleAddedPath(path, currPath)` - 새로 추가된 경로 처리
- `handleRemovedPath(path, prevPath)` - 삭제된 경로 처리
- `handleModifiedPath(path, prevPath, currPath)` - 수정된 경로 처리

**Before:**
```typescript
for (const path of allPaths) {
  if (!prevPath && currPath) {
    // 신규 API 추가 - 30줄 코드
  } else if (prevPath && !currPath) {
    // API 삭제 - 30줄 코드
  } else if (prevPath && currPath) {
    // 변경 확인 - 40줄 코드
  }
}
```

**After:**
```typescript
for (const path of allPaths) {
  const pathDiffs = this.comparePath(path, prevPath, currPath)
  endpointDiffs.push(...pathDiffs)
}

// comparePath는 내부적으로:
private comparePath(path, prevPath, currPath) {
  if (!prevPath && currPath) return this.handleAddedPath(path, currPath)
  if (prevPath && !currPath) return this.handleRemovedPath(path, prevPath)
  if (prevPath && currPath) return this.handleModifiedPath(path, prevPath, currPath)
  return []
}
```

### 2. Method 처리 로직 분리

**분리된 함수:**
- `compareMethod(path, method, prevMethod, currMethod)` - 메서드 비교

**Before:**
```typescript
if (!prevMethod && currMethod) {
  // 20줄 코드
} else if (prevMethod && !currMethod) {
  // 20줄 코드
} else if (prevMethod && currMethod) {
  // 15줄 코드
}
```

**After:**
```typescript
const methodDiff = this.compareMethod(path, method, prevMethod, currMethod)
if (methodDiff) diffs.push(methodDiff)
```

### 3. Parameters 비교 로직 개선

**분리된 함수들:**
- `createParameterMap(params)` - Parameter 배열을 Map으로 변환
- `findRemovedParameters()` - 삭제된 파라미터 찾기
- `findAddedOrModifiedParameters()` - 추가/변경된 파라미터 찾기

**Before:**
```typescript
compareParameters() {
  const prevParams = new Map(prev.map(p => [p.name, p]))
  const currParams = new Map(curr.map(p => [p.name, p]))
  
  // 삭제된 파라미터 - 15줄
  for (const [name, param] of prevParams) {
    if (!currParams.has(name)) { /* ... */ }
  }
  
  // 추가/변경된 파라미터 - 25줄
  for (const [name, param] of currParams) {
    if (!prevParams.has(name)) { /* ... */ }
    else { /* ... */ }
  }
}
```

**After:**
```typescript
compareParameters(prev, curr, path, method) {
  const prevParams = this.createParameterMap(prev)
  const currParams = this.createParameterMap(curr)
  
  changes.push(...this.findRemovedParameters(prevParams, currParams, path, method))
  changes.push(...this.findAddedOrModifiedParameters(prevParams, currParams, path, method))
  
  return changes
}
```

### 4. 공통 헬퍼 함수 추가

**추가된 헬퍼 함수들:**
- `createEndpointDiff()` - EndpointDiff 객체 생성
- `createDiffChange()` - DiffChange 객체 생성
- `createSummary()` - 요약 정보 생성
- `isValueChanged()` - 값 변경 여부 확인

**Before:**
```typescript
// 중복된 코드가 여러 곳에 산재
endpointDiffs.push({
  path,
  method,
  changes: [{
    type: DIFF_TYPE.ADDED,
    path: `${method.toUpperCase()} ${path}`,
    newValue: currPath[method],
    description: `신규 API 추가: ${method.toUpperCase()} ${path}`
  }],
  isBreaking: false
})
```

**After:**
```typescript
// 재사용 가능한 헬퍼 함수
return this.createEndpointDiff(
  path,
  method,
  [this.createDiffChange(
    DIFF_TYPE.ADDED,
    `${method.toUpperCase()} ${path}`,
    `신규 API 추가: ${method.toUpperCase()} ${path}`,
    undefined,
    currPath[method]
  )],
  false
)
```

### 5. Request Body & Response 비교 개선

**Before:**
```typescript
// 중첩된 if/else if 구문
if (!prev && curr) { /* ... */ }
else if (prev && !curr) { /* ... */ }
else if (prev && curr) { /* ... */ }
```

**After:**
```typescript
// Early return 패턴으로 개선
if (!prev && curr) {
  return [this.createDiffChange(DIFF_TYPE.ADDED, ...)]
}

if (prev && !curr) {
  return [this.createDiffChange(DIFF_TYPE.REMOVED, ...)]
}

if (prev && curr && this.isValueChanged(prev, curr)) {
  return [this.createDiffChange(DIFF_TYPE.MODIFIED, ...)]
}

return []
```

---

## 📈 개선 효과

### 함수 길이 감소
```
compareSwaggerDocuments:   112줄 → 33줄 (71% 감소)
compareEndpoint:            42줄 → 38줄 (간소화)
compareParameters:          42줄 → 20줄 (52% 감소)
compareRequestBody:         30줄 → 35줄 (명확성 향상)
compareResponses:           35줄 → 30줄 (간소화)
```

### 함수 개수 증가 (책임 분리)
```
Before: 6개 함수
After:  20개 함수

추가된 함수들:
- getAllPaths
- comparePath
- handleAddedPath
- handleRemovedPath
- handleModifiedPath
- compareMethod
- createEndpointDiff
- createSummary
- createParameterMap
- findRemovedParameters
- findAddedOrModifiedParameters
- compareResponse
- createDiffChange
- isValueChanged
```

### 가독성 향상
```
중첩 깊이:  4단계 → 2단계
함수당 책임: 여러 개 → 단일 책임
명확성:     낮음 → 높음 (함수명이 의도를 표현)
```

---

## 🧪 테스트 용이성

### Before
```typescript
// 전체 compareSwaggerDocuments를 한 번에 테스트해야 함
it('should compare swagger documents', () => {
  const result = diffService.compareSwaggerDocuments(prev, curr, ...)
  // 복잡한 assertion...
})
```

### After
```typescript
// 각 기능을 독립적으로 테스트 가능
describe('comparePath', () => {
  it('should handle added path', () => {
    const result = diffService['comparePath'](path, undefined, currPath)
    expect(result).toHaveLength(2)
  })
  
  it('should handle removed path', () => {
    const result = diffService['comparePath'](path, prevPath, undefined)
    expect(result[0].isBreaking).toBe(true)
  })
})

describe('compareMethod', () => {
  it('should detect method addition', () => { /* ... */ })
  it('should detect method removal', () => { /* ... */ })
  it('should detect method modification', () => { /* ... */ })
})

describe('findRemovedParameters', () => {
  it('should find removed parameters', () => { /* ... */ })
})
```

---

## 📚 설계 원칙 적용

### 1. Single Responsibility Principle (단일 책임 원칙)
- ✅ 각 함수가 하나의 책임만 가짐
- `comparePath` - 경로 비교만 담당
- `handleAddedPath` - 추가된 경로 처리만 담당

### 2. Don't Repeat Yourself (DRY)
- ✅ 중복 코드를 헬퍼 함수로 추출
- `createEndpointDiff()` - EndpointDiff 생성 로직 재사용
- `createDiffChange()` - DiffChange 생성 로직 재사용

### 3. Separation of Concerns (관심사 분리)
- ✅ 비즈니스 로직 분리
- 경로 처리, 메서드 처리, 파라미터 처리 각각 분리

### 4. Open/Closed Principle (개방-폐쇄 원칙)
- ✅ 새로운 비교 로직 추가가 쉬움
- 기존 코드 수정 없이 새로운 함수 추가 가능

---

## 🎯 타입 안전성 개선

### Before
```typescript
previous: SwaggerPath[string]  // 모호한 타입
prev: unknown[]                // 타입 안전성 낮음
currParams: Map<string, unknown>
```

### After
```typescript
previous: SwaggerOperation           // 명확한 타입
prev: SwaggerParameter[]            // 구체적인 타입
currParams: Map<string, SwaggerParameter>  // 타입 안전
```

**장점:**
- ✅ TypeScript 컴파일 타임에 에러 감지
- ✅ IDE 자동완성 지원 향상
- ✅ 런타임 에러 감소

---

## 📝 함수 계층 구조

```
compareSwaggerDocuments (최상위)
├── getAllPaths
├── comparePath
│   ├── handleAddedPath
│   │   └── createEndpointDiff
│   │       └── createDiffChange
│   ├── handleRemovedPath
│   │   └── createEndpointDiff
│   │       └── createDiffChange
│   └── handleModifiedPath
│       └── compareMethod
│           ├── createEndpointDiff
│           └── compareEndpoint
│               ├── compareParameters
│               │   ├── createParameterMap
│               │   ├── findRemovedParameters
│               │   │   └── createDiffChange
│               │   └── findAddedOrModifiedParameters
│               │       ├── createDiffChange
│               │       └── isValueChanged
│               ├── compareRequestBody
│               │   └── createDiffChange
│               └── compareResponses
│                   └── compareResponse
│                       └── createDiffChange
└── createSummary
```

---

## ✅ 체크리스트

- [x] `compareSwaggerDocuments` 함수 분리
- [x] Path 비교 로직 분리 (`comparePath`, `handleAddedPath`, `handleRemovedPath`, `handleModifiedPath`)
- [x] Method 비교 로직 분리 (`compareMethod`)
- [x] Parameters 비교 개선 (`findRemovedParameters`, `findAddedOrModifiedParameters`)
- [x] Request Body 비교 개선 (Early return 패턴)
- [x] Response 비교 개선 (`compareResponse`)
- [x] 공통 헬퍼 함수 추가 (`createEndpointDiff`, `createDiffChange`, `createSummary`, `isValueChanged`)
- [x] 타입 안전성 개선 (`SwaggerOperation`, `SwaggerParameter`)
- [x] TypeScript 컴파일 에러 해결
- [x] JSDoc 주석 추가

---

## 🎉 결과

**Before:**
- 112줄의 거대한 함수
- 중첩된 if/else if 구문
- 테스트하기 어려움
- 유지보수 어려움

**After:**
- 33줄의 간결한 메인 함수
- 20개의 명확한 책임을 가진 함수들
- 테스트 가능
- 유지보수 쉬움
- 타입 안전
- 가독성 향상

**이제 새로운 비교 로직 추가나 수정이 훨씬 쉬워졌습니다!** 🚀
