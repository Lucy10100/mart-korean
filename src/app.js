// Mart Korean — UI logic. Data comes from APP_DATA (data.js), quiz logic from Quiz (quiz.js).

/* eslint-disable no-undef */

const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const attr = s => encodeURIComponent(s);

const App = {
  voiceKo: null,
  state: {
    view: 'phrases',
    groupId: 'mart',
    lessonId: null,
    productCat: null,
  },
  learned: new Set(),

  store: {
    get(k, d) {
      try { const v = localStorage.getItem('mk:' + k); return v == null ? d : JSON.parse(v); }
      catch { return d; }
    },
    set(k, v) {
      try { localStorage.setItem('mk:' + k, JSON.stringify(v)); } catch { /* private mode */ }
    },
  },

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
    u.rate = opts.slow ? 0.55 : 0.95;
    speechSynthesis.speak(u);
  },

  totalLearnable: 0,

  init() {
    App.learned = new Set(App.store.get('learned', []));
    App.totalLearnable = allPhraseItems().length + allProductItems().length;

    document.getElementById('start-btn').addEventListener('click', () => {
      if ('speechSynthesis' in window) {
        speechSynthesis.speak(new SpeechSynthesisUtterance(''));
        App.initTTS();
      } else {
        document.getElementById('no-voice-banner').hidden = false;
      }
      document.getElementById('start-overlay').style.display = 'none';
    });

    document.getElementById('tabbar').addEventListener('click', e => {
      const btn = e.target.closest('button[data-view]');
      if (!btn) return;
      App.state.view = btn.dataset.view;
      document.querySelectorAll('#tabbar button').forEach(b => b.classList.toggle('active', b === btn));
      render();
    });

    document.getElementById('pdf-btn').addEventListener('click', downloadPdf);
    const b64 = document.getElementById('pdf-data').textContent.trim();
    if (!b64 || b64.startsWith('__PDF')) {
      const btn = document.getElementById('pdf-btn');
      btn.disabled = true;
      btn.title = 'PDF is included in the built version';
    }

    // One delegated handler for play / learn / navigation taps.
    document.getElementById('main').addEventListener('click', e => {
      const say = e.target.closest('[data-say]');
      if (say) { App.speak(decodeURIComponent(say.dataset.say), { slow: say.dataset.slow === '1' }); return; }
      const learn = e.target.closest('[data-learn]');
      if (learn) { toggleLearned(decodeURIComponent(learn.dataset.learn)); return; }
      const lesson = e.target.closest('[data-lesson]');
      if (lesson) { App.state.lessonId = lesson.dataset.lesson; render(); return; }
      const back = e.target.closest('[data-back]');
      if (back) { App.state.lessonId = null; render(); return; }
      const group = e.target.closest('[data-group]');
      if (group) { App.state.groupId = group.dataset.group; App.state.lessonId = null; render(); return; }
      const cat = e.target.closest('[data-cat]');
      if (cat) { App.state.productCat = cat.dataset.cat; render(); return; }
      const acc = e.target.closest('[data-acc]');
      if (acc) {
        const body = document.getElementById('acc-' + acc.dataset.acc);
        if (body) body.hidden = !body.hidden;
        return;
      }
      const casual = e.target.closest('[data-casual]');
      if (casual) {
        const body = casual.nextElementSibling;
        if (body) body.hidden = !body.hidden;
        return;
      }
      if (typeof QuizUI !== 'undefined' && QuizUI.handleClick(e)) return;
    });

    render();
    updateLearnedCount();
  },
};

function allPhraseItems() {
  return APP_DATA.phraseGroups.flatMap(g => g.lessons.flatMap(l => l.items));
}
function allProductItems() {
  return APP_DATA.products.flatMap(c => c.items);
}

function toggleLearned(key) {
  if (App.learned.has(key)) App.learned.delete(key); else App.learned.add(key);
  App.store.set('learned', [...App.learned]);
  render();
  updateLearnedCount();
}

