# Mart Korean 학습 웹앱 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 한인마트 취업을 준비하는 세부아노어 화자를 위한 단일 HTML 한국어 학습 앱 (TTS 스피킹/리스닝 + 상품/한글 리딩 + 퀴즈 + PDF 치트시트).

**Architecture:** `src/`에서 분리 개발(data/quiz/app/styles) 후 `tools/build.js`가 전부 인라인해 `dist/index.html` 단일 파일 산출. 콘텐츠는 `APP_DATA` 하나로 정의하고 카드 UI·퀴즈·PDF가 모두 이 데이터를 소비. 순수 로직(데이터 검증, 퀴즈 생성)은 node:test로 TDD.

**Tech Stack:** Vanilla JS (프레임워크 없음), Web Speech API (ko-KR TTS), node:test, 헤드리스 Chrome(PDF 생성), base64 내장 PDF.

## Global Constraints

- 최종 산출물은 **단일 자체완결 `dist/index.html`** — 외부 URL 요청 0건 (스펙 §4)
- 모든 학습 항목의 뜻은 **쉬운 영어 + 세부아노 비사야어 병기** (스펙 §1)
- 발음 표기는 영어 파닉스 respelling + 하이픈 음절 구분, 연음 반영 (스펙 §3). 표준 로마자(eo/eu) 금지, 단 상품명은 통용 표기 병기
- UI 문구는 짧고 쉬운 영어 (스펙 §1)
- iPad Safari 터치 최적화, 라이트/다크 대응, TTS는 사용자 제스처 후 활성화 (스펙 §5)
- 진행 저장은 localStorage, 실패 시 조용히 비활성 (스펙 §5)
- src의 JS는 플레인 스크립트 + `if (typeof module !== 'undefined') module.exports = ...` 패턴 (브라우저 전역 + node require 겸용)
- 커밋은 태스크마다, 메시지 끝에 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

## 파일 구조

```
mart-korean/
  src/
    data.js       # APP_DATA — 전체 콘텐츠 (문장/상품/한글/소리)
    quiz.js       # 순수 퀴즈 로직 (문항 생성/채점)
    app.js        # UI — 탭, 카드 렌더, TTS, 진행저장, 퀴즈 화면
    styles.css    # 전체 스타일
    index.html    # 개발용 셸 (<script src>로 src 파일 참조)
  test/
    data.test.js  # 데이터 무결성 검증
    quiz.test.js  # 퀴즈 로직 TDD
    build.test.js # 빌드 산출물 검증
  tools/
    make-pdf.js   # APP_DATA → 치트시트 HTML → 헤드리스 크롬 → assets/cheatsheet.pdf
    build.js      # src + PDF base64 인라인 → dist/index.html
  assets/cheatsheet.pdf   # 생성물 (커밋함 — 빌드 재현성)
  dist/index.html         # 최종 단일 파일
```

---

### Task 1: 콘텐츠 데이터 모듈 (`src/data.js`) + 무결성 테스트

**Files:**
- Create: `src/data.js`, `test/data.test.js`, `package.json`

**Interfaces:**
- Produces: 전역 `APP_DATA` = `{ sounds, phraseGroups, products, hangul, meta }` (node에서 `require('../src/data.js')` 가능)
- 항목 공통 스키마: `{ ko, say, en, bis }` + 선택 필드 `note`(짧은 영어 상황 메모), `lit`(직역), `casual`({ko,say,en,bis} 반말 변형), `pack`(상품 통용 영문표기), `listenOnly`(bool)

**데이터 명세 (콘텐츠 인벤토리):**

```js
// 스키마 워크드 예시
{ ko: '어서 오세요', say: 'uh-suh oh-seh-yo', en: 'Welcome!', bis: 'Dayon!',
  note: 'Say this when a customer walks in' }
{ ko: '고추장', pack: 'Gochujang', say: 'goh-choo-jahng',
  en: 'spicy red pepper paste', bis: 'halang nga sarsa sa sili' }
```

