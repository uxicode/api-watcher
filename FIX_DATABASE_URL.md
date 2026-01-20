# DATABASE_URL 수정 가이드

## 🔴 문제

현재 에러:
```
User `user` was denied access on the database `api_watcher.public`
```

**원인:** `server/.env` 파일의 `DATABASE_URL`에 잘못된 사용자명이 설정되어 있습니다.

## ✅ 해결 방법

### 1단계: server/.env 파일 열기

```bash
cd /Users/jeonbongcheol/Desktop/proj/api-watcher/server
nano .env
# 또는
open -e .env
# 또는 Cursor에서 직접 열기
```

### 2단계: DATABASE_URL 수정

**❌ 현재 (잘못됨):**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/api_watcher?schema=public"
```

**✅ 올바른 설정:**
```env
DATABASE_URL="postgresql://jeonbongcheol@localhost:5432/api_watcher?schema=public"
```

또는 (비밀번호 없이):
```env
DATABASE_URL="postgresql://jeonbongcheol:@localhost:5432/api_watcher?schema=public"
```

### 3단계: 파일 저장

- nano 사용 시: `Ctrl + O` → `Enter` → `Ctrl + X`
- 에디터 사용 시: `Cmd + S`

### 4단계: 서버 재시작

**현재 실행 중인 서버 종료:**
```bash
# 터미널에서 Ctrl + C 누르기
# 또는
pkill -f "tsx.*src/index.ts"
```

**서버 재시작:**
```bash
cd /Users/jeonbongcheol/Desktop/proj/api-watcher/server
npm run dev
```

### 5단계: Prisma 마이그레이션 실행 (선택사항)

테이블이 아직 생성되지 않았다면:

```bash
cd /Users/jeonbongcheol/Desktop/proj/api-watcher/server

# Prisma 클라이언트 재생성
npm run prisma:generate

# 마이그레이션 실행
npm run prisma:migrate

# 또는 빠른 프로토타이핑
npx prisma db push
```

### 6단계: 확인

**API 테스트:**
```bash
curl http://localhost:3001/api/projects
```

**정상 응답:**
```json
[]
```
또는
```json
[{"id": "...", "name": "..."}]
```

**에러 응답:**
```json
{"error": {"message": "..."}}
```

---

## 🔍 .env 파일 전체 예시

```env
# Database
DATABASE_URL="postgresql://jeonbongcheol@localhost:5432/api_watcher?schema=public"

# Server
PORT=3001
NODE_ENV=development

# CORS
CORS_ORIGIN="http://localhost:5173"
```

---

## 💡 팁: 현재 사용자명 확인

```bash
whoami
# 출력: jeonbongcheol
```

이 사용자명을 DATABASE_URL에 사용하세요.

---

## 🔧 트러블슈팅

### "password authentication failed" 에러 발생 시

로컬 PostgreSQL에서는 보통 비밀번호가 필요 없습니다:

```env
# 비밀번호 없이
DATABASE_URL="postgresql://jeonbongcheol@localhost:5432/api_watcher?schema=public"

# 또는 빈 비밀번호
DATABASE_URL="postgresql://jeonbongcheol:@localhost:5432/api_watcher?schema=public"
```

### "database does not exist" 에러 발생 시

```bash
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
createdb api_watcher
```

### PostgreSQL 사용자 확인

```bash
psql -l
```

데이터베이스 목록에서 "소유주" 열을 확인하세요.

---

## 📝 빠른 수정 스크립트

자동으로 .env 파일을 생성하려면:

```bash
cd /Users/jeonbongcheol/Desktop/proj/api-watcher/server

cat > .env << 'EOF'
DATABASE_URL="postgresql://jeonbongcheol@localhost:5432/api_watcher?schema=public"
PORT=3001
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"
EOF

echo "✅ .env 파일 생성 완료"
cat .env
```
