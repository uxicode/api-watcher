# 백엔드 서버 설정 가이드

## 현재 상태

❌ **PostgreSQL 데이터베이스가 실행되지 않아 500 에러 발생**

```
Error: Can't reach database server at `localhost:5432`
```

## 해결 방법

### 옵션 1: LocalStorage 사용 (추천 - 빠른 시작)

백엔드 없이 프론트엔드만 사용하려면:

1. 설정 모달(⚙️)에서 **"백엔드 서버 주소"를 비워두세요**
2. 저장 버튼 클릭
3. 데이터는 브라우저의 LocalStorage에 저장됩니다

**장점:**
- 즉시 사용 가능
- 설정 불필요
- 개발/테스트에 적합

**단점:**
- 브라우저 데이터 삭제 시 모든 데이터 손실
- 다른 기기에서 접근 불가

---

### 옵션 2: PostgreSQL + 백엔드 사용 (프로덕션)

#### 1단계: PostgreSQL 설치

**macOS (Homebrew):**
```bash
# PostgreSQL 설치
brew install postgresql@15

# 서비스 시작
brew services start postgresql@15

# 버전 확인
psql --version
```

**또는 Postgres.app 사용:**
- https://postgresapp.com/ 다운로드
- 앱 실행 → Initialize 클릭

#### 2단계: 데이터베이스 생성

```bash
# PostgreSQL 접속
psql postgres

# 데이터베이스 생성
CREATE DATABASE api_watcher;

# 사용자 생성 (선택사항)
CREATE USER api_watcher_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE api_watcher TO api_watcher_user;

# 종료
\q
```

#### 3단계: 환경변수 설정

`server/.env` 파일 확인 및 수정:

```env
# Database
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/api_watcher?schema=public"

# Server
PORT=3001
NODE_ENV=development

# CORS
CORS_ORIGIN="http://localhost:5173"
```

**예시 (기본 설정):**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/api_watcher?schema=public"
```

**예시 (커스텀 사용자):**
```env
DATABASE_URL="postgresql://api_watcher_user:your_password@localhost:5432/api_watcher?schema=public"
```

#### 4단계: Prisma 마이그레이션 실행

```bash
cd server

# Prisma Client 생성
npm run prisma:generate

# 마이그레이션 실행 (테이블 생성)
npm run prisma:migrate

# Prisma Studio로 확인 (선택사항)
npm run prisma:studio
```

#### 5단계: 서버 재시작

```bash
# 기존 서버 종료
pkill -f "tsx.*src/index.ts"

# 서버 시작
npm run dev
```

#### 6단계: 프론트엔드 설정

1. 설정 모달(⚙️) 열기
2. **"백엔드 서버 주소"**에 `http://localhost:3001` 입력
3. 저장 버튼 클릭

---

## 트러블슈팅

### PostgreSQL이 실행 중인지 확인

```bash
# 포트 5432 확인
lsof -ti:5432

# 또는 psql 접속 시도
psql -U postgres -d postgres
```

### 연결 테스트

```bash
# 데이터베이스 연결 확인
psql postgresql://postgres:postgres@localhost:5432/api_watcher

# API 엔드포인트 테스트
curl http://localhost:3001/health
curl http://localhost:3001/api/projects
```

### 자주 발생하는 에러

#### 1. "role 'postgres' does not exist"

```bash
# 현재 사용자로 superuser 생성
createuser -s postgres

# 또는 DATABASE_URL에서 사용자명을 현재 사용자로 변경
# DATABASE_URL="postgresql://$(whoami)@localhost:5432/api_watcher?schema=public"
```

#### 2. "database 'api_watcher' does not exist"

```bash
createdb api_watcher
```

#### 3. "Prisma Client not generated"

```bash
cd server
npm run prisma:generate
```

#### 4. "Migration failed"

```bash
cd server

# 기존 마이그레이션 삭제 (주의: 데이터 손실!)
rm -rf prisma/migrations

# 새로운 마이그레이션 생성
npm run prisma:migrate

# 또는 프로토타이핑 시
npx prisma db push
```

---

## 추천 워크플로우

### 개발/테스트 단계
→ **LocalStorage 사용** (백엔드 서버 주소 비우기)

### 프로덕션/팀 협업
→ **PostgreSQL + 백엔드** (위 가이드 따라 설정)

---

## 현재 서버 상태 확인

```bash
# 백엔드 서버 실행 여부
lsof -ti:3001

# PostgreSQL 실행 여부
lsof -ti:5432

# 서버 로그 확인
cd server
npm run dev
```
