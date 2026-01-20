#!/bin/bash

# PostgreSQL 설정 스크립트

echo "🔧 PostgreSQL 설정 시작..."
echo ""

# 1. PATH 설정
echo "1️⃣ PATH 설정 중..."
if ! grep -q 'postgresql@15/bin' ~/.zshrc; then
    echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
    echo "✅ .zshrc에 PATH 추가 완료"
else
    echo "ℹ️  PATH가 이미 설정되어 있습니다"
fi

# 현재 세션에 PATH 적용
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
echo ""

# 2. PostgreSQL 버전 확인
echo "2️⃣ PostgreSQL 버전 확인..."
if command -v psql &> /dev/null; then
    psql --version
    echo "✅ PostgreSQL 명령어 사용 가능"
else
    echo "❌ PostgreSQL 명령어를 찾을 수 없습니다"
    echo "   터미널을 재시작하거나 'source ~/.zshrc'를 실행하세요"
fi
echo ""

# 3. PostgreSQL 서비스 시작
echo "3️⃣ PostgreSQL 서비스 시작 중..."
brew services start postgresql@15
echo "✅ PostgreSQL 서비스 시작 완료"
sleep 2
echo ""

# 4. 데이터베이스 생성
echo "4️⃣ api_watcher 데이터베이스 생성 중..."
if command -v createdb &> /dev/null; then
    if createdb api_watcher 2>/dev/null; then
        echo "✅ api_watcher 데이터베이스 생성 완료"
    else
        echo "ℹ️  데이터베이스가 이미 존재하거나 생성에 실패했습니다"
        echo "   확인: psql -l | grep api_watcher"
    fi
else
    echo "⚠️  createdb 명령어를 사용할 수 없습니다"
    echo "   터미널을 재시작하거나 다음 명령어를 실행하세요:"
    echo "   source ~/.zshrc"
    echo "   createdb api_watcher"
fi
echo ""

# 5. 확인
echo "5️⃣ 설정 확인..."
echo "데이터베이스 목록:"
if command -v psql &> /dev/null; then
    psql -l | grep api_watcher || echo "⚠️  api_watcher 데이터베이스를 찾을 수 없습니다"
fi
echo ""

echo "✅ PostgreSQL 설정 완료!"
echo ""
echo "📌 다음 단계:"
echo "1. 터미널 재시작 또는 'source ~/.zshrc' 실행"
echo "2. cd server"
echo "3. npm run prisma:generate"
echo "4. npm run prisma:migrate"
echo "5. npm run dev (서버 재시작)"
echo ""
echo "📚 자세한 내용: POSTGRESQL_SETUP.md"
