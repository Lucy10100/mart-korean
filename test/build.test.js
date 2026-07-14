const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '../dist/index.html');

test('dist is self-contained', () => {
  const html = fs.readFileSync(distPath, 'utf8');
  assert.ok(!/(src|href)=["']https?:/.test(html), 'no external URLs');
  assert.ok(!/<script src=/.test(html), 'scripts inlined');
  assert.ok(!/<link[^>]+stylesheet/.test(html), 'styles inlined');
  assert.ok(!html.includes('__PDF_BASE64__'), 'pdf embedded');
  assert.ok(html.includes('speechSynthesis'), 'tts code present');
  assert.ok(html.length > 200000, `size ${html.length}`);
});
