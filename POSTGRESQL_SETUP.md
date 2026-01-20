# PostgreSQL 설정 가이드 (macOS)

## 현재 상태

✅ PostgreSQL@15 설치됨 (Homebrew)
❌ PATH 설정 안 됨 → `createdb`, `psql` 명령어 사용 불가
❌ 서비스 시작 안 됨

## 해결 방법

### 1단계: PATH 설정

PostgreSQL 명령어를 터미널 어디서든 사용할 수 있도록 PATH를 추가합니다.

**방법 1: 영구 설정 (추천)**

```bash
# .zshrc 파일에 추가
echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc

# 설정 적용
source ~/.zshrc

# 확인
psql --version
```

**방법 2: 임시 설정 (현재 터미널 세션만)**

```bash
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
psql --version
```

### 2단계: PostgreSQL 서비스 시작

**자동 시작 (추천 - 컴퓨터 재시작 시 자동 실행):**

```bash
brew services start postgresql@15
```

**수동 시작 (현재 세션만):**

```bash
pg_ctl -D /opt/homebrew/var/postgresql@15 start
```

**상태 확인:**

```bash
brew services list | grep postgresql
# 또는
pg_ctl -D /opt/homebrew/var/postgresql@15 status
```

### 3단계: 데이터베이스 생성

**이제 어느 위치에서든 실행 가능합니다!**

```bash
# 프로젝트 루트에서
cd /Users/jeonbongcheol/Desktop/proj/api-watcher
createdb api_watcher

# 또는 server 폴더에서
cd /Users/jeonbongcheol/Desktop/proj/api-watcher/server
createdb api_watcher

# 또는 홈 디렉토리에서도 가능
cd ~
createdb api_watcher
```

**확인:**

```bash
# 데이터베이스 목록 확인
psql -l | grep api_watcher

# 또는 직접 접속
psql api_watcher
# 접속 후 \q로 종료
```

### 4단계: 백엔드 서버 설정

```bash
cd /Users/jeonbongcheol/Desktop/proj/api-watcher/server

# .env 파일 확인 (이미 있으면 생략)
cat .env

# Prisma 클라이언트 생성
npm run prisma:generate

# 마이그레이션 실행 (테이블 생성)
npm run prisma:migrate

# 서버 재시작
pkill -f "tsx.*src/index.ts"
npm run dev
```

### 5단계: 프론트엔드 설정

1. 브라우저에서 `http://localhost:5173` 접속
2. 설정 모달(⚙️) 열기
3. **"백엔드 서버 주소"**에 `http://localhost:3001` 입력
4. 저장 버튼 클릭

---

## 빠른 실행 (한 번에)

```bash
# 1. PATH 설정 및 적용
echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 2. PostgreSQL 서비스 시작
brew services start postgresql@15

# 3. 데이터베이스 생성
createdb api_watcher

# 4. 백엔드 설정
cd /Users/jeonbongcheol/Desktop/proj/api-watcher/server
npm run prisma:generate
npm run prisma:migrate

# 5. 서버 재시작
pkill -f "tsx.*src/index.ts"
npm run dev
```

---

## 트러블슈팅

### "createdb: command not found" 에러

**원인:** PATH가 설정되지 않음

**해결:**
```bash
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
createdb api_watcher
```

### "could not connect to server" 에러

**원인:** PostgreSQL 서비스가 실행되지 않음

**해결:**
```bash
brew services start postgresql@15
# 1-2초 대기 후
createdb api_watcher
```

### 데이터베이스가 이미 있는지 확인

```bash
psql -l | grep api_watcher
```

출력 예시:
```
 api_watcher  | jeonbongcheol | UTF8     | C       | C       | 
```

### 데이터베이스 삭제 (다시 만들기)

```bash
dropdb api_watcher
createdb api_watcher
```

### PostgreSQL 서비스 중지

```bash
brew services stop postgresql@15
```

---

## 위치 무관하게 실행 가능한 이유

`createdb`, `psql` 등의 PostgreSQL 명령어는:
- **데이터베이스 서버에 연결**하는 클라이언트 도구입니다
- 현재 디렉토리와는 **무관**합니다
- PATH에만 추가되어 있으면 **어디서든** 실행 가능합니다

프로젝트 폴더 위치는:
- `npm` 명령어 (예: `npm run dev`, `npm run prisma:migrate`)를 실행할 때만 중요합니다
- 이 명령어들은 `package.json`이 있는 디렉토리에서 실행해야 합니다