- `sounds`: 7항목 — ① 모음 훑기(ㅏㅗㅜㅣㅐ/ㅔ, 비사야 모음 비교) ② ㅓ=uh ③ ㅡ=eu ④ 된소리 ㄲㄸㅃㅆㅉ(떡) ⑤ ㅈ/ㅊ ⑥ 받침 ⑦ 연음 맛보기. 각각 `{ id, title, tip_en, tip_bis, examples: [{ko,say,en,bis}] }`
- `phraseGroups`: 2그룹.
  - **`mart` (At the Mart)** 레슨 7개: greeting(어서 오세요/안녕하세요/찾으시는 거 있으세요?/천천히 보세요/네, 손님 외 ~10), customers(**listenOnly**: 라면 어디 있어요?/이거 얼마예요?/덜 매운 거 있어요?/이거 언제까지예요?/봉투 하나 주세요/이거 있어요?/계산해 주세요 외 ~14), directions(이쪽으로 오세요/3번 통로에 있어요/냉동 코너에 있어요/저기 있어요/제가 안내해 드릴게요 외 ~10), checkout(봉투 필요하세요?/카드 되세요/현금이요, 카드요?/영수증 드릴까요?/포인트 카드 있으세요? 외 ~11), problems(죄송합니다, 품절이에요/내일 들어와요/확인해 볼게요/교환해 드릴게요/잠시만 기다려 주세요 외 ~11), thanks(감사합니다, 또 오세요/안녕히 가세요/좋은 하루 되세요/오랜만이에요 외 ~8), numbers(천 원/만 원/한 개, 두 개/하나 둘 셋…열/백/천/만 + 듣기 예문 5: "이거 세 개 주세요" 등, ~12)
  - **`daily` (Daily Life)** 레슨 5개: intro(안녕하세요/저는 ~예요/이름이 뭐예요?/반가워요/잘 지냈어요? 외 ~12), qa(이게 뭐예요?/어디예요?/네/아니요/몰라요/알겠어요/다시 말해 주세요/천천히 말해 주세요 외 ~12), feelings(좋아요/진짜요?/대박/피곤해요/배고파요/괜찮아요/재미있어요 외 ~12), food(같이 먹어요/잘 먹겠습니다/맛있어요/매워요/배불러요/뭐 먹을래요? 외 ~12), plans(내일 만나요/몇 시에요?/주말에 뭐 해요?/시간 있어요?/연락할게요 외 ~12). 친구 사이 자연스러운 문장엔 `casual` 변형(감사합니다→고마워, 반가워요→반가워 등 그룹당 5개 이상)
- `products`: 8카테고리 × 10~12개 (총 85개 이상): ramyeon(신라면/진라면/불닭볶음면/짜파게티/비빔면/우동/잔치국수/당면/냉면/쫄면), sauces(고추장/된장/쌈장/간장/참기름/들기름/고춧가루/식초/물엿/맛술/액젓), kimchi(배추김치/깍두기/총각김치/열무김치/단무지/장아찌/젓갈/김/미역/멸치), frozen(만두/김치만두/떡/떡볶이 떡/어묵/핫도그/붕어빵/호떡/만두피/냉동 삼겹살), snacks(새우깡/초코파이/빼빼로/홈런볼/약과/유과/호두과자/뻥튀기/젤리/사탕), drinks(소주/막걸리/맥주/식혜/수정과/알로에 음료/바나나우유/보리차/옥수수차/유자차), grains(쌀/찹쌀/현미/보리/미숫가루/부침가루/튀김가루/밀가루/콩/팥), household(수세미/고무장갑/젓가락/숟가락/도시락/밥솥/비누/치약/휴지/봉투). 각각 `pack` 통용 표기(Shin Ramyun, Gochujang, Tteok…) 포함, `note`에 관련 손님 질문 1개(예: "고추장 어디 있어요?")
- `hangul`: 4단계 `{ id, title, intro_en, intro_bis, items }` — ① 기본 자음 ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅎ + 기본 모음 ㅏㅓㅗㅜㅡㅣ (라면 분해 예시 포함) ② 나머지 자모(ㅋㅌㅍㅊ, ㄲㄸㅃㅆㅉ, ㅑㅕㅛㅠㅐㅔ)와 블록 조립 원리(글자 예: 김, 밥) ③ 받침(ㄱㄴㄹㅁㅂㅇ 대표음, 예: 물/김/밥) ④ 라벨 단어 12개(매운맛/순한맛/냉동/냉장/유통기한/세일/신상품/증정/소/중/대/할인) — 라벨 단어는 `{ko,say,en,bis}` 스키마
- `meta`: `{ title: 'Mart Korean', version: 1 }`

