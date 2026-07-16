// Pure quiz logic — no DOM. Shared by the app UI and tests.

const Quiz = {
  // Deterministic rng (mulberry32) so tests can pin a seed.
  makeRng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  pools(data) {
    const phrases = [];
    for (const g of data.phraseGroups)
      for (const l of g.lessons)
        for (const it of l.items)
          phrases.push({ ...it, _listenOnly: !!l.listenOnly });
    const reading = [
      ...data.products.flatMap(c => c.items),
      ...data.hangul[3].items,
    ];
    return {
      listening: phrases,
      speaking: phrases.filter(p => !p._listenOnly),
      reading,
    };
  },

  // Pure score-history update: { [mode]: { best, recent (newest first, max 5), plays } }
  recordScore(stats, mode, score) {
    const s = stats && typeof stats === 'object' ? { ...stats } : {};
    const prev = s[mode] && typeof s[mode] === 'object' ? s[mode] : { best: 0, recent: [], plays: 0 };
    s[mode] = {
      best: Math.max(prev.best || 0, score),
      recent: [score, ...(Array.isArray(prev.recent) ? prev.recent : [])].slice(0, 5),
      plays: (prev.plays || 0) + 1,
    };
    return s;
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
      const j = Math.floor(rng() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    return { item, choices, answerIndex: choices.findIndex(c => c.en === item.en) };
  },
};

if (typeof module !== 'undefined') module.exports = Quiz;
