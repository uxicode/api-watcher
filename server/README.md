# API Watcher Backend

Express + Prisma + PostgreSQL 백엔드 서버

## ⚠️ 중요: 시작하기 전에

**500 에러가 발생하나요?**

→ **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** 파일을 먼저 확인하세요!

PostgreSQL이 설치되지 않았거나 실행되지 않으면 서버가 작동하지 않습니다.

**빠른 테스트를 원하신다면:**
- 프론트엔드 설정에서 **"백엔드 서버 주소"를 비워두고** LocalStorage만 사용하세요.

---

## 기술 스택

- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- Zod (유효성 검사)

## 시작하기

### 전제 조건

⚠️ **PostgreSQL이 설치되어 실행 중이어야 합니다!**

PostgreSQL이 없다면 [SETUP_GUIDE.md](./SETUP_GUIDE.md)를 참고하여 설치하세요.

### 1. PostgreSQL 확인

```bash
# PostgreSQL이 실행 중인지 확인
lsof -ti:5432

# 또는
psql --version
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/api_watcher?schema=public"
PORT=3001
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"
```

**기본 설정 예시:**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/api_watcher?schema=public"
PORT=3001
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"
```

### 3. 의존성 설치

```bash
npm install
```

### 4. 데이터베이스 생성

```bash
# PostgreSQL 접속
psql postgres

# 데이터베이스 생성
CREATE DATABASE api_watcher;

# 종료
\q
```

### 5. Prisma 설정

```bash
# Prisma 클라이언트 생성
npm run prisma:generate

# 마이그레이션 실행 (테이블 생성)
npm run prisma:migrate

# (선택) Prisma Studio 실행
npm run prisma:studio
```

### 4. 개발 서버 실행

```bash
npm run dev
```

서버는 `http://localhost:3001`에서 실행됩니다.

## API 엔드포인트

### 프로젝트

- `GET /api/projects` - 프로젝트 목록 조회
- `GET /api/projects/:id` - 프로젝트 상세 조회
- `POST /api/projects` - 프로젝트 생성
- `PUT /api/projects/:id` - 프로젝트 업데이트
- `DELETE /api/projects/:id` - 프로젝트 삭제
- `POST /api/projects/:id/collect` - Swagger 수집 및 스냅샷 생성

### 스냅샷

- `GET /api/snapshots/project/:projectId` - 프로젝트별 스냅샷 목록
- `GET /api/snapshots/:id` - 스냅샷 상세 조회

### Diff

- `GET /api/diffs/project/:projectId` - 프로젝트별 Diff 목록
- `GET /api/diffs/:id` - Diff 상세 조회

## 데이터베이스 스키마

### Project
- `id` (UUID)
- `name` (String)
- `swaggerUrl` (String)
- `apiKey` (String, optional)
- `apiKeyHeader` (String, optional)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `lastCheckedAt` (DateTime, optional)
- `isActive` (Boolean)

### Snapshot
- `id` (UUID)
- `projectId` (UUID, FK)
- `createdAt` (DateTime)
- `data` (String, 압축된 JSON)
- `version` (String)

### DiffResult
- `id` (UUID)
- `projectId` (UUID, FK)
- `previousSnapshotId` (UUID, FK)
- `currentSnapshotId` (UUID, FK)
- `comparedAt` (DateTime)
- `endpointDiffs` (JSON)
- `summary` (JSON)

## 프로젝트 구조

```
server/
├── src/
│   ├── controllers/    # 컨트롤러
│   ├── routes/         # 라우터
│   ├── services/       # 비즈니스 로직
│   ├── middleware/     # 미들웨어
│   ├── types/          # TypeScript 타입
│   └── prisma/         # Prisma 클라이언트
├── prisma/
│   └── schema.prisma   # Prisma 스키마
└── package.json
```
