// Generates assets/cheatsheet.pdf from APP_DATA via headless Chrome.
// Run: npm run pdf

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const DATA = require('../src/data.js');

const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function phraseRows(items) {
  return items.map(i => `
    <tr><td class="ko">${esc(i.ko)}</td><td class="say">${esc(i.say)}</td>
    <td>${esc(i.en)}<br><i>${esc(i.bis)}</i></td></tr>`).join('');
}

function buildHtml(data) {
  const mart = data.phraseGroups.find(g => g.id === 'mart');
  const daily = data.phraseGroups.find(g => g.id === 'daily');

  const phraseSection = (group) => group.lessons.map(l => `
    <table>
      <caption>${l.icon} ${esc(l.title)}${l.listenOnly ? ' — customers say this to YOU' : ''}</caption>
      <thead><tr><th>Korean</th><th>Say it</th><th>Meaning (EN / Bisaya)</th></tr></thead>
      <tbody>${phraseRows(l.items)}</tbody>
    </table>`).join('');

  const productSection = data.products.map(c => `
    <table>
      <caption>${c.icon} ${esc(c.title)}</caption>
      <thead><tr><th>Korean</th><th>On the package</th><th>Say it</th><th>What it is</th></tr></thead>
      <tbody>${c.items.map(i => `
        <tr><td class="ko">${esc(i.ko)}</td><td>${esc(i.pack)}</td>
        <td class="say">${esc(i.say)}</td><td>${esc(i.en)}<br><i>${esc(i.bis)}</i></td></tr>`).join('')}
      </tbody>
    </table>`).join('');

  const hangulLetters = data.hangul.slice(0, 3).map(st => `
    <table>
      <caption>${esc(st.title)}</caption>
      <tbody>${chunk(st.items, 4).map(row => `
        <tr>${row.map(it => `<td><span class="ko">${esc(it.ko)}</span> <span class="say">${esc(it.say)}</span><br><small>${esc(it.en)}</small></td>`).join('')}
        ${'<td></td>'.repeat(4 - row.length)}</tr>`).join('')}
      </tbody>
    </table>`).join('');

  const labels = `
    <table>
      <caption>🏷 ${esc(data.hangul[3].title)}</caption>
      <thead><tr><th>Korean</th><th>Say it</th><th>Meaning (EN / Bisaya)</th></tr></thead>
      <tbody>${phraseRows(data.hangul[3].items)}</tbody>
    </table>`;

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 14mm 12mm; }
    body { font-family: 'Apple SD Gothic Neo', -apple-system, sans-serif; font-size: 9.5pt; color: #111; }
    h1 { font-size: 16pt; margin: 0 0 2mm; }
    .sub { color: #555; margin: 0 0 6mm; }
    h2 { font-size: 12pt; margin: 6mm 0 2mm; border-bottom: 2px solid #d64533; padding-bottom: 1mm; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 4mm; page-break-inside: avoid; }
    caption { text-align: left; font-weight: 700; font-size: 10.5pt; padding: 2mm 0 1mm; }
    th { text-align: left; background: #f3f1ea; padding: 1.2mm 2mm; font-size: 8.5pt; border: 0.3pt solid #bbb; }
    td { padding: 1.2mm 2mm; border: 0.3pt solid #bbb; vertical-align: top; }
    td.ko, span.ko { font-weight: 700; font-size: 10.5pt; }
    td.say, span.say { color: #0a7d55; font-family: Menlo, monospace; font-size: 8pt; }
    i { color: #555; }
    small { color: #555; font-size: 7.5pt; }
  </style></head><body>
    <h1>🛒 Mart Korean — Cheat Sheet</h1>
    <p class="sub">Green text = how to say it. Italic = Bisaya. Keep this by the counter!</p>
    <h2>1. At the Mart</h2>${phraseSection(mart)}
    <h2>2. Daily Life</h2>${phraseSection(daily)}
    <h2>3. Products</h2>${productSection}
    <h2>4. Hangul</h2>${hangulLetters}${labels}
  </body></html>`;
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

const html = buildHtml(DATA);
const tmp = path.join(__dirname, '_cheatsheet.html');
fs.writeFileSync(tmp, html);
const outDir = path.join(__dirname, '../assets');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'cheatsheet.pdf');
execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${out}`, tmp],
  { stdio: 'pipe' });
fs.unlinkSync(tmp);
console.log('PDF written:', fs.statSync(out).size, 'bytes');
