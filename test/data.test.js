const test = require('node:test');
const assert = require('node:assert');
const DATA = require('../src/data.js');

const allPhrases = () => DATA.phraseGroups.flatMap(g => g.lessons.flatMap(l => l.items));
const allProducts = () => DATA.products.flatMap(c => c.items);

test('phrase items have ko/say/en/bis, non-empty', () => {
  for (const p of allPhrases())
    for (const k of ['ko', 'say', 'en', 'bis'])
      assert.ok(typeof p[k] === 'string' && p[k].trim(), `${p.ko || '??'} missing ${k}`);
});

test('product items have ko/say/en/bis, non-empty', () => {
  for (const p of allProducts())
    for (const k of ['ko', 'say', 'en', 'bis'])
      assert.ok(typeof p[k] === 'string' && p[k].trim(), `${p.ko || '??'} missing ${k}`);
});

test('volume targets met', () => {
  const mart = DATA.phraseGroups.find(g => g.id === 'mart');
  const daily = DATA.phraseGroups.find(g => g.id === 'daily');
  assert.ok(mart.lessons.flatMap(l => l.items).length >= 75, 'mart >= 75');
  assert.ok(daily.lessons.flatMap(l => l.items).length >= 55, 'daily >= 55');
  assert.ok(allProducts().length >= 85, 'products >= 85');
  assert.equal(DATA.products.length, 8);
  assert.equal(mart.lessons.length, 7);
  assert.equal(daily.lessons.length, 5);
});

test('products have pack romanization', () => {
  for (const p of allProducts()) assert.ok(p.pack && p.pack.trim(), p.ko);
});

test('no standard-RR vowels (eo/eu-as-vowel) in phrase say fields', () => {
  // "eo" never appears in our respelling; "eu" is allowed only as the ㅡ sound we chose.
  for (const p of allPhrases()) assert.ok(!/eo/.test(p.say), `${p.ko}: ${p.say}`);
});

test('customers lesson is listen-only with enough items', () => {
  const l = DATA.phraseGroups.find(g => g.id === 'mart').lessons.find(l => l.id === 'customers');
  assert.ok(l.listenOnly === true);
  assert.ok(l.items.length >= 12);
});

test('daily group has casual variants', () => {
  const daily = DATA.phraseGroups.find(g => g.id === 'daily');
  const casuals = daily.lessons.flatMap(l => l.items).filter(p => p.casual);
  assert.ok(casuals.length >= 5, `got ${casuals.length}`);
  for (const p of casuals)
    for (const k of ['ko', 'say', 'en', 'bis'])
      assert.ok(p.casual[k] && p.casual[k].trim(), `${p.ko} casual missing ${k}`);
});

test('hangul has 4 stages, label words complete', () => {
  assert.equal(DATA.hangul.length, 4);
  assert.ok(DATA.hangul[3].items.length >= 12);
  for (const w of DATA.hangul[3].items)
    for (const k of ['ko', 'say', 'en', 'bis'])
      assert.ok(w[k] && w[k].trim(), `label ${w.ko} missing ${k}`);
});

test('sounds course has 7 sections with bis tips and examples', () => {
  assert.equal(DATA.sounds.length, 7);
  for (const s of DATA.sounds) {
    assert.ok(s.title && s.tip_en && s.tip_bis, s.id);
    assert.ok(Array.isArray(s.examples) && s.examples.length >= 1, s.id);
  }
});

test('lessons have id/title/icon', () => {
  for (const g of DATA.phraseGroups) {
    assert.ok(g.id && g.title);
    for (const l of g.lessons) assert.ok(l.id && l.title && l.icon, l.id);
  }
  for (const c of DATA.products) assert.ok(c.id && c.title && c.icon, c.id);
});
