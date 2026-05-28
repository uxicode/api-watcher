# API Watcher

Swagger/OpenAPI 문서의 변경 사항을 자동으로 감지하고 비교하는 API 모니터링 도구입니다.

## 기능

- Swagger/OpenAPI 문서 등록 및 관리
- API 변경 사항 자동 감지 및 비교
- Breaking Change 자동 감지
- 직관적인 Diff UI 제공
- 프로젝트별 스냅샷 히스토리 관리
- API Key 인증 지원
- Try it out (API 직접 실행) 기능
- 소셜 로그인 (GitHub, Google)

## 기술 스택

### 프론트엔드
- Vue 3 (Composition API, `<script setup>`)
- TypeScript
- Pinia (상태 관리)
- Vue Router
- Vite
- SCSS Modules

### 백엔드 (Serverless)
- Supabase Auth (인증)
- Supabase Database (PostgreSQL)
- Supabase Edge Functions (Deno)

## 아키텍처

```
브라우저 (Vue)
    │
    ├── 인증 (로그인/회원가입/OAuth)
    │       └── Supabase Auth
    │
    ├── DB 쿼리 (projects, snapshots, diffs CRUD)
    │       └── Supabase Database (RLS 적용)
    │
    ├── Swagger 수집 + diff 계산
    │       └── Edge Function: collect-swagger
    │
    └── Try it out CORS 프록시
            └── Edge Function: proxy
```

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. Supabase 프로젝트 설정

[supabase.com](https://supabase.com)에서 프로젝트를 생성한 후:

1. **DB 스키마 적용** — Supabase 대시보드 → SQL Editor에서 `supabase/schema.sql` 실행

2. **소셜 로그인 설정** (선택) — Authentication → Providers에서 GitHub, Google 활성화

### 3. 환경변수 설정

루트에 `.env` 파일 생성:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxx
```

두 값 모두 Supabase 대시보드 → **Settings → API Keys** 에서 확인할 수 있습니다.

### 4. Edge Function 배포

```bash
# Supabase CLI 설치
brew install supabase/tap/supabase

# 로그인 및 프로젝트 연결
supabase login
supabase link --project-ref [project-ref]

# Edge Function 시크릿 등록
# 대시보드 → Edge Functions → Manage secrets → Add secret
# Name: SERVICE_ROLE_KEY / Value: sb_secret_xxxx (Settings → API Keys → Secret keys)

# 배포
supabase functions deploy proxy
supabase functions deploy collect-swagger
```

### 5. 개발 서버 실행

```bash
npm run dev
```

## 프로젝트 구조

```
api-watcher/
├── src/
│   ├── components/         # 재사용 컴포넌트
│   ├── views/              # 페이지 컴포넌트
│   ├── stores/             # Pinia 스토어 (Supabase 직접 쿼리)
│   ├── services/           # 서비스 레이어
│   ├── lib/
│   │   └── supabase.ts     # Supabase 클라이언트 초기화
│   ├── types/              # TypeScript 타입 정의
│   ├── router/             # Vue Router 설정
│   └── styles/             # 전역 스타일
└── supabase/
    ├── schema.sql           # DB 스키마 + RLS 정책
    └── functions/
        ├── proxy/           # CORS 프록시 Edge Function
        └── collect-swagger/ # Swagger 수집 + diff Edge Function
```

## 사용 방법

1. **회원가입 / 로그인** — 이메일 또는 소셜 로그인(GitHub, Google)
2. **프로젝트 추가** — Swagger URL 등록
3. **지금 체크하기** — Swagger 문서를 수집하고 이전과 비교
4. **변경 내역 확인** — 프로젝트 상세 페이지에서 날짜별 diff 확인
5. **Try it out** — API 문서 뷰어에서 직접 API 호출 테스트

## 빌드 및 배포

```bash
# 프로덕션 빌드
npm run build

# Edge Function 배포
npm run functions:deploy
```

## 테스트

```bash
npm test
npm run test:ui
npm run test:coverage
```

## 향후 계획

- [ ] 스케줄링 기능 (자동 주기 체크)
- [ ] Slack / Teams 웹훅 알림 연동
- [ ] 팀 단위 프로젝트 공유

## 라이선스

MIT