**Respelling 규칙(작성 시 준수):** ㅓ→uh, ㅡ→eu, ㅗ→oh, ㅜ→oo, ㅐ/ㅔ→eh, ㅚ/ㅙ/ㅞ→weh, ㅕ→yuh, 어두 ㄱ/ㄷ/ㅂ/ㅈ→g/d/b/j, 된소리→tt/kk/pp/ss/jj, 연음·비음화 소리 나는 대로(합니다→hahm-nee-da, 있어요→ee-ssuh-yo). 음절마다 하이픈, 단어 사이 공백.

- [ ] **Step 1: package.json 생성**

```json
{ "name": "mart-korean", "private": true, "version": "1.0.0",
  "scripts": { "test": "node --test test/", "pdf": "node tools/make-pdf.js", "build": "node tools/build.js" } }
```

- [ ] **Step 2: 실패하는 데이터 검증 테스트 작성 (`test/data.test.js`)**

```js
const test = require('node:test');
const assert = require('node:assert');
const DATA = require('../src/data.js');

const allPhrases = () => DATA.phraseGroups.flatMap(g => g.lessons.flatMap(l => l.items));
const allProducts = () => DATA.products.flatMap(c => c.items);

test('phrase items have ko/say/en/bis, non-empty', () => {
  for (const p of allPhrases())
    for (const k of ['ko','say','en','bis'])
      assert.ok(typeof p[k] === 'string' && p[k].trim(), `${p.ko || '??'} missing ${k}`);
});
test('volume targets met', () => {
  const mart = DATA.phraseGroups.find(g => g.id === 'mart');
  const daily = DATA.phraseGroups.find(g => g.id === 'daily');
  assert.ok(mart.lessons.flatMap(l => l.items).length >= 75);
  assert.ok(daily.lessons.flatMap(l => l.items).length >= 55);
  assert.ok(allProducts().length >= 85);
  assert.equal(DATA.products.length, 8);
});
test('products have pack romanization', () => {
  for (const p of allProducts()) assert.ok(p.pack && p.pack.trim(), p.ko);
});
test('no standard-RR vowels in say fields (eo/eu misleading)', () => {
  for (const p of [...allPhrases(), ...allProducts()])
    assert.ok(!/\beo|eo\b/.test(p.say), `${p.ko}: ${p.say}`);
});
test('customers lesson is listen-only', () => {
  const l = DATA.phraseGroups.find(g => g.id==='mart').lessons.find(l => l.id==='customers');
  assert.ok(l.listenOnly === true && l.items.length >= 12);
});
test('daily group has casual variants', () => {
  const daily = DATA.phraseGroups.find(g => g.id === 'daily');
  const casuals = daily.lessons.flatMap(l => l.items).filter(p => p.casual);
  assert.ok(casuals.length >= 5);
});
test('hangul has 4 stages, label words complete', () => {
  assert.equal(DATA.hangul.length, 4);
  assert.ok(DATA.hangul[3].items.length >= 12);
});
test('sounds course has 7 sections with bis tips', () => {
  assert.equal(DATA.sounds.length, 7);
  for (const s of DATA.sounds) assert.ok(s.tip_en && s.tip_bis && s.examples.length >= 1);
});
```

- [ ] **Step 3: 테스트 실행 — 실패 확인** — `npm test` → FAIL (data.js 없음)
- [ ] **Step 4: `src/data.js` 작성** — 위 인벤토리 전체를 스키마대로 작성. 말미에:

```js
if (typeof module !== 'undefined') module.exports = APP_DATA;
```

- [ ] **Step 5: `npm test` → 전부 PASS 확인**
- [ ] **Step 6: 커밋** — `feat: add full content data (phrases, products, hangul, sounds)`

---

### Task 2: 퀴즈 로직 (`src/quiz.js`) — TDD

**Files:**
- Create: `src/quiz.js`, `test/quiz.test.js`

**Interfaces:**
- Consumes: `APP_DATA` 구조 (Task 1)
- Produces: 전역 `Quiz` 객체:
  - `Quiz.pools(data)` → `{ listening: Item[], speaking: Item[], reading: Item[] }` (listening = 전 문장, speaking = listenOnly 레슨 제외 문장, reading = products + 라벨 단어)
  - `Quiz.makeQuestion(pool, rng)` → `{ item, choices: [{en,bis}×4], answerIndex }` — 보기 중복 없음, 정답 포함, rng는 `() => number` 주입(테스트 시 시드 고정)
  - `Quiz.makeRng(seed)` → mulberry32 유사 결정적 rng

- [ ] **Step 1: 실패하는 테스트 작성 (`test/quiz.test.js`)**

