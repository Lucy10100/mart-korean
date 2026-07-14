// Builds dist/index.html — a single self-contained file:
// inlines styles.css + data.js + quiz.js + app.js and embeds the cheatsheet PDF as base64.
// Run: npm run build  (needs assets/cheatsheet.pdf — run `npm run pdf` first)

const fs = require('fs');
const path = require('path');

const src = p => fs.readFileSync(path.join(__dirname, '../src', p), 'utf8');

let html = src('index.html');
const css = src('styles.css');
const pdfPath = path.join(__dirname, '../assets/cheatsheet.pdf');
const pdfB64 = fs.readFileSync(pdfPath).toString('base64');

// replace() with a function to avoid `$` being treated as a pattern in file contents
html = html.replace('<link rel="stylesheet" href="styles.css">', () => `<style>\n${css}\n</style>`);
for (const js of ['data.js', 'quiz.js', 'app.js'])
  html = html.replace(`<script src="${js}"></script>`, () => `<script>\n${src(js)}\n</script>`);
html = html.replace('__PDF_BASE64__', () => pdfB64);

for (const leftover of ['<link rel="stylesheet"', '<script src=', '__PDF_BASE64__'])
  if (html.includes(leftover)) throw new Error(`build incomplete: ${leftover} still present`);

const outDir = path.join(__dirname, '../dist');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'index.html');
fs.writeFileSync(out, html);
console.log(`dist/index.html written (${Math.round(html.length / 1024)} KB)`);

// Optional version snapshot: `npm run build -- 0.5x` also writes dist/index.0.5x.html.
// Snapshots are identical, fully self-contained copies — safe to share on their own.
const version = process.argv[2];
if (version) {
  const snap = path.join(outDir, `index.${version}.html`);
  fs.writeFileSync(snap, html);
  console.log(`dist/index.${version}.html written (version snapshot)`);
}

// Artifact variant: same app without the document shell (the artifact host provides
// doctype/head/body), with a <title> so the tab is named.
const bodyInner = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
const styleStart = html.indexOf('<style>');
const styleBlock = html.slice(styleStart, html.indexOf('</style>') + 8);
const artifact = `<title>Mart Korean</title>\n${styleBlock}\n${bodyInner}`;
fs.writeFileSync(path.join(outDir, 'artifact.html'), artifact);
console.log(`dist/artifact.html written (${Math.round(artifact.length / 1024)} KB)`);