function updateLearnedCount() {
  document.getElementById('learned-count').textContent =
    `${App.learned.size} / ${App.totalLearnable} learned`;
}

/* ---------- shared renderers ---------- */

function phraseCard(item, { showPack = false } = {}) {
  const key = item.ko;
  const learned = App.learned.has(key);
  return `
  <div class="card p-card ${learned ? 'learned-card' : ''}">
    <div class="p-top">
      <div>
        <div class="p-ko" data-say="${attr(item.ko)}">${esc(item.ko)}</div>
        <div class="p-say">${esc(item.say)}</div>
      </div>
      <div class="p-btns">
        <button type="button" data-say="${attr(item.ko)}" aria-label="Play">▶️</button>
        <button type="button" data-say="${attr(item.ko)}" data-slow="1" aria-label="Play slowly">🐢</button>
        <button type="button" class="learn-btn ${learned ? 'learned' : ''}" data-learn="${attr(key)}" aria-label="I know this">✓</button>
      </div>
    </div>
    ${showPack && item.pack ? `<span class="p-pack">📦 ${esc(item.pack)}</span>` : ''}
    <div class="p-en">${esc(item.en)}</div>
    <div class="p-bis">${esc(item.bis)}</div>
    ${item.note ? `<div class="p-note">💡 ${esc(item.note)}</div>` : ''}
    ${item.casual ? `
      <button type="button" class="casual-toggle" data-casual>Casual — with close friends 👥</button>
      <div class="casual-body" hidden>
        <div class="p-ko" data-say="${attr(item.casual.ko)}">${esc(item.casual.ko)} <small>🔊</small></div>
        <div class="p-say">${esc(item.casual.say)}</div>
        <div class="p-en">${esc(item.casual.en)}</div>
        <div class="p-bis">${esc(item.casual.bis)}</div>
      </div>` : ''}
  </div>`;
}

function render() {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById('view-' + App.state.view);
  el.classList.add('active');
  switch (App.state.view) {
    case 'sounds': el.innerHTML = renderSounds(); break;
    case 'phrases': el.innerHTML = renderPhrases(); break;
    case 'products': el.innerHTML = renderProducts(); break;
    case 'hangul': el.innerHTML = renderHangul(); break;
    case 'quiz': el.innerHTML = (typeof QuizUI !== 'undefined') ? QuizUI.render() : ''; break;
  }
}

function renderSounds() {
  return `<h2>🔤 Korean Sounds</h2>
  <p class="section-note">Seven sounds to know before you speak. Tap any word to hear it.<br>
  <span class="bis">Pito ka tingog nga angay kabaloan. I-tap ang pulong aron madunggan.</span></p>
  ${APP_DATA.sounds.map(s => `
    <div class="card">
      <div class="row-title">${esc(s.title)}</div>
      <div class="p-en" style="margin-top:6px">${esc(s.tip_en)}</div>
      <div class="p-bis">${esc(s.tip_bis)}</div>
      <div>${s.examples.map(ex => `
        <button type="button" class="ex-chip" data-say="${attr(ex.ko)}">
          <span>${esc(ex.ko)} 🔊</span><span class="ex-say">${esc(ex.say)}</span>
        </button>`).join('')}
      </div>
    </div>`).join('')}`;
}

