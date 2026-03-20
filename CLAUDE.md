@AGENTS.md

# 프로젝트 개요
- 프로젝트명: TC Manager (테스트 케이스 관리 도구)
- 목적: QA 업무에서 테스트 케이스를 효율적으로 관리하고, URL 자동 테스트를 통해 QA 결과를 바탕화면에 저장
- 실행 경로: C:\Users\jungi\tc-manager

# 기술 스택
- Framework: Next.js 15 (App Router)
- Language: TypeScript
- Styling: Tailwind CSS v4
- UI Components: shadcn/ui
- ORM: Prisma
- DB: SQLite (dev.db)
- Data Fetching: TanStack Query
- 브라우저 자동화: Playwright (Chromium)

# 코딩 규칙
- 변수명은 영어로
- 주석은 한국어로
- 컴포넌트는 함수형으로 작성
- Server Component / Client Component 구분 철저히
- API 라우트는 /src/app/api/ 하위에 작성

# 폴더 구조
- /src/app - Next.js App Router 페이지
- /src/app/api - API 라우트 (projects, test-cases, run-test)
- /src/app/url-test - URL 자동 테스트 페이지
- /src/components/ui - shadcn/ui 컴포넌트
- /src/lib - 유틸리티, DB 연결 (prisma.ts)
- /prisma - DB 스키마 (Project, TestCase 모델)
- /scripts/run-test.js - Playwright 기반 URL 자동 테스트 스크립트
- /browsers - Playwright Chromium 브라우저 (로컬 설치)

# DB 모델
- Project: id, name, description, createdAt, updatedAt
- TestCase: id, title, description, precondition, steps(JSON), expected, status(PENDING/PASS/FAIL), priority(LOW/MEDIUM/HIGH), projectId

# URL 자동 테스트 기능
- /url-test 페이지에서 URL 입력 후 테스트 실행
- Playwright로 페이지 접속 → 자동 검사 → 바탕화면에 HTML 리포트 저장
- 검사 항목: HTTP 상태, 로드 시간, 콘솔 에러, 깨진 이미지, 링크 검사, 접근성, 동영상/오디오/캔버스/iframe 감지
- Playwright는 Next.js API 라우트에서 직접 실행 불가 → /scripts/run-test.js를 child_process.spawn으로 별도 실행
- PLAYWRIGHT_BROWSERS_PATH는 /browsers 폴더로 고정
