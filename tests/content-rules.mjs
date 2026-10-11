// Shared content rules for the node tests (not a test file itself).
import assert from 'node:assert/strict';
/** Length of rich text as read: tags dropped, TeX commands counted as one character. */
export const visibleLength = t => String(t).replace(/<[^>]+>/g, '').replace(/\\[a-zA-Z]+/g, 'x').replace(/[{}$^_]/g, '').length;
/** Sentences in rich text (a period, ! or ? followed by a space and a capital letter, outside $...$). */
export const sentenceCount = t => String(t).replace(/\$[^$]*\$/g, 'x').replace(/\b(e\.g|i\.e|etc|vs|cf)\./gi, 'x').split(/[.!?]\s+(?=[A-Z])/).filter(x => x.trim()).length;
/** The summary format of ARCHITECTURE.md ("Summaries"). */
export function checkSummary(t, where) {
  assert.equal(typeof t, 'string', `${where} must be a string`);
  const n = sentenceCount(t), len = visibleLength(t);
  assert.ok(n >= 1 && n <= 3, `${where}: 1-3 sentences (found ${n})`);
  assert.ok(len >= 100 && len <= 330, `${where}: about 150-300 characters (found ${len})`);
}
