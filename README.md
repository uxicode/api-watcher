# API Watcher

API 변경 사항 추적 시스템 - Swagger 문서의 변경을 자동으로 감지하고 비교합니다.

## 🚀 빠른 시작

PostgreSQL 설정 없이 바로 시작하려면:
- **[QUICK_START.md](./QUICK_START.md)** - 5분 안에 시작하기
- 데이터는 브라우저의 LocalStorage에 저장됩니다

백엔드(PostgreSQL) 사용 시:
- **[server/SETUP_GUIDE.md](./server/SETUP_GUIDE.md)** - 상세 설정 가이드

## 기능

- ✅ Swagger/OpenAPI 문서 등록 및 관리
- ✅ 자동 변경 사항 감지 및 비교
- ✅ Breaking Change 자동 감지
- ✅ 직관적인 Diff UI 제공
- ✅ 프로젝트별 히스토리 관리
- ✅ API Key 인증 지원

## 기술 스택

### 프론트엔드
- Vue 3 (Composition API)
- TypeScript
- Pinia (상태 관리)
- Vue Router
- Vite
- SCSS Modules
- date-fns
- Vitest (테스트 프레임워크)
- @vue/test-utils (Vue 컴포넌트 테스트)

### 백엔드
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- Zod (유효성 검사)

## 시작하기

### 프론트엔드

#### 설치

```bash
npm install
```

#### 개발 서버 실행

```bash
npm run dev
```

### 백엔드

⚠️ **중요:** PostgreSQL이 설치되어 실행 중이어야 합니다!

**빠른 시작 (LocalStorage만 사용):**
- 프론트엔드 설정(⚙️)에서 "백엔드 서버 주소"를 **비워두세요**
- PostgreSQL 설정 불필요
- [QUICK_START.md](./QUICK_START.md) 참고

**백엔드 사용 시:**

```bash
cd server

# PostgreSQL 설치 확인
lsof -ti:5432  # PostgreSQL이 실행 중이어야 함

npm install

# .env 파일 생성 및 설정
cp .env.example .env
# DATABASE_URL을 PostgreSQL 연결 정보로 수정

# 데이터베이스 생성
createdb api_watcher

# Prisma 설정
npm run prisma:generate
npm run prisma:migrate

# 개발 서버 실행
npm run dev
```

**500 에러 발생 시:**
- [server/SETUP_GUIDE.md](./server/SETUP_GUIDE.md) - 상세한 설정 가이드
- [server/README.md](./server/README.md) - API 문서

### 프론트엔드와 백엔드 연동

1. **백엔드 서버 실행**
   ```bash
   cd server
   npm run dev
   ```
   서버는 기본적으로 `http://localhost:3001`에서 실행됩니다.

2. **프론트엔드에서 API 설정**
   - 프론트엔드 앱을 실행한 후, 우측 상단의 설정 아이콘을 클릭합니다.
   - "API 기본 주소"에 `http://localhost:3001`을 입력합니다.
   - (선택) API Key가 필요한 경우 설정합니다.
   - 저장을 클릭하면 자동으로 백엔드와 연동됩니다.

3. **LocalStorage 모드 (기본값)**
   - API 기본 주소를 비워두면 LocalStorage를 사용합니다.
   - 개발 모드에서는 자동으로 목 데이터가 로드됩니다.

4. **백엔드 모드**
   - API 기본 주소를 설정하면 모든 데이터가 백엔드 PostgreSQL에 저장됩니다.
   - 프로젝트, 스냅샷, diff 결과가 서버에 저장됩니다.

### 빌드

```bash
npm run build
```

### 미리보기

```bash
npm run preview
```

### 테스트 실행

```bash
# 모든 테스트 실행
npm test

# 테스트 UI 모드로 실행
npm run test:ui

# 커버리지 포함 테스트 실행
npm run test:coverage
```

## 사용 방법

1. **프로젝트 추가**: 대시보드에서 "프로젝트 추가" 버튼을 클릭하여 Swagger URL을 등록합니다.
2. **수동 체크**: 프로젝트 카드에서 "지금 체크하기" 버튼을 클릭하여 즉시 변경 사항을 확인합니다.
3. **변경 내역 확인**: 프로젝트 상세 페이지에서 날짜별 변경 내역을 확인할 수 있습니다.
4. **Diff 상세 보기**: 변경된 엔드포인트를 클릭하여 상세한 변경 사항을 확인합니다.

## 프로젝트 구조

