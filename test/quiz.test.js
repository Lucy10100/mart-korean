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

test('makeRng is deterministic', () => {
  const a = Quiz.makeRng(7), b = Quiz.makeRng(7);
  assert.equal(a(), b());
  assert.equal(a(), b());
  const v = Quiz.makeRng(1)();
  assert.ok(v >= 0 && v < 1);
});
