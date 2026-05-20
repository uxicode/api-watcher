# 🔒 Git 업로드 전 보안 체크리스트

## ✅ 확인해야 할 사항

### 1. 환경 변수 파일 (.env)
- [ ] `server/.env` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] `.env.example` 파일에는 **실제 값이 아닌 예시 값**만 있는지 확인
- [ ] 데이터베이스 URL에 실제 비밀번호가 없는지 확인

**확인 방법:**
```bash
# .env 파일이 Git에 추적되는지 확인
git status --ignored | grep .env

# .gitignore에 포함되어 있어야 함
cat .gitignore | grep .env
```

### 2. API 키 및 시크릿
- [ ] 코드 내에 하드코딩된 API 키가 없는지 확인
- [ ] `apiKey`, `secret`, `password` 등의 키워드 검색
- [ ] 설정 파일에 민감한 정보가 없는지 확인

**확인 방법:**
```bash
# 코드에서 API 키 패턴 검색
grep -r "apiKey.*=.*['\"]" src/ --include="*.ts" --include="*.vue"
grep -r "password.*=.*['\"]" src/ --include="*.ts" --include="*.vue"
grep -r "secret.*=.*['\"]" src/ --include="*.ts" --include="*.vue"
```

### 3. 데이터베이스 정보
- [ ] 실제 데이터베이스 URL이 노출되지 않는지 확인
- [ ] 데이터베이스 파일 (*.db, *.sqlite) 제외되었는지 확인
- [ ] 마이그레이션 파일에 민감한 정보가 없는지 확인

### 4. 로그 파일
- [ ] `*.log` 파일이 제외되어 있는지 확인
- [ ] `server/server.log`, `server/nohup.out` 제외 확인
- [ ] 로그에 민감한 정보 (API 키, 비밀번호)가 없는지 확인

### 5. 백업 및 임시 파일
- [ ] `*.backup`, `*.bak`, `*.tmp` 파일 제외 확인
- [ ] IDE 임시 파일 제외 확인

### 6. node_modules
- [ ] `node_modules` 디렉토리 제외 확인
- [ ] `package-lock.json`은 포함 (보안상 중요)

---

## 🔍 자동 검사 스크립트

### Git에 올라갈 파일 미리보기
```bash
git status
git diff --cached  # staged 파일 내용 확인
```

### 민감한 정보 검색
```bash
# 프로젝트 전체에서 민감한 패턴 검색
cd /Users/jeonbongcheol/Desktop/proj/api-watcher

# API 키, 비밀번호 패턴 검색
echo "=== API 키 검색 ==="
grep -r "apiKey.*=.*['\"][^'\"]*['\"]" . --include="*.ts" --include="*.vue" --include="*.js" --exclude-dir=node_modules --exclude-dir=dist

echo "=== 비밀번호 검색 ==="
grep -r "password.*=.*['\"][^'\"]*['\"]" . --include="*.ts" --include="*.vue" --include="*.js" --exclude-dir=node_modules --exclude-dir=dist

echo "=== 데이터베이스 URL 검색 ==="
grep -r "DATABASE_URL.*=.*postgresql://" . --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=dist
```

---

## 📋 현재 프로젝트의 .gitignore 항목

### ✅ 포함되어 있음:
- ✅ `server/.env` - 백엔드 환경 변수
- ✅ `*.log` - 로그 파일
- ✅ `node_modules` - 의존성
- ✅ `dist` - 빌드 결과물
- ✅ `.DS_Store` - macOS 파일
- ✅ `coverage` - 테스트 커버리지

### ⚠️ 추가 확인 필요:
- ✅ `.env`, `.env.local` - 루트 환경 변수
- ✅ `*.db`, `*.sqlite` - 데이터베이스 파일
- ✅ `*.pem`, `*.key`, `*.cert` - 인증서 파일
- ✅ `nohup.out`, `server.log` - 서버 로그

---

## 🚨 절대 올리면 안 되는 파일들

### 🔴 매우 위험 (즉시 삭제 필요)
- `server/.env` - 실제 데이터베이스 비밀번호, API 키
- `*.pem`, `*.key` - SSL 인증서, 개인 키
- `secrets.json`, `credentials.json` - 인증 정보

### 🟡 주의 필요
- `server/server.log` - 로그에 민감한 정보가 있을 수 있음
- `.vscode/settings.json` - 로컬 경로나 설정이 포함될 수 있음

---

## 🔧 이미 올라간 민감한 파일 제거하기

### 1. Git 히스토리에서 완전히 제거
```bash
# .env 파일이 이미 커밋된 경우
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch server/.env" \
  --prune-empty --tag-name-filter cat -- --all

# 또는 git-filter-repo 사용 (더 빠름)
git filter-repo --invert-paths --path server/.env
```

### 2. 강제 푸시 (주의!)
```bash
git push origin --force --all
```

### 3. 비밀번호 변경
- 노출된 데이터베이스 비밀번호는 **즉시 변경**
- 노출된 API 키는 **즉시 재발급**

---

## ✅ 안전하게 Git에 올리기

### 1단계: .gitignore 확인
```bash
cat .gitignore | grep -E "\.env|\.log|node_modules"
```

### 2단계: staged 파일 확인
```bash
git status
git diff --cached
```

### 3단계: 민감한 파일이 없는지 확인
```bash
git ls-files | grep -E "\.env$|\.pem$|\.key$|secrets|credentials"
```

**결과가 비어있어야 함!**

### 4단계: 커밋 전 마지막 확인
```bash
# Git에 추가될 파일 목록
git add -A
git status

# 의심스러운 파일이 있다면 제거
git reset HEAD <파일명>
```

### 5단계: 안전하게 커밋 & 푸시
```bash
git commit -m "Initial commit - API Watcher project"
git push origin main
```

---

## 📚 참고: .env.example 작성 예시

**❌ 나쁜 예 (.env):**
```env
DATABASE_URL="postgresql://jeonbongcheol:myRealPassword123@localhost:5432/api_watcher"
API_KEY="sk-real-api-key-1234567890abcdef"
```

**✅ 좋은 예 (.env.example):**
```env
# Database
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/DATABASE_NAME?schema=public"

# Server
PORT=3001
NODE_ENV=development

# API Key (optional)
API_KEY="your-api-key-here"
```

---

## 🎯 체크리스트 요약

커밋 전에 다음을 확인하세요:

- [ ] `.gitignore`에 `.env` 파일들 포함
- [ ] 코드에 하드코딩된 비밀번호 없음
- [ ] `git status`로 민감한 파일 확인
- [ ] `.env.example`에는 예시 값만 있음
- [ ] 로그 파일 제외됨
- [ ] 데이터베이스 파일 제외됨
- [ ] `node_modules` 제외됨

**모두 ✅ 체크되었다면 안전하게 Git에 올릴 수 있습니다!** 🎉