function renderPhrases() {
  const group = APP_DATA.phraseGroups.find(g => g.id === App.state.groupId);
  const seg = `
  <div class="seg">
    ${APP_DATA.phraseGroups.map(g =>
      `<button type="button" data-group="${g.id}" class="${g.id === App.state.groupId ? 'active' : ''}">${g.icon} ${esc(g.title)}</button>`).join('')}
  </div>`;

  if (!App.state.lessonId) {
    return `<h2>💬 Phrases</h2>${seg}
    ${group.lessons.map(l => {
      const learned = l.items.filter(i => App.learned.has(i.ko)).length;
      return `<button type="button" class="list-row" data-lesson="${l.id}">
        <span class="row-icon">${l.icon}</span>
        <span><span class="row-title">${esc(l.title)}</span>
        <div class="row-sub">${l.items.length} phrases · ${learned} learned${l.listenOnly ? ' · listening' : ''}</div></span>
        <span class="row-arrow">›</span>
      </button>`;
    }).join('')}`;
  }

  const lesson = group.lessons.find(l => l.id === App.state.lessonId);
  if (!lesson) { App.state.lessonId = null; return renderPhrases(); }
  return `
  <button type="button" class="back-btn" data-back>‹ All lessons</button>
  <h2>${lesson.icon} ${esc(lesson.title)}</h2>
  ${lesson.listenOnly ? `<div class="lesson-badge">👂 Listen &amp; understand — customers say this to YOU</div>` : ''}
  ${lesson.items.map(i => phraseCard(i)).join('')}`;
}

function renderProducts() {
  if (!App.state.productCat) App.state.productCat = APP_DATA.products[0].id;
  const cat = APP_DATA.products.find(c => c.id === App.state.productCat);
  return `<h2>🛒 Products</h2>
  <p class="section-note">Know the products, read the labels. 📦 shows what is printed on the package.<br>
  <span class="bis">Kabaloa sa mga produkto. Ang 📦 mao ang nakasulat sa package.</span></p>
  <div class="chips">
    ${APP_DATA.products.map(c =>
      `<button type="button" data-cat="${c.id}" class="${c.id === cat.id ? 'active' : ''}">${c.icon} ${esc(c.title)}</button>`).join('')}
  </div>
  ${cat.items.map(i => phraseCard(i, { showPack: true })).join('')}`;
}

function renderHangul() {
  const isJamo = ko => /[ㄱ-ㅣ]/.test(ko);
  return `<h2>ㄱ Hangul — read the labels</h2>
  <p class="section-note">Four small steps. You do not need perfect reading — just enough for products and labels.<br>
  <span class="bis">Upat ka gagmay nga lakang lang. Igo na aron mabasa ang mga produkto.</span></p>
  ${APP_DATA.hangul.map((st, idx) => `
    <div class="card">
      <button type="button" class="acc-head" data-acc="${st.id}">
        <span>${esc(st.title)}</span><span>▾</span>
      </button>
      <div class="acc-body" id="acc-${st.id}" ${idx === 0 ? '' : 'hidden'}>
        <p class="intro">${esc(st.intro_en)}<br><span class="bis">${esc(st.intro_bis)}</span></p>
        <div class="letter-grid">
        ${st.items.map(it => isJamo(it.ko) ? `
          <div class="letter-tile">
            <div class="lt-ko">${esc(it.ko)}</div>
            <div class="lt-say">${esc(it.say)}</div>
            <div class="lt-en">${esc(it.en)}</div>
          </div>` : '').join('')}
        </div>
        <div>
        ${st.items.filter(it => !isJamo(it.ko)).map(it => `
          <button type="button" class="ex-chip" data-say="${attr(it.ko)}">
            <span>${esc(it.ko)} 🔊</span><span class="ex-say">${esc(it.say)} — ${esc(it.en)}</span>
          </button>`).join('')}
        </div>
      </div>
    </div>`).join('')}`;
}

/* ---------- Quiz UI ---------- */

