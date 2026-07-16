# Mart Korean 🛒

필리핀 한인마트 취업을 준비하는 세부아노(비사야어) 화자를 위한 한국어 학습 웹앱.
스피킹·리스닝 우선, 상품/라벨 리딩 보조. 모든 뜻은 쉬운 영어 + 비사야어 병기.

## 친구에게 전달하는 법

**공식 주소 (추천)**: https://lucy10100.github.io/mart-korean/
링크를 메신저로 보내면 어떤 폰/태블릿에서든 브라우저로 바로 열림. 재배포는 `sh tools/deploy.sh`.

그 외 방법:
1. **Artifact 링크**: claude.ai 아티팩트 공유 메뉴에서 공개 후 전달
2. **파일 전송**: `dist/index.html`을 에어드랍 등으로 전송. 단, iOS 파일 미리보기(Quick Look)와
   메신저 인앱 뷰어에서는 JS가 실행되지 않아 "안 열림"으로 보일 수 있고, 페이스북 메신저는
   html 첨부 자체를 차단함 — 링크 방식을 권장.

## 아이패드에서 쓰는 법

- 첫 화면에서 **"Tap to start 🔊"** 를 눌러야 소리가 켜짐 (iOS 정책)
- 한국어 음성은 아이패드 내장 TTS 사용 — 설정 > 손쉬운 사용 > 콘텐츠 말하기에서
  한국어 음성(유나)을 미리 받아두면 품질이 좋아짐
- 헤더의 **PDF ⬇️** 버튼: 치트시트 PDF 저장 (인쇄해서 계산대 옆에 두는 용도)
- 학습 진행(✓ 체크)은 기기에 저장됨

## 개발

```bash
npm test        # 데이터 무결성 + 퀴즈 로직 + 빌드 산출물 검증
npm run pdf     # assets/cheatsheet.pdf 재생성 (헤드리스 크롬 필요)
npm run build   # dist/index.html + dist/artifact.html 빌드
npm run build -- 0.6x   # + dist/index.0.6x.html 버전 스냅샷도 저장
node tools/smoke.js  # 헤드리스 브라우저 E2E 스모크 (puppeteer-core)
```

콘텐츠 수정은 `src/data.js` 한 곳만 고치면 됨 → `npm run pdf && npm run build`.
카드/퀴즈/PDF가 모두 같은 데이터를 사용.

## 참고

- 발음 표기: 영어 파닉스 기반 respelling (표준 로마자 아님). 상품명은 포장지 통용 표기 병기.
- **비사야어(세부아노) 번역은 AI 작성** — 배포 전 원어민(친구)에게 한번 검수받는 것을 권장.
  이상한 표현은 `src/data.js`에서 해당 `bis` 필드만 고치면 됨.
- 스펙: `docs/superpowers/specs/2026-07-13-mart-korean-design.md`
