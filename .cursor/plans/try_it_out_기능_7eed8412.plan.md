---
name: Try It Out 기능
overview: ProjectDetail.vue에 Swagger의 Try it out / Execute 기능과 전역 Authorize 패널을 추가합니다. 별도 파일 없이 ProjectDetail.vue 단일 파일 내에서 구현합니다.
todos:
  - id: t1
    content: "script: swaggerBaseUrl computed, authConfig/tryItOutMap/tryItOutValues/tryItOutResponse ref, initTryItOut/toggleTryItOut/executeRequest 함수 추가"
    status: completed
  - id: t2
    content: "template: Authorize 패널 (api-list-section 헤더에 버튼 + 패널 추가)"
    status: completed
  - id: t3
    content: "template: api-details 상단에 Try it out 버튼 + 폼 + Execute + 응답 패널 추가"
    status: completed
  - id: t4
    content: "style: Authorize 패널, Try it out 폼, 응답 패널 스타일 추가"
    status: completed
isProject: false
---

# Try It Out + Authorize 구현 계획

## 변경 파일

- [`src/views/ProjectDetail.vue`](src/views/ProjectDetail.vue) — 전체 구현 (script + template + style)

## 아키텍처 흐름

```mermaid
flowchart TD
    A[api-item 헤더] -->|"Try it out 클릭"| B[tryItOutMap 토글]
    B --> C[파라미터 폼 렌더링]
    C --> D["path / query / header / body 입력"]
    D -->|Execute 클릭| E[executeRequest]
    E --> F["URL 조립 (servers URL + path params 치환 + query string)"]
    F --> G["헤더 조립 (Authorization + API Key + 커스텀 헤더)"]
    G --> H["axios 직접 호출"]
    H -->|성공/실패| I[tryItOutResponseMap 저장]
    I --> J[응답 패널 렌더링]

    K[Authorize 버튼 in 섹션 헤더] -->|클릭| L[showAuthorizePanel 토글]
    L --> M["Bearer Token 입력 + API Key 입력"]
    M --> N[authConfig ref 저장]
    N -->|Execute 시| G
```

## 1. Script — 추가할 상태 및 함수

### 상태 (ref)

```typescript
// Authorize 패널
const showAuthorizePanel = ref(false);
const authConfig = ref({
  bearerToken: "",
  apiKey: "",
  apiKeyHeader: "Authorization",
});

// Try it out 활성화 여부 (key: `${tagName}-${index}`)
const tryItOutMap = ref<Record<string, boolean>>({});

// 폼 입력값 (path/query/header params + body)
const tryItOutValues = ref<
  Record<
    string,
    {
      pathParams: Record<string, string>;
      queryParams: Record<string, string>;
      headerParams: Record<string, string>;
      body: string;
    }
  >
>({});

// 실행 결과
const tryItOutResponse = ref<
  Record<
    string,
    {
      status: number;
      statusText: string;
      headers: Record<string, string>;
      body: string;
      loading: boolean;
      error: string | null;
    }
  >
>({});
```

### 핵심 함수

- `getApiBaseUrl()` — `swaggerData.servers[0].url` 우선, 없으면 `project.swaggerUrl`에서 추출
- `initTryItOut(key, endpoint)` — 파라미터 기본값 초기화 (schema의 default/example 사용)
- `toggleTryItOut(key, endpoint)` — tryItOutMap 토글 + initTryItOut 호출
- `executeRequest(key, endpoint)` — URL 조립 → axios 호출 → 결과 저장
  - path params: `endpoint.path.replace(/{(\w+)}/g, ...)` 치환
  - body: `tryItOutValues[key].body` (JSON string)
  - 헤더: `authConfig.bearerToken` → `Authorization: Bearer ...`, `authConfig.apiKey`

### base URL 추출

`swaggerData`는 `apiEndpoints` computed 내부에서만 파싱됩니다. `swaggerBaseUrl`을 별도 computed로 분리해 expose합니다:

```typescript
const swaggerBaseUrl = computed(() => {
  const snap = snapshots.value[0];
  if (!snap) return "";
  try {
    const data = JSON.parse(snap.data);
    return (
      data.servers?.[0]?.url || extractBaseUrl(project.value?.swaggerUrl || "")
    );
  } catch {
    return "";
  }
});
```

## 2. Template 변경

### Authorize 패널 (`.api-list-section` 헤더 오른쪽)

```
[API 목록 헤더]  →  [🔒 Authorize 버튼] [▼ 토글]
[Authorize 패널 (v-if)]
  └─ Bearer Token 입력
  └─ API Key 입력 + API Key Header 입력
  └─ [적용] 버튼
```

### api-item 내부 (`.api-details` 상단)

```
[Try it out] 버튼 (토글)
  ↓ 활성화 시
[Parameters 폼]
  - path 파라미터: text input
  - query 파라미터: text input
  - header 파라미터: text input
[Request Body 폼] (POST/PUT/PATCH)
  - textarea (JSON 편집)
[Execute 버튼] [Cancel 버튼]
  ↓ 실행 후
[응답 패널]
  - Request URL 표시
  - Status code (색상)
  - Response Headers
  - Response Body (code-block + 복사 버튼)
```

## 3. Style 추가

- `.authorize-panel` — 헤더 하단 박스, border + padding
- `.try-it-out-btn` — 우상단 배지형 버튼 (outlined)
- `.try-it-out-form` — 파라미터 폼 영역
- `.param-input` — 인풋 스타일 (dark theme 맞춤)
- `.execute-btn` — 파란색 CTA 버튼
- `.try-it-out-response` — 응답 패널 (status badge + headers + body)