const QuizUI = {
  SESSION_LEN: 10,
  state: { mode: null, qIndex: 0, score: 0, current: null, answered: false, revealed: false, usedKo: [] },
  _pools: null,

  pools() {
    if (!QuizUI._pools) QuizUI._pools = Quiz.pools(APP_DATA);
    return QuizUI._pools;
  },

  start(mode) {
    QuizUI.state = { mode, qIndex: 0, score: 0, current: null, answered: false, revealed: false, usedKo: [] };
    QuizUI.nextQuestion();
  },

  nextQuestion() {
    const s = QuizUI.state;
    const pool = QuizUI.pools()[s.mode];
    let q = Quiz.makeQuestion(pool, Math.random);
    for (let tries = 0; tries < 20 && s.usedKo.includes(q.item.ko); tries++)
      q = Quiz.makeQuestion(pool, Math.random);
    s.usedKo.push(q.item.ko);
    s.current = q;
    s.answered = false;
    s.revealed = false;
    QuizUI.rerender();
    if (s.mode === 'listening') setTimeout(() => App.speak(q.item.ko), 250);
  },

  rerender() {
    const el = document.getElementById('view-quiz');
    if (el) el.innerHTML = QuizUI.render();
  },

  handleClick(e) {
    const mode = e.target.closest('[data-quiz-mode]');
    if (mode) { QuizUI.start(mode.dataset.quizMode); return true; }
    const exit = e.target.closest('[data-quiz-exit]');
    if (exit) { QuizUI.state.mode = null; QuizUI.rerender(); return true; }
    const ans = e.target.closest('[data-quiz-answer]');
    if (ans && !QuizUI.state.answered) {
      const s = QuizUI.state;
      s.answered = true;
      s.pickedIndex = Number(ans.dataset.quizAnswer);
      if (s.pickedIndex === s.current.answerIndex) s.score++;
      QuizUI.rerender();
      if (s.mode === 'reading') setTimeout(() => App.speak(s.current.item.ko), 250);
      return true;
    }
    const reveal = e.target.closest('[data-quiz-reveal]');
    if (reveal) {
      QuizUI.state.revealed = true;
      QuizUI.rerender();
      setTimeout(() => App.speak(QuizUI.state.current.item.ko), 200);
      return true;
    }
    const self = e.target.closest('[data-quiz-self]');
    if (self) {
      if (self.dataset.quizSelf === '1') QuizUI.state.score++;
      QuizUI.advance();
      return true;
    }
    const next = e.target.closest('[data-quiz-next]');
    if (next) { QuizUI.advance(); return true; }
    return false;
  },

  advance() {
    const s = QuizUI.state;
    s.qIndex++;
    if (s.qIndex >= QuizUI.SESSION_LEN) { s.current = null; QuizUI.rerender(); }
    else QuizUI.nextQuestion();
  },

  render() {
    const s = QuizUI.state;
    if (!s.mode) {
      return `<h2>🎯 Quiz</h2>
      <p class="section-note">10 questions per round. Pick a mode.<br><span class="bis">10 ka pangutana kada round. Pili og mode.</span></p>
      <div class="quiz-modes">
        <button type="button" class="quiz-mode-btn" data-quiz-mode="listening">
          <div class="qm-title">👂 Listening</div>
          <div class="qm-sub">Hear Korean, pick the meaning · Paminawa, pilia ang pasabot</div>
        </button>
        <button type="button" class="quiz-mode-btn" data-quiz-mode="speaking">
          <div class="qm-title">🗣 Speaking</div>
          <div class="qm-sub">Say it in Korean, then check · Isulti sa Korean, dayon i-check</div>
        </button>
        <button type="button" class="quiz-mode-btn" data-quiz-mode="reading">
          <div class="qm-title">🏷 Label Reading</div>
          <div class="qm-sub">Read Hangul labels, pick the meaning · Basaha ang Hangul</div>
        </button>
      </div>`;
    }
    if (!s.current) {
      const great = s.score >= 8;
      return `<div class="quiz-result card">
        <div>${great ? '🎉' : '💪'}</div>
        <div class="qr-score">${s.score} / ${QuizUI.SESSION_LEN}</div>
        <p class="section-note">${great ? 'Great job! · Maayo kaayo!' : 'Keep going! · Padayon lang!'}</p>
        <button type="button" class="quiz-primary" data-quiz-mode="${s.mode}">Try again 🔁</button>
        <button type="button" class="quiz-next" style="background:var(--chip);color:var(--ink)" data-quiz-exit>All modes</button>
      </div>`;
    }

    const q = s.current;
    const head = `
      <button type="button" class="back-btn" data-quiz-exit>‹ Quiz modes</button>
      <div class="quiz-progress">Question ${s.qIndex + 1} / ${QuizUI.SESSION_LEN} · Score ${s.score}</div>`;

    const choices = show => `
      <div class="quiz-choices">
        ${q.choices.map((c, i) => {
          let cls = '';
          if (show) {
            if (i === q.answerIndex) cls = 'correct';
            else if (i === s.pickedIndex) cls = 'wrong';
          }
          return `<button type="button" class="quiz-choice ${cls}" data-quiz-answer="${i}">
            ${esc(c.en)}<span class="qc-bis">${esc(c.bis)}</span>
          </button>`;
        }).join('')}
      </div>
      ${show ? `<button type="button" class="quiz-next" data-quiz-next>Next ›</button>` : ''}`;

    if (s.mode === 'listening') {
      return `${head}
      <div class="card">
        <div class="quiz-prompt">
          ${s.answered ? `<div class="qp-ko">${esc(q.item.ko)}</div><div class="qp-say">${esc(q.item.say)}</div>`
                       : `<div class="qp-ko">🔊</div><div class="qp-say">Listen…</div>`}
        </div>
        <div class="quiz-audio-btns">
          <button type="button" data-say="${attr(q.item.ko)}">🔁 Again</button>
          <button type="button" data-say="${attr(q.item.ko)}" data-slow="1">🐢 Slow</button>
        </div>
        ${choices(s.answered)}
      </div>`;
    }

    if (s.mode === 'reading') {
      return `${head}
      <div class="card">
        <div class="quiz-prompt">
          <div class="qp-ko">${esc(q.item.ko)}</div>
          ${s.answered ? `<div class="qp-say">${esc(q.item.say)}</div>` : ''}
        </div>
        ${s.answered ? `<div class="quiz-audio-btns"><button type="button" data-say="${attr(q.item.ko)}">🔊 Hear it</button></div>` : ''}
        ${choices(s.answered)}
      </div>`;
    }

    // speaking
    return `${head}
    <div class="card">
      <div class="quiz-prompt">
        <div class="qp-en">${esc(q.item.en)}</div>
        <div class="qp-bis">${esc(q.item.bis)}</div>
        ${q.item.note ? `<div class="p-note">💡 ${esc(q.item.note)}</div>` : ''}
      </div>
      ${!s.revealed
        ? `<p class="section-note" style="text-align:center">Say it out loud in Korean, then check.<br><span class="bis">Isulti og kusog sa Korean, dayon i-check.</span></p>
           <button type="button" class="quiz-primary" data-quiz-reveal>Show answer 🔊</button>`
        : `<div class="quiz-prompt">
             <div class="qp-ko">${esc(q.item.ko)}</div>
             <div class="qp-say">${esc(q.item.say)}</div>
           </div>
           <div class="quiz-audio-btns">
             <button type="button" data-say="${attr(q.item.ko)}">🔁 Again</button>
             <button type="button" data-say="${attr(q.item.ko)}" data-slow="1">🐢 Slow</button>
           </div>
           <div class="quiz-self">
             <button type="button" class="self-yes" data-quiz-self="1">I said it right 👍</button>
             <button type="button" class="self-no" data-quiz-self="0">Not yet 👎</button>
           </div>`}
    </div>`;
  },
};

/* ---------- PDF ---------- */

function downloadPdf() {
  const b64 = document.getElementById('pdf-data').textContent.trim();
  if (!b64 || b64.startsWith('__PDF')) return;
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'mart-korean-cheatsheet.pdf' });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

document.addEventListener('DOMContentLoaded', App.init);
