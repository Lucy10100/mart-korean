// End-to-end smoke drive of dist/index.html in headless Chrome.
// Run: node tools/smoke.js   — prints PASS/FAIL lines, saves screenshots to SHOTS dir.

const path = require('path');
const puppeteer = require('puppeteer-core');

const SHOTS = process.env.SHOTS || path.join(__dirname, '../dist');
const results = [];
const check = (name, ok, extra = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${extra ? ' — ' + extra : ''}`);
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 820, height: 1180 }); // iPad portrait
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('file://' + path.join(__dirname, '../dist/index.html'), { waitUntil: 'load' });

  // 1. start overlay → main
  await page.click('#start-btn');
  const overlayGone = await page.$eval('#start-overlay', el => el.style.display === 'none');
  check('start overlay dismissed', overlayGone);

  // 2. phrases view: lesson rows for mart group
  const lessonRows = await page.$$eval('#view-phrases .list-row', els => els.length);
  check('phrases lesson list renders', lessonRows === 7, `${lessonRows} rows`);
  await page.screenshot({ path: path.join(SHOTS, 'shot-phrases.png') });

  // 3. open a lesson → phrase cards
  await page.click('#view-phrases .list-row');
  const cards = await page.$$eval('#view-phrases .p-card', els => els.length);
  check('lesson opens with phrase cards', cards >= 10, `${cards} cards`);
  await page.screenshot({ path: path.join(SHOTS, 'shot-lesson.png') });

  // 4. learn toggle updates counter
  const before = await page.$eval('#learned-count', el => el.textContent);
  await page.click('#view-phrases .learn-btn');
  const after = await page.$eval('#learned-count', el => el.textContent);
  check('learn toggle updates counter', before !== after, `${before} → ${after}`);

  // 5. daily group toggle
  await page.click('[data-back]');
  await page.click('[data-group="daily"]');
  const dailyRows = await page.$$eval('#view-phrases .list-row', els => els.length);
  check('daily group shows 5 lessons', dailyRows === 5, `${dailyRows} rows`);

  // 6. products tab
  await page.click('#tabbar [data-view="products"]');
  const chips = await page.$$eval('#view-products .chips button', els => els.length);
  const prodCards = await page.$$eval('#view-products .p-card', els => els.length);
  check('products tab renders', chips === 8 && prodCards >= 10, `${chips} chips, ${prodCards} cards`);
  await page.click('#view-products .chips button:nth-child(2)');
  const packShown = await page.$eval('#view-products .p-pack', el => el.textContent.length > 3);
  check('category switch + pack label', packShown);
  await page.screenshot({ path: path.join(SHOTS, 'shot-products.png') });

  // 7. sounds & hangul tabs
  await page.click('#tabbar [data-view="sounds"]');
  const soundCards = await page.$$eval('#view-sounds .card', els => els.length);
  check('sounds tab renders 7 sections', soundCards === 7, `${soundCards}`);
  await page.click('#tabbar [data-view="hangul"]');
  const tiles = await page.$$eval('#view-hangul .letter-tile', els => els.length);
  check('hangul letter tiles render', tiles >= 30, `${tiles} tiles`);
  await page.screenshot({ path: path.join(SHOTS, 'shot-hangul.png') });

  // 8. quiz: full listening session
  await page.click('#tabbar [data-view="quiz"]');
  await page.click('[data-quiz-mode="listening"]');
  for (let i = 0; i < 10; i++) {
    await page.waitForSelector('.quiz-choice');
    if (i === 0) await page.screenshot({ path: path.join(SHOTS, 'shot-quiz.png') });
    await page.click('.quiz-choice');
    await page.waitForSelector('.quiz-next');
    if (i === 0) {
      const marked = await page.$$eval('.quiz-choice.correct', els => els.length);
      check('quiz marks the correct answer', marked === 1);
    }
    await page.click('.quiz-next');
  }
  const result = await page.$eval('.qr-score', el => el.textContent);
  check('quiz session reaches result screen', /\/ 10/.test(result), result.trim());

  // 9. speaking mode reveal flow
  await page.click('[data-quiz-exit]');
  await page.waitForSelector('[data-quiz-mode="speaking"]');
  await page.click('[data-quiz-mode="speaking"]');
  await page.waitForSelector('[data-quiz-reveal]');
  await page.click('[data-quiz-reveal]');
  const selfBtns = await page.$$eval('.quiz-self button', els => els.length);
  check('speaking reveal shows self-eval', selfBtns === 2);

  // 10. PDF button enabled + payload sane
  const pdfOk = await page.evaluate(() => {
    const b = document.getElementById('pdf-btn');
    const d = document.getElementById('pdf-data').textContent.trim();
    return !b.disabled && d.length > 500000 && !d.startsWith('__PDF');
  });
  check('PDF button enabled with embedded payload', pdfOk);

  // 11. no JS errors anywhere in the run
  check('no console/page errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  await browser.close();
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('SMOKE CRASH:', e); process.exit(1); });
