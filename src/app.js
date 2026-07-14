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
    u.rate = opts.slow ? 0.7 : 0.95;
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