```js
const test = require('node:test');
const assert = require('node:assert');
const DATA = require('../src/data.js');
const Quiz = require('../src/quiz.js');

test('pools split correctly', () => {
  const p = Quiz.pools(DATA);
  assert.ok(p.listening.length >= 130);
  assert.ok(p.speaking.length >= 110);            // listenOnly 제외
  assert.ok(p.reading.length >= 95);              // 상품 85 + 라벨 12
  assert.ok(p.speaking.every(i => !i._listenOnly));
});
test('makeQuestion: 4 unique choices incl. answer', () => {
  const p = Quiz.pools(DATA); const rng = Quiz.makeRng(42);
  for (let i = 0; i < 200; i++) {
    const q = Quiz.makeQuestion(p.listening, rng);
    assert.equal(q.choices.length, 4);
    assert.equal(new Set(q.choices.map(c => c.en)).size, 4);
    assert.equal(q.choices[q.answerIndex].en, q.item.en);
  }
});
test('makeRng deterministic', () => {
  const a = Quiz.makeRng(7), b = Quiz.makeRng(7);
  assert.equal(a(), b());
});
```

- [ ] **Step 2: `npm test` → quiz 테스트 FAIL 확인**
- [ ] **Step 3: `src/quiz.js` 구현**

```js
const Quiz = {
  makeRng(seed) {
    let s = seed >>> 0;
    return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  },
  pools(data) {
    const phrases = [];
    for (const g of data.phraseGroups) for (const l of g.lessons)
      for (const it of l.items) phrases.push({ ...it, _listenOnly: !!l.listenOnly });
    const reading = [ ...data.products.flatMap(c => c.items), ...data.hangul[3].items ];
    return { listening: phrases, speaking: phrases.filter(p => !p._listenOnly), reading };
  },
  makeQuestion(pool, rng) {
    const pick = arr => arr[Math.floor(rng() * arr.length)];
    const item = pick(pool);
    const wrong = [];
    while (wrong.length < 3) {
      const w = pick(pool);
      if (w.en !== item.en && !wrong.some(x => x.en === w.en)) wrong.push(w);
    }
    const choices = [item, ...wrong].map(c => ({ en: c.en, bis: c.bis }));
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1)); [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    return { item, choices, answerIndex: choices.findIndex(c => c.en === item.en) };
  }
};
if (typeof module !== 'undefined') module.exports = Quiz;
```

- [ ] **Step 4: `npm test` → 전부 PASS**
- [ ] **Step 5: 커밋** — `feat: quiz logic (pools, deterministic question builder)`

---

### Task 3: 앱 UI (`src/index.html`, `src/styles.css`, `src/app.js`)

**Files:**
- Create: `src/index.html`, `src/styles.css`, `src/app.js`

**Interfaces:**
- Consumes: `APP_DATA`, `Quiz`
- Produces: 전역 `App` — `App.init()`, `App.speak(text, {slow})`, `App.store` (localStorage 래퍼: `get(key)`, `set(key,val)`, 실패 시 no-op)

**UI 명세:**
- 시작 오버레이: 앱 제목 + "Tap to start 🔊" 버튼 → 탭 시 무음 utterance로 TTS 활성화 후 메인 표시. 한국어 음성 미탐지 시 상단 배너 "No Korean voice on this device — you can still read & learn."
- 하단 고정 탭바 5개: 🔤 Sounds / 💬 Phrases / 🛒 Products / ㄱ Hangul / 🎯 Quiz — 터치 타깃 ≥ 48px
- Phrases 탭: 상단 그룹 토글(At the Mart 🏪 / Daily Life ☀️) → 레슨 목록 → 레슨 화면은 문장 카드 세로 나열
- 문장 카드: 한글(크게, 탭→재생) / say(초록 모노) / en / bis(이탤릭) / note(회색 작게) / casual 있으면 "Casual 👥" 접이식 / 버튼: ▶️ 재생, 🐢 느리게(rate 0.7), ✓ "I know this"(localStorage, 카드 흐리게)
- listenOnly 레슨 헤더에 배지 "👂 Listen & understand — customers say this to YOU"
- Products 탭: 카테고리 가로 칩 → 상품 카드(한글 크게 + pack 표기 + say + en/bis + note 질문 재생 버튼)
- Hangul 탭: 4단계 아코디언, 글자/단어 탭 시 재생
- Sounds 탭: 7개 섹션 카드, 예시 단어 재생
- 헤더: 제목 + "PDF" 버튼(Task 5에서 활성화) + 진행 카운트("n / total learned")
- 다크/라이트: `prefers-color-scheme` + CSS 변수

