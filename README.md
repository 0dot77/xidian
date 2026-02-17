<p align="center">
  <img src="public/icon/128.png" alt="Xidian" width="80" />
</p>

<h1 align="center">Xidian</h1>

<p align="center">
  X(Twitter) 게시물을 깔끔한 마크다운으로 Obsidian에 저장하는 Chrome 확장
</p>

<p align="center">
  <strong>한 번의 클릭</strong>으로 트윗의 텍스트, 이미지, 영상 링크, 인용 트윗까지 — 그대로 옵시디언 노트로.
</p>

---

## 주요 기능

- **Selection Mode** — 확장 아이콘 클릭 또는 `Cmd+Shift+X`로 진입. 트윗 위에 마우스를 올리면 보라색으로 하이라이트, 클릭하면 바로 저장
- **"더보기" 자동 추출** — 타임라인에서 잘려 보이는 긴 트윗도 전체 텍스트를 자동으로 가져옴
- **깔끔한 마크다운** — YAML frontmatter + Obsidian callout 문법. Dataview 쿼리와 바로 호환
- **의미 있는 파일명** — 트윗 내용에서 제목을 자동 생성 (예: `2D sprite animation comparison techniques`)
- **이미지 고해상도** — 모든 이미지를 원본(`name=large`) 해상도로 저장
- **영상 지원** — 썸네일 + 원본 링크 포함
- **인용 트윗** — 인용된 트윗 내용도 함께 캡처

---

## 설치 방법

> Chrome 웹 스토어 등록 전이므로 수동 설치가 필요합니다.

### 1. 확장 파일 다운로드

```
git clone https://github.com/0dot77/xidian.git
cd xidian
npm install
npm run build
```

> [Node.js](https://nodejs.org/) 18 이상이 필요합니다.

### 2. Chrome에 설치

1. Chrome 주소창에 `chrome://extensions` 입력
2. 우측 상단 **개발자 모드** 토글 켜기
3. **압축해제된 확장 프로그램을 로드합니다** 클릭
4. `xidian/.output/chrome-mv3` 폴더 선택

<p align="center">
  <em>확장이 설치되면 브라우저 우측 상단에 Xidian 아이콘이 나타납니다.</em>
</p>

### 3. Obsidian Vault 설정

1. Xidian 아이콘을 **우클릭** → **옵션**
2. **Vault Name**에 Obsidian vault 이름 입력 (예: `내 메모장`)
3. **Save Path**는 기본값 `Clippings/Twitter` 그대로 사용하거나 원하는 경로 입력
4. 저장 완료

---

## 사용법

### 기본 사용

1. **x.com**(트위터)에 접속
2. Xidian **아이콘 클릭** (또는 `Cmd+Shift+X` / `Ctrl+Shift+X`)
3. 화면 우측 상단에 **"Selection Mode"** 뱃지가 나타남
4. 저장하고 싶은 트윗에 **마우스를 올리면** 보라색 하이라이트
5. **클릭** → 초록색 플래시와 함께 Obsidian에 노트가 생성됨
6. 끝내려면 아이콘 다시 클릭 / `Esc` 키 / 뱃지 클릭

### 저장 결과 예시

Obsidian에 이런 노트가 생성됩니다:

```markdown
---
author: "John Carmack"
handle: "@ID_AA_Carmack"
source: "https://x.com/ID_AA_Carmack/status/123456"
date: 2026-02-17
type: tweet
likes: 4521
reposts: 892
replies: 123
---

# John Carmack (@ID_AA_Carmack)

> [!info] [Original Post](https://x.com/...) | 2026-02-17

트윗 본문 내용이 여기에 들어갑니다.
"더보기"로 가려진 긴 텍스트도 전부 포함됩니다.

![Image 1](https://pbs.twimg.com/media/abc.jpg?name=large)

> [!tip] Video
> [Watch on X](https://x.com/...)
```

---

## 설정 옵션

아이콘 우클릭 → **옵션**에서 변경할 수 있습니다.

| 설정 | 설명 | 기본값 |
|------|------|--------|
| Vault Name | Obsidian vault 이름 | *(필수 입력)* |
| Save Path | 노트 저장 경로 | `Clippings/Twitter` |
| Export Method | 내보내기 방식 | Obsidian URI |
| Include Metrics | 좋아요/리포스트/답글 수 포함 | 켜짐 |
| Include Images | 이미지 포함 | 켜짐 |
| File Name | 파일명 템플릿 | `{{title}}` |

### 내보내기 방식

- **Obsidian URI** (기본) — vault 이름만 설정하면 바로 사용. 가장 간편
- **Clipboard** — 마크다운을 클립보드에 복사. 직접 붙여넣기
- **REST API** — [Local REST API 플러그인](https://github.com/coddingtonbear/obsidian-local-rest-api) 사용 시

### 파일명 템플릿 변수

| 변수 | 예시 |
|------|------|
| `{{title}}` | 트윗 내용 기반 자동 생성 제목 |
| `{{handle}}` | `johncarmack` |
| `{{name}}` | `John Carmack` |
| `{{id}}` | `123456789` |
| `{{date}}` | `2026-02-17` |

조합 예: `{{date}}-{{title}}` → `2026-02-17-The future of rendering`

---

## 단축키

| 동작 | Mac | Windows/Linux |
|------|-----|---------------|
| Selection Mode 토글 | `Cmd+Shift+X` | `Ctrl+Shift+X` |
| Selection Mode 종료 | `Esc` | `Esc` |

---

## 기술 스택

- [WXT](https://wxt.dev) — Chrome Extension 프레임워크 (Manifest V3)
- React + Tailwind CSS — 설정 UI
- TypeScript
- X GraphQL API interception — "더보기" 전체 텍스트 추출

---

## 라이선스

MIT
