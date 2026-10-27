# STEPIN 파트너 허브

STEPIN 아케이드·APP으로 행사와 대회를 진행하는 총판·외부 파트너용 통합 지원 가이드 사이트입니다.
Cloudflare Pages에서 무료로 운영하며, 파트너 코드 로그인과 관리자 페이지를 포함합니다.

## 구조

```
public/            사이트 파일 (Cloudflare가 그대로 배포)
  index.html       가이드 본문 + 관리자 페이지 (로그인 후)
  login.html       파트너 코드 · 관리자 로그인
  data/*.json      관리자 페이지에서 수정하는 데이터 (공지, 총판, 영상, FAQ, 연락처, 파트너 코드)
  img/  dl/        이미지, 다운로드 파일
functions/         서버 기능 (로그인, 세션 확인, 관리자 저장)
lib/auth.js        세션 서명 · 공통 함수
```

- 로그인하지 않은 방문자는 어떤 페이지나 파일에도 접근할 수 없습니다 (`functions/_middleware.js`).
- 파트너 코드는 원문이 아닌 SHA-256 해시로만 `public/data/partners.json`에 저장되며, 이 파일은 관리자만 읽을 수 있습니다.
- 관리자 페이지에서 저장하면 서버가 이 저장소의 `public/data/*.json`을 커밋하고, Cloudflare가 1~2분 안에 자동 재배포합니다.

## Cloudflare 설정 (최초 1회)

1. Cloudflare 대시보드 → **Workers & Pages** → **만들기(Create)** → **Pages** 탭 → **Git에 연결(Connect to Git)**
2. GitHub 계정 연결 후 `stepin-partner-hub` 저장소 선택
3. 빌드 설정
   - 프레임워크 프리셋: **없음(None)**
   - 빌드 명령: 비워 둠
   - 빌드 출력 디렉터리: `public`
4. **저장 및 배포** → `*.pages.dev` 주소가 생성됩니다.
5. 프로젝트 → **설정 → 변수 및 비밀(Variables and Secrets)** 에서 아래 값을 **프로덕션** 환경에 추가하고 다시 배포합니다.

| 이름 | 종류 | 값 |
|---|---|---|
| `SESSION_SECRET` | 비밀(Secret) | 임의의 긴 문자열 (40자 이상 무작위) |
| `ADMIN_PASSWORD` | 비밀(Secret) | 관리자 로그인 비밀번호 |
| `GITHUB_TOKEN` | 비밀(Secret) | 아래에서 만든 GitHub 토큰 |
| `GITHUB_REPO` | 텍스트 | `oddeye0721-debug/stepin-partner-hub` |
| `GITHUB_BRANCH` | 텍스트 | `main` |

### GitHub 토큰 만들기 (관리자 저장용)

GitHub → 우측 상단 프로필 → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**

- Repository access: **Only select repositories** → `stepin-partner-hub`
- Permissions → Repository permissions → **Contents: Read and write**
- 만료일: 1년 권장 (만료 전에 새로 발급해 `GITHUB_TOKEN`을 교체)

### 회사 도메인 연결

프로젝트 → **사용자 지정 도메인(Custom domains)** → `hub.stepin.ai` 입력 → 화면에 나오는 **CNAME** 값을 stepin.ai DNS 관리 화면에 추가합니다. HTTPS 인증서는 자동 발급됩니다.

## 운영

- **파트너 코드 발급:** `/login` → 본사 관리자 로그인 → 관리자 페이지 → 파트너 코드. 발급 직후에만 전체 코드가 보이니 바로 복사해 전달하세요. 반영까지 1~2분 걸립니다.
- **코드 사용 중지:** 관리자 페이지에서 상태를 ‘중지’로 저장하면, 재배포 후 해당 코드로 로그인한 화면도 다음 접속 때 로그아웃됩니다.
- **가이드 본문 · 다운로드 파일 수정:** `public/index.html`, `public/dl/` 을 수정해 커밋하면 자동 배포됩니다.

## 로컬 미리보기

```
npx wrangler pages dev public
```
`.dev.vars` 파일에 `SESSION_SECRET=...`, `ADMIN_PASSWORD=...` 를 넣어 실행합니다 (이 파일은 커밋하지 않습니다).