**핵심 코드 (app.js에 그대로 사용):**

```js
const App = {
  voiceKo: null,
  initTTS() {
    const pickVoice = () => {
      const vs = speechSynthesis.getVoices();
      App.voiceKo = vs.find(v => v.lang === 'ko-KR') || vs.find(v => v.lang && v.lang.startsWith('ko')) || null;
      document.getElementById('no-voice-banner').hidden = !!App.voiceKo || vs.length === 0;
    };
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  },
  speak(text, opts = {}) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    if (App.voiceKo) u.voice = App.voiceKo;
    u.rate = opts.slow ? 0.7 : 0.95;
    speechSynthesis.speak(u);
  },
  store: {
    get(k, d) { try { const v = localStorage.getItem('mk:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('mk:' + k, JSON.stringify(v)); } catch {} }
  },
};
```

시작 버튼 핸들러: `speechSynthesis.speak(new SpeechSynthesisUtterance(''))` 후 `App.initTTS()` — iOS 제스처 요건 충족.

- [ ] **Step 1: `src/index.html` 작성** — `<script src="data.js"></script><script src="quiz.js"></script><script src="app.js"></script>`, 오버레이/배너/탭바/각 탭 컨테이너 마크업
- [ ] **Step 2: `src/styles.css` 작성** — CSS 변수 팔레트(라이트/다크), 카드, 탭바, 칩, 아코디언. 한글 큰 글씨 `font-size: 1.8rem`
- [ ] **Step 3: `src/app.js` 작성** — 위 코어 + 렌더 함수 `renderSounds/renderPhrases/renderProducts/renderHangul` (APP_DATA 순회, 템플릿 리터럴), 탭 전환, ✓ 진행저장
- [ ] **Step 4: 브라우저 확인** — `open src/index.html` 후 사용자 화면 확인 대신 `node --test`(회귀) + 콘솔 에러 없는지 정적 점검: `node -e "require('./src/data.js'); require('./src/quiz.js')"` PASS. 렌더 스모크는 Task 6 빌드 후 일괄
- [ ] **Step 5: 커밋** — `feat: app UI shell (tabs, cards, TTS, progress)`

---

### Task 4: 퀴즈 UI

**Files:**
- Modify: `src/app.js`, `src/index.html`, `src/styles.css`

**Interfaces:**
- Consumes: `Quiz.pools`, `Quiz.makeQuestion`
- Produces: Quiz 탭 화면 — 모드 3버튼(👂 Listening / 🗣 Speaking / 🏷 Reading), 10문항 세션, 점수 표시

**동작 명세:**
- Listening: 자동 재생(+🔁 다시 듣기, 🐢) → 4지선다(en+bis) → 정답 시 초록, 오답 시 빨강+정답 하이라이트 → 다음. 한글은 답 공개 후 표시
- Speaking: 카드에 en+bis+note 표시 → "Show answer 🔊" 탭 → 한글+say 공개+재생 → "I said it right 👍 / Not yet 👎" 자기평가
- Reading: 한글(상품/라벨) 크게 표시, **재생 없이** → 4지선다 → 답 공개 후 재생 버튼
- 세션 끝: "8 / 10 🎉 Try again?" / rng는 `Quiz.makeRng(seedCounter++)` 사용

- [ ] **Step 1: 퀴즈 화면 마크업/스타일 추가**
- [ ] **Step 2: `app.js`에 `QuizUI` 구현** — 상태 `{mode, qIndex, score, current}`, `startSession(mode)`, `answer(i)`, `next()`
- [ ] **Step 3: `npm test` 회귀 PASS + `node -e "require('./src/app.js')"`는 DOM 없어 불가하므로 문법 체크 `node --check src/app.js` PASS
- [ ] **Step 4: 커밋** — `feat: quiz UI (listening/speaking/reading modes)`

---

### Task 5: PDF 치트시트 생성 (`tools/make-pdf.js`)

**Files:**
- Create: `tools/make-pdf.js`
- Output: `assets/cheatsheet.pdf` (커밋)

