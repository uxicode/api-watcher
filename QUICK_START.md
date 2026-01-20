# API Watcher 빠른 시작 가이드

## 🚀 가장 빠른 시작 방법 (PostgreSQL 설정 없이)

### 1단계: 프론트엔드만 실행

```bash
# 프로젝트 루트에서
npm install
npm run dev
```

### 2단계: 브라우저에서 열기

`http://localhost:5173` 접속

### 3단계: 설정

1. 우측 상단 ⚙️ (설정) 버튼 클릭
2. **"백엔드 서버 주소"를 비워두기** (기본값)
3. 저장 버튼 클릭

### 4단계: 프로젝트 추가

1. "+" 버튼으로 프로젝트 추가
2. **Swagger JSON URL** 입력 (예: `http://example.com/v3/api-docs`)
   - ⚠️ HTML 페이지 URL이 아닌 JSON 문서 URL 필요!
   - [SWAGGER_URL_GUIDE.md](./SWAGGER_URL_GUIDE.md) 참고

### 완료! 🎉

데이터는 브라우저의 LocalStorage에 저장됩니다.

---

## 📦 백엔드 사용하기 (선택사항)

백엔드를 사용하면:
- ✅ 데이터 영구 저장 (PostgreSQL)
- ✅ 다른 기기에서 접근 가능
- ✅ 팀 협업 가능

하지만 추가 설정이 필요합니다:

### 현재 상황

✅ **PostgreSQL@15 설치됨** (Homebrew)
❌ **PATH 설정 및 서비스 시작 필요**

### 설정 방법

**[POSTGRESQL_SETUP.md](./POSTGRESQL_SETUP.md)** - 상세한 PostgreSQL 설정 가이드

**빠른 설정:**

```bash
# 1. PATH 설정
echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 2. 서비스 시작
brew services start postgresql@15

# 3. 데이터베이스 생성 (어느 위치에서든 가능!)
createdb api_watcher

# 4. 백엔드 설정
cd /Users/jeonbongcheol/Desktop/proj/api-watcher/server
npm run prisma:generate
npm run prisma:migrate
```

또는 **[server/SETUP_GUIDE.md](./server/SETUP_GUIDE.md)** 파일을 참고하세요!

요약:
1. PostgreSQL 설치 (`brew install postgresql@15`)
2. 데이터베이스 생성 (`createdb api_watcher`)
3. 백엔드 설정 및 실행
4. 프론트엔드 설정에서 백엔드 주소 입력 (`http://localhost:3001`)

---

## 🔧 트러블슈팅

### "500 Internal Server Error" 발생

**원인:** PostgreSQL이 실행되지 않음

**해결:**
1. **LocalStorage 사용으로 전환** (백엔드 서버 주소 비우기)
2. 또는 **PostgreSQL 설치 및 실행** ([server/SETUP_GUIDE.md](./server/SETUP_GUIDE.md))

### Swagger URL이 HTML 페이지

**원인:** Swagger UI 페이지 URL을 입력함

**해결:** JSON 문서 URL로 변경
- Swagger UI: `http://example.com/swagger-ui/index.html` ❌
- JSON 문서: `http://example.com/v3/api-docs` ✅

[SWAGGER_URL_GUIDE.md](./SWAGGER_URL_GUIDE.md) 참고

---

## 📚 추가 문서

- [README.md](./README.md) - 전체 프로젝트 개요
- [SWAGGER_URL_GUIDE.md](./SWAGGER_URL_GUIDE.md) - Swagger JSON URL 찾기
- [server/SETUP_GUIDE.md](./server/SETUP_GUIDE.md) - 백엔드 설정 상세 가이드
- [server/README.md](./server/README.md) - 백엔드 API 문서