```
api-watcher/
├── src/                    # 프론트엔드 소스 코드
│   ├── components/         # 재사용 가능한 컴포넌트
│   ├── views/             # 페이지 컴포넌트
│   ├── stores/            # Pinia 스토어
│   │   └── __tests__/     # 스토어 테스트
│   ├── services/          # 비즈니스 로직 서비스
│   │   └── __tests__/     # 서비스 테스트
│   ├── utils/             # 유틸리티 함수
│   │   └── __tests__/     # 유틸리티 테스트
│   ├── types/             # TypeScript 타입 정의
│   ├── router/            # Vue Router 설정
│   ├── styles/            # 전역 스타일
│   └── test/              # 테스트 설정 파일
└── server/                 # 백엔드 소스 코드
    ├── src/
    │   ├── controllers/    # 컨트롤러
    │   ├── routes/         # 라우터
    │   ├── services/       # 비즈니스 로직 서비스
    │   ├── middleware/     # 미들웨어
    │   ├── types/          # TypeScript 타입
    │   └── prisma/         # Prisma 클라이언트
    └── prisma/
        └── schema.prisma   # Prisma 스키마
```



```
┌─────────────────────────────────────────┐
│  프론트엔드 (Vue 앱)                       │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │ 설정: 백엔드 서버 주소                │   │
│  │ http://localhost:3001            │   │
│  └───────────┬──────────────────────┘   │
│              │                          │
│              ▼                          │
│  ┌──────────────────────────────────┐   │
│  │ 백엔드 서버 (Express + PostgreSQL)  │   │
│  │ - 프로젝트 데이터 저장                │   │
│  │ - 스냅샷 저장                       │   │
│  │ - Diff 결과 저장                   │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  프로젝트 1:                              │
│  Swagger URL:                           │
│  https://api.example.com/swagger.json   │
│              │                          │
│              ▼                          │
│  ┌──────────────────────────────────┐   │
│  │ 모니터링 대상 API                    │   │
│  │ (외부 서비스)                       │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```



## 테스트

프로젝트는 Vitest를 사용하여 단위 테스트를 작성하고 있습니다.

### 테스트 커버리지

현재 다음 영역에 대한 테스트가 작성되어 있습니다:

- ✅ **서비스 레이어 테스트**
  - `swagger-service.test.ts`: Swagger 문서 가져오기, 검증, 압축/압축 해제
  - `diff-service.test.ts`: Swagger 문서 비교 및 diff 생성

- ✅ **스토어 테스트**
  - `project-store.test.ts`: 프로젝트 CRUD, Swagger 수집, 스냅샷 관리

- ✅ **유틸리티 테스트**
  - `schema-to-typescript.test.ts`: JSON Schema를 TypeScript 타입으로 변환

### 테스트 실행 결과

```bash
✓ src/utils/__tests__/schema-to-typescript.test.ts  (10 tests)
✓ src/services/__tests__/diff-service.test.ts  (6 tests)
✓ src/services/__tests__/swagger-service.test.ts  (6 tests)
✓ src/stores/__tests__/project-store.test.ts  (7 tests)

Test Files  4 passed (4)
Tests  29 passed (29)
```

### 테스트 작성 가이드

- **단위 테스트**: 각 함수/메서드의 독립적인 동작을 검증
- **모킹**: 외부 의존성(axios, localStorage 등)은 모킹하여 테스트 격리
- **테스트 조직화**: 테스트 파일은 `__tests__` 디렉토리에 배치
- **설정 파일**: `vitest.config.ts`와 `src/test/setup.ts`에서 테스트 환경 설정

## 데이터 저장

### 로컬 개발 모드
- LocalStorage를 사용하여 데이터를 저장합니다.
- 개발 모드에서는 자동으로 목 데이터가 로드됩니다.

### 프로덕션 모드
- PostgreSQL 데이터베이스를 사용합니다.
- 백엔드 API (`http://localhost:3001`)와 연동합니다.
- 프론트엔드 설정에서 API Base URL을 설정하세요.

## 향후 계획

- [x] 백엔드 API 연동 (Express + Prisma + PostgreSQL)
- [ ] 스케줄링 기능 (매일 자동 체크)
- [ ] Slack/Teams 웹훅 알림 연동
- [ ] 사용자 인증 및 권한 관리
<!-- [ ] 더 정교한 Breaking Change 감지 로직 -->
<!-- [ ] API 문서 자동 생성 -->

## 라이선스

MIT
