// Unit tests for the DOM-free text helpers in core/ui.js (the summary fallback of the page head).
import test from 'node:test';
import assert from 'node:assert/strict';
import { firstSentence, sentences, leadSentences, splitFormula, splitTexLines } from '../assets/js/core/ui.js';

test('firstSentence ignores periods inside TeX and abbreviations', () => {
  assert.equal(firstSentence('The mean is $\\mu = 1.5$ here, e.g. for counts. Next.'), 'The mean is $\\mu = 1.5$ here, e.g. for counts.');
});

test('sentences splits rich text into sentences', () => {
  assert.deepEqual(sentences('One $x.y$ two. Three? Four!'), ['One $x.y$ two.', 'Three?', 'Four!']);
});

test('leadSentences: first sentence, plus the second when both fit in 300 characters', () => {
  const a = 'A short first sentence about $\\lambda$.';
  const b = 'A second sentence that adds the parameters.';
  const c = 'A third one that is never used.';
  assert.equal(leadSentences(`${a} ${b} ${c}`), `${a} ${b}`);
  const long = 'x'.repeat(200) + '.';
  assert.equal(leadSentences(`${long} ${b}`), long);
  assert.equal(leadSentences(`${a} ${'y'.repeat(290)}.`), a);
  assert.equal(leadSentences(''), '');
});

test('splitFormula splits a display formula at top-level wide spaces, and at "=" when asked', () => {
  assert.deepEqual(splitFormula('P(X = k) = p^{k} (1 - p)^{1 - k}, \\qquad k \\in \\{0, 1\\}'),
    ['P(X = k) = p^{k} (1 - p)^{1 - k},', 'k \\in \\{0, 1\\}']);
  // nothing to split: one piece
  assert.deepEqual(splitFormula('F(x) = 1 - e^{-\\lambda x}'), ['F(x) = 1 - e^{-\\lambda x}']);
  // "=" inside parentheses, braces and environments is not a split point; the first "=" stays on line 1
  assert.deepEqual(splitFormula('F(x) = P(X \\le x) = \\sum_{k=0}^{n} p_k', true), ['F(x) = P(X \\le x)', '= \\sum_{k=0}^{n} p_k']);
  assert.deepEqual(splitFormula('F = \\begin{cases} 0, & x < a \\\\ 1, & x \\ge a \\end{cases}', true), ['F = \\begin{cases} 0, & x < a \\\\ 1, & x \\ge a \\end{cases}']);
  // a \quad inside \left( ... \right) is not a split point
  assert.deepEqual(splitFormula('f = \\left(a \\quad b\\right)'), ['f = \\left(a \\quad b\\right)']);
});

test('splitTexLines splits relationship statements at sentence breaks', () => {
  assert.deepEqual(splitTexLines('A = B.\\ \\text{Then } C = D.'), ['A = B.', '\\text{Then } C = D.']);
});
