# 반별 전용 화면

작업 및 Vercel Root Directory: move-it_FE-main/move-it_FE (저장소 루트가 이 폴더면 비워둡니다).

## 로컬

이 폴더에서 npm install, npm run dev를 실행합니다.
.env.local의 BACKEND_API_KEY에 백엔드의 일반 API_KEY 값을 입력합니다. VITE_ 접두사를 붙이지 않습니다.
http://localhost:5173/class/12 형태로 접속합니다. /에서는 전용 주소 안내만 표시합니다.
주소의 번호는 /classes 응답의 classNumber이며, 표시 이름은 className을 그대로 사용합니다.
반 선택 드롭다운과 localStorage 선택 저장은 사용하지 않습니다.

## Vercel 배포

프론트 프로젝트의 환경변수 BACKEND_API_KEY에 백엔드 일반 API_KEY와 같은 값을 설정하고 배포합니다.
로컬 .env.local은 배포되지 않습니다. ADMIN_API_KEY는 사용하지 않습니다.
vercel.json은 /api 요청을 api/proxy.js로, 나머지 화면 주소를 index.html로 전달합니다.
API 함수가 서버 환경변수에서 인증키를 읽어 X-API-Key로 전달합니다. 브라우저 번들에 키를 넣지 않습니다.
조회용 /classes와 /classes/{classNumber}만 지원합니다. 백엔드 상태 코드를 유지하고 캐시하지 않습니다.
따라서 /class/12에 직접 접속하거나 새로고침해도 공통 화면이 열립니다.
이 설정은 Vercel용이며 다른 호스팅에는 동일한 SPA fallback과 인증 프록시가 필요합니다.
배포 후 /class/12 직접 접속·새로고침, /api/classes JSON 응답, 등록되지 않은 반 안내를 확인합니다.

## 디스코드 봇 링크

교실 설정 후 저장된 classNumber를 사용해 https://프론트도메인/class/{classNumber} 링크를 안내하면 됩니다.
이 작업에서 백엔드와 봇 코드는 수정하지 않았습니다.
