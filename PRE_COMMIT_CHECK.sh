#!/bin/bash

# 🔒 Git 커밋 전 보안 체크 스크립트

echo "🔍 Git 커밋 전 보안 검사 시작..."
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERROR_COUNT=0

# 1. .env 파일 체크
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  .env 파일이 Git에 추적되는지 확인..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ENV_FILES=$(git ls-files | grep -E "\.env$" || true)
if [ -n "$ENV_FILES" ]; then
    echo -e "${RED}❌ 오류: .env 파일이 Git에 추적되고 있습니다!${NC}"
    echo "$ENV_FILES"
    ((ERROR_COUNT++))
else
    echo -e "${GREEN}✅ .env 파일이 Git에 추적되지 않음${NC}"
fi
echo ""

# 2. 로그 파일 체크
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  로그 파일이 Git에 추적되는지 확인..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

LOG_FILES=$(git ls-files | grep -E "\.log$" || true)
if [ -n "$LOG_FILES" ]; then
    echo -e "${YELLOW}⚠️  경고: 로그 파일이 Git에 추적되고 있습니다${NC}"
    echo "$LOG_FILES"
    ((ERROR_COUNT++))
else
    echo -e "${GREEN}✅ 로그 파일이 Git에 추적되지 않음${NC}"
fi
echo ""

# 3. 인증서 파일 체크
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  인증서/키 파일이 Git에 추적되는지 확인..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CERT_FILES=$(git ls-files | grep -E "\.(pem|key|cert|p12)$" || true)
if [ -n "$CERT_FILES" ]; then
    echo -e "${RED}❌ 오류: 인증서/키 파일이 Git에 추적되고 있습니다!${NC}"
    echo "$CERT_FILES"
    ((ERROR_COUNT++))
else
    echo -e "${GREEN}✅ 인증서/키 파일이 Git에 추적되지 않음${NC}"
fi
echo ""

# 4. 하드코딩된 API 키 검색
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  코드에 하드코딩된 API 키/비밀번호 검색..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# API 키 패턴 검색 (간단한 패턴만)
HARDCODED_SECRETS=$(grep -r "apiKey.*=.*['\"][a-zA-Z0-9]{20,}['\"]" src server/src 2>/dev/null | grep -v "your-api-key" | grep -v "example" || true)

if [ -n "$HARDCODED_SECRETS" ]; then
    echo -e "${YELLOW}⚠️  경고: 의심스러운 API 키 패턴 발견${NC}"
    echo "$HARDCODED_SECRETS" | head -5
    echo ""
    echo -e "${YELLOW}수동으로 확인이 필요합니다.${NC}"
else
    echo -e "${GREEN}✅ 명백한 하드코딩된 API 키 없음${NC}"
fi
echo ""

# 5. DATABASE_URL 하드코딩 체크
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  DATABASE_URL 하드코딩 확인..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DB_URLS=$(grep -r "DATABASE_URL.*=.*postgresql://[^@]*:[^@]*@" server/src 2>/dev/null | grep -v "env(" | grep -v "process.env" | grep -v "USERNAME:PASSWORD" || true)

if [ -n "$DB_URLS" ]; then
    echo -e "${RED}❌ 오류: 실제 데이터베이스 URL이 하드코딩되어 있습니다!${NC}"
    echo "$DB_URLS"
    ((ERROR_COUNT++))
else
    echo -e "${GREEN}✅ DATABASE_URL 하드코딩 없음${NC}"
fi
echo ""

# 6. coverage 디렉토리 체크
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  coverage 디렉토리 확인..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

COVERAGE_FILES=$(git ls-files | grep "^coverage/" || true)
if [ -n "$COVERAGE_FILES" ]; then
    echo -e "${YELLOW}⚠️  경고: coverage 파일이 Git에 추적되고 있습니다${NC}"
    echo "파일 수: $(echo "$COVERAGE_FILES" | wc -l)"
    ((ERROR_COUNT++))
else
    echo -e "${GREEN}✅ coverage 디렉토리가 Git에 추적되지 않음${NC}"
fi
echo ""

# 7. node_modules 체크
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  node_modules 확인..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

NODE_MODULES=$(git ls-files | grep "node_modules/" | head -5 || true)
if [ -n "$NODE_MODULES" ]; then
    echo -e "${RED}❌ 오류: node_modules가 Git에 추적되고 있습니다!${NC}"
    echo "$NODE_MODULES"
    echo "..."
    ((ERROR_COUNT++))
else
    echo -e "${GREEN}✅ node_modules가 Git에 추적되지 않음${NC}"
fi
echo ""

# 최종 결과
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 검사 결과"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ 모든 보안 검사 통과!${NC}"
    echo -e "${GREEN}안전하게 Git에 커밋할 수 있습니다.${NC}"
    exit 0
else
    echo -e "${RED}❌ $ERROR_COUNT 개의 문제 발견${NC}"
    echo -e "${RED}문제를 해결한 후 다시 시도하세요.${NC}"
    echo ""
    echo "💡 도움말:"
    echo "  - .env 파일 제거: git rm --cached server/.env"
    echo "  - 로그 파일 제거: git rm --cached '*.log'"
    echo "  - coverage 제거: git rm -r --cached coverage"
    echo "  - .gitignore 확인: cat .gitignore"
    exit 1
fi
