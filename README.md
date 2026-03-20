# 🧪 테스트 케이스 관리 도구 (tc-manager)

QA 업무에서 테스트 케이스를 효율적으로 관리하고, URL 자동 테스트를 실행할 수 있는 도구입니다.

---

## 주요 기능

- ✅ **테스트 케이스 관리** - 작성 / 수정 / 삭제 / 상태 관리 (통과 / 실패 / 보류)
- 🌐 **URL 자동 테스트** - URL 입력 후 버튼 클릭 한 번으로 자동 QA 실행
- 📊 **테스트 결과 리포트** - 바탕화면에 HTML 리포트 자동 저장
- 🎬 **미디어 요소 테스트** - 동영상, 게임 캔버스 존재 여부 확인

---

## 자동 테스트 항목

| 항목 | 설명 |
|------|------|
| 페이지 로드 시간 | 페이지가 로드되는 데 걸린 시간 |
| 콘솔 에러 | 브라우저 콘솔에서 발생한 에러 목록 |
| 깨진 링크 | 응답이 없거나 오류가 발생한 링크 목록 |
| 스크린샷 | 페이지 전체 화면 캡처 |
| 이미지 누락 | 로드되지 않은 이미지 목록 |
| 동영상 요소 | video 태그 존재 및 재생 가능 여부 |
| 게임/캔버스 | canvas 요소 렌더링 여부 |

---

## 시작하기

### 사전 요구사항

- [Node.js](https://nodejs.org) 18 버전 이상
- [Git](https://git-scm.com)

### 설치 및 실행

```powershell
# 1. 저장소 클론
git clone https://github.com/1hanjung/tc-manager.git
cd tc-manager

# 2. 패키지 설치
npm install

# 3. Playwright 브라우저 설치 (URL 자동 테스트에 필요)
npx playwright install chromium

# 4. DB 초기화
npx prisma migrate deploy

# 5. 개발 서버 실행
npm run dev
```

### 접속

브라우저에서 아래 주소로 접속하세요:

```
http://localhost:3000
```

**URL 자동 테스트 바로가기:**
```
http://localhost:3000/url-test
```

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui |
| ORM | Prisma |
| DB | SQLite |
| 자동 테스트 | Playwright |
| 데이터 패칭 | TanStack Query |

---

## 폴더 구조

```
tc-manager/
├── src/
│   ├── app/
│   │   ├── api/          # API 라우트
│   │   ├── url-test/     # URL 자동 테스트 페이지
│   │   └── page.tsx      # 메인 페이지
│   ├── components/       # 공통 UI 컴포넌트
│   └── lib/              # 유틸리티, DB 연결
├── prisma/               # DB 스키마
└── README.md
```

---

## 테스트 결과 위치

URL 자동 테스트 실행 후 결과 리포트는 **바탕화면**에 HTML 파일로 저장됩니다.

```
C:\Users\{사용자명}\Desktop\qa-report-{날짜시간}.html
```

---

## 왜 링크로 바로 공유가 안 되나요?

일반적인 웹앱은 서버에서 데이터만 처리하면 되기 때문에 Vercel 같은 클라우드에 올려서 링크로 공유할 수 있어요.

하지만 이 앱은 **URL 자동 테스트** 기능에서 **실제 Chrome 브라우저를 서버에서 직접 실행**해야 합니다.

```
일반 웹앱:  사용자 → 서버 → 응답  ✅ 클라우드 가능
이 앱:      사용자 → 서버 → Chrome 브라우저 실행 → QA 테스트  ❌ 클라우드 불가
```

Vercel, Netlify 같은 서비스는 **서버리스(Serverless)** 환경이라 Chrome 같은 프로그램을 설치하거나 실행할 수 없어요.

### 링크로 공유하고 싶다면?

| 방법 | 설명 | 비용 |
|------|------|------|
| **Railway** | Chrome 실행 가능한 서버 환경, GitHub 연동 자동 배포 | 무료 플랜 있음 |
| **Render** | Railway와 유사, 단 15분 비활성 시 슬립 | 무료 플랜 있음 |
| **Browserless.io** | Chrome을 클라우드에서 실행해주는 서비스, Vercel과 함께 사용 가능 | 무료 플랜 있음 |

현재는 **팀원 각자 로컬에서 실행**하는 방식으로 사용합니다.

---

## QA 결과 예시

> 🗓️ 테스트 일시: 2026-03-20
> 🌐 대상 URL: `https://todo-webapp-develop.enuma.com/mt02/?ver=mt03`
> 📄 페이지 제목: 월간 토도원

| 구분 | 수 |
|------|-----|
| ✅ 통과 | 9 |
| ❌ 실패 | 1 |
| ⚠️ 경고 | 8 |

### 테스트 결과 상세

| 결과 | 항목 |
|------|------|
| ✅ | HTTP 응답 코드 정상 (200) |
| ✅ | 페이지 로드 시간 양호 (2.30초) |
| ✅ | 콘솔 에러 없음 |
| ✅ | 깨진 이미지 없음 |
| ✅ | 깨진 링크 없음 (0개 확인) |
| ✅ | lang 속성 존재 |
| ✅ | viewport 메타태그 존재 |
| ✅ | 동영상 요소 감지됨 (1개) |
| ✅ | 동영상 로드 에러 없음 |
| ❌ | 동영상 소스(src) 없음 |
| ⚠️ | 네트워크 요청 실패 2건 |
| ⚠️ | H1 태그 없음 |
| ⚠️ | meta description 없음 |
| ⚠️ | alt 속성 없는 이미지 5건 |
| ⚠️ | 동영상 재생 불가 1건 (자동재생 정책 또는 소스 없음) |
| ℹ️ | 오디오 요소 없음 |
| ℹ️ | 캔버스 요소 없음 (게임/인터랙티브 콘텐츠 없음) |
| ℹ️ | iframe 감지됨 (1개) - 임베디드 콘텐츠는 내부 테스트 불가 |