**Interfaces:**
- Consumes: `APP_DATA`
- Produces: A4 세로 PDF — ① 마트 문장 표(레슨별: 한글/say/en/bis) ② 일상 문장 표 ③ 상품 표(카테고리별: 한글/pack/say/en) ④ 한글 자모표 + 라벨 단어. 표는 `page-break-inside: avoid`

**구현:**

```js
// tools/make-pdf.js
const fs = require('fs'); const path = require('path');
const { execFileSync } = require('child_process');
const DATA = require('../src/data.js');
// buildHtml(DATA): 인라인 CSS 인쇄 레이아웃(-apple-system + Apple SD Gothic Neo), 표 생성
const html = buildHtml(DATA);
const tmp = path.join(__dirname, '_cheatsheet.html');
fs.writeFileSync(tmp, html);
fs.mkdirSync(path.join(__dirname, '../assets'), { recursive: true });
execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless', '--disable-gpu', '--no-pdf-header-footer',
   `--print-to-pdf=${path.join(__dirname, '../assets/cheatsheet.pdf')}`, tmp]);
fs.unlinkSync(tmp);
console.log('PDF written:', fs.statSync(path.join(__dirname, '../assets/cheatsheet.pdf')).size, 'bytes');
```

- [ ] **Step 1: `tools/make-pdf.js` 작성** (buildHtml 포함 — 표 4종)
- [ ] **Step 2: `npm run pdf` 실행** — Expected: `PDF written: <n> bytes`, n > 30000
- [ ] **Step 3: PDF 육안 확인** — Read 도구로 PDF 열어 한글 렌더링/레이아웃 확인
- [ ] **Step 4: 커밋** — `feat: cheatsheet PDF generator + generated asset`

---

### Task 6: 단일 파일 빌드 (`tools/build.js`) + 산출물 테스트

**Files:**
- Create: `tools/build.js`, `test/build.test.js`
- Output: `dist/index.html`

**Interfaces:**
- Consumes: `src/*` 4파일 + `assets/cheatsheet.pdf`
- Produces: `dist/index.html` — src/index.html에서 `<link href="styles.css">`→`<style>` 인라인, `<script src="X.js">`→`<script>` 인라인, `__PDF_BASE64__` 플레이스홀더→base64 문자열 치환. PDF 버튼 핸들러(앱에 이미 포함):

```js
function downloadPdf() {
  const b64 = document.getElementById('pdf-data').textContent.trim();
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'mart-korean-cheatsheet.pdf' });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
```

(`src/index.html`에 `<script type="text/plain" id="pdf-data">__PDF_BASE64__</script>` 자리 마련 — dev 모드에선 버튼이 "PDF (build only)" 비활성)

- [ ] **Step 1: 실패하는 빌드 테스트 작성 (`test/build.test.js`)**

```js
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs');
test('dist is self-contained', () => {
  const html = fs.readFileSync('dist/index.html', 'utf8');
  assert.ok(!/(src|href)=["']https?:/.test(html), 'no external URLs');
  assert.ok(!/<script src=/.test(html) && !/<link[^>]+href=/.test(html), 'all inlined');
  assert.ok(!html.includes('__PDF_BASE64__'), 'pdf embedded');
  assert.ok(html.includes('speechSynthesis'));
  assert.ok(html.length > 200000);
});
```

- [ ] **Step 2: `npm test` → build 테스트 FAIL 확인 (dist 없음)**
- [ ] **Step 3: `tools/build.js` 작성 후 `npm run build`** — Expected: `dist/index.html written (<n> KB)`
- [ ] **Step 4: `npm test` → 전부 PASS**
- [ ] **Step 5: 커밋** — `feat: single-file build with embedded PDF`

---

### Task 7: 최종 검증 + 배포

**Files:** 없음 (검증/배포만)

- [ ] **Step 1: `/verify` 스킬로 실동작 검증** — dist/index.html을 브라우저로 열어 탭 전환/카드 렌더/퀴즈 동작 확인 (TTS 실발화·iPad 확인은 사용자 몫으로 보고)
- [ ] **Step 2: Artifact 게시** — dist/index.html (favicon 🛒, 제목 Mart Korean)
- [ ] **Step 3: README.md 작성** — 사용법(링크/파일 전송 2경로, iPad에서 소리 켜기), 콘텐츠 수정 방법(`src/data.js` → `npm run pdf && npm run build`), 비사야어 검수 권장 메모
- [ ] **Step 4: 커밋 + 사용자 보고** — 아이패드 실기기 체크리스트(TTS 재생, PDF 저장, 오프라인) 전달
