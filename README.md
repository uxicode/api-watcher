# API Watcher

API 변경 사항 추적 시스템 - Swagger 문서의 변경을 자동으로 감지하고 비교합니다.

## 기능

- ✅ Swagger/OpenAPI 문서 등록 및 관리
- ✅ 자동 변경 사항 감지 및 비교
- ✅ Breaking Change 자동 감지
- ✅ 직관적인 Diff UI 제공
- ✅ 프로젝트별 히스토리 관리
- ✅ API Key 인증 지원

## 기술 스택

- Vue 3 (Composition API)
- TypeScript
- Pinia (상태 관리)
- Vue Router
- Vite
- SCSS Modules
- date-fns

## 시작하기

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

### 빌드

```bash
npm run build
```

### 미리보기

```bash
npm run preview
```

## 사용 방법

1. **프로젝트 추가**: 대시보드에서 "프로젝트 추가" 버튼을 클릭하여 Swagger URL을 등록합니다.
2. **수동 체크**: 프로젝트 카드에서 "지금 체크하기" 버튼을 클릭하여 즉시 변경 사항을 확인합니다.
3. **변경 내역 확인**: 프로젝트 상세 페이지에서 날짜별 변경 내역을 확인할 수 있습니다.
4. **Diff 상세 보기**: 변경된 엔드포인트를 클릭하여 상세한 변경 사항을 확인합니다.

## 프로젝트 구조

```
src/
├── components/     # 재사용 가능한 컴포넌트
├── views/         # 페이지 컴포넌트
├── stores/        # Pinia 스토어
├── services/      # 비즈니스 로직 서비스
├── types/         # TypeScript 타입 정의
├── router/        # Vue Router 설정
└── styles/        # 전역 스타일
```

## 데이터 저장

현재는 LocalStorage를 사용하여 데이터를 저장합니다. 프로덕션 환경에서는 백엔드 API와 연동하는 것을 권장합니다.

## 향후 계획

- [ ] 스케줄링 기능 (매일 자동 체크)
- [ ] Slack/Teams 웹훅 알림 연동
- [ ] 백엔드 API 연동
- [ ] 사용자 인증 및 권한 관리
- [ ] 더 정교한 Breaking Change 감지 로직

## 라이선스

MIT
