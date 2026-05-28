# .env 환경변수 등록(수파베이스 대시보드에 각 프로젝트에 들어가면 있음)
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxx
```

# Supabase CLI는 Edge Function을 배포할 때 필요한 커맨드라인 도구입니다. macOS 기준으로 설명합니다.

## 1. Supabase CLI 설치
`brew install supabase/tap/supabase`
설치 확인:
`supabase --version`
## 2. 로그인
`supabase login`
브라우저가 열리면서 Supabase 계정으로 로그인합니다.

## 3. 프로젝트 연결
`cd /Users/jeonbongcheol/Desktop/proj/api-watcher`
`supabase link --project-ref [project-ref]`
[project-ref]는 Supabase 대시보드 URL에서 확인할 수 있습니다.

`https://supabase.com/dashboard/project/abcdefghijkl → abcdefghijkl`
## 4. Edge Functions → Manage secrets 에 등록
Supabase 사이트의 대시보드 (.env 파일이 아니라 )
Supabase 대시보드
  └── Edge Functions (왼쪽 메뉴)
        └── Manage secrets 버튼
              └── Add secret
                    Name:  SUPABASE_SERVICE_ROLE_KEY
                    Value: sb_secret_xxxx  ← 여기에 붙여넣기

## 5. Edge Function 배포
```
supabase functions deploy proxy
supabase functions deploy collect-swagger
```
## 6. 로컬에서 테스트 (선택사항)
배포 전에 로컬에서 실행해볼 수도 있습니다:

supabase functions serve
그러면 http://localhost:54321/functions/v1/proxy 로 테스트 가능합니다.

배포 후 확인
Supabase 대시보드 → Edge Functions 메뉴에서 배포된 함수 목록과 로그를 확인할 수 있습니다.