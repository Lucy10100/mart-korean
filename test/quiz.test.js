const test = require('node:test');
const assert = require('node:assert');
const DATA = require('../src/data.js');
const Quiz = require('../src/quiz.js');

test('pools split correctly', () => {
  const p = Quiz.pools(DATA);
  assert.ok(p.listening.length >= 130, `listening ${p.listening.length}`);
  assert.ok(p.speaking.length >= 110, `speaking ${p.speaking.length}`);
  assert.ok(p.reading.length >= 95, `reading ${p.reading.length}`);
  assert.ok(p.speaking.every(i => !i._listenOnly));
});

test('makeQuestion: 4 unique choices including the answer', () => {
  const p = Quiz.pools(DATA);
  const rng = Quiz.makeRng(42);
  for (let i = 0; i < 200; i++) {
    const q = Quiz.makeQuestion(p.listening, rng);
    assert.equal(q.choices.length, 4);
    assert.equal(new Set(q.choices.map(c => c.en)).size, 4);
    assert.equal(q.choices[q.answerIndex].en, q.item.en);
    assert.ok(q.choices.every(c => c.en && c.bis));
  }
});

test('makeQuestion works on the reading pool too', () => {
  const p = Quiz.pools(DATA);
  const rng = Quiz.makeRng(7);
  for (let i = 0; i < 100; i++) {
    const q = Quiz.makeQuestion(p.reading, rng);
    assert.equal(new Set(q.choices.map(c => c.en)).size, 4);
  }
});

test('recordScore tracks best, recent (max 5), and play count per mode', () => {
  let stats = {};
  stats = Quiz.recordScore(stats, 'listening', 6);
  stats = Quiz.recordScore(stats, 'listening', 9);
  stats = Quiz.recordScore(stats, 'listening', 4);
  assert.equal(stats.listening.best, 9);
  assert.equal(stats.listening.plays, 3);
  assert.deepEqual(stats.listening.recent, [4, 9, 6]);
  for (let i = 0; i < 10; i++) stats = Quiz.recordScore(stats, 'listening', i);
  assert.equal(stats.listening.recent.length, 5);
  assert.equal(stats.listening.best, 9);
  stats = Quiz.recordScore(stats, 'reading', 10);
  assert.equal(stats.reading.best, 10);
  assert.equal(stats.listening.plays, 13);
});

test('recordScore tolerates corrupt input', () => {
  const s = Quiz.recordScore(null, 'speaking', 7);
  assert.equal(s.speaking.best, 7);
  assert.equal(s.speaking.plays, 1);
});

test('makeRng is deterministic', () => {
  const a = Quiz.makeRng(7), b = Quiz.makeRng(7);
  assert.equal(a(), b());
  assert.equal(a(), b());
  const v = Quiz.makeRng(1)();
  assert.ok(v >= 0 && v < 1);
});
