const fs = require('fs');
const path = require('path');

// Finds every occurrence of a target rank (as a whole number, not a substring
// of a longer number) in the raw AIQ source text, and prints the surrounding
// context so we can see exactly how that row (and the row before it) is
// formatted in the original extracted text.

const TARGET_RANK = '10132'; // change this if you want to inspect a different rank
const SOURCE_FILE = path.join(__dirname, 'aiq_source', '2025', 'aiq_r3.txt');
const CONTEXT_CHARS = 400; // characters to show before and after each match

const text = fs.readFileSync(SOURCE_FILE, 'utf8');

// Match the rank only when it's a standalone number (whitespace or start/end on both sides),
// not when it's part of a longer number like "1013200" or "101321".
const pattern = new RegExp(`(?<![\\d])${TARGET_RANK}(?![\\d])`, 'g');

let match;
let matchCount = 0;
const matches = [];
while ((match = pattern.exec(text)) !== null) {
  matchCount++;
  const start = Math.max(0, match.index - CONTEXT_CHARS);
  const end = Math.min(text.length, match.index + TARGET_RANK.length + CONTEXT_CHARS);
  matches.push({ index: match.index, context: text.slice(start, end) });
}

console.log(`Found ${matchCount} standalone occurrence(s) of "${TARGET_RANK}" in ${SOURCE_FILE}\n`);

matches.forEach((m, i) => {
  console.log(`\n========== MATCH ${i + 1} (char position ${m.index}) ==========`);
  console.log(m.context);
  console.log(`========== END MATCH ${i + 1} ==========\n`);
});

if (matchCount === 0) {
  console.log('No matches found — try a different TARGET_RANK value at the top of this script.');
}