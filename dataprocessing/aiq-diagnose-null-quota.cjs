const fs = require('fs');
const path = require('path');

// Diagnostic only — does not modify anything. Reads your compiled AIQ output,
// finds every record where quota came out null, and prints the unique
// unparsed "collegeName" strings (which, for null-quota rows, actually still
// contain the un-split quota+institute text glued together). Share this
// output so the quota regex/pattern list can be corrected to match reality.

const INPUT_FILE = path.join(__dirname, 'aiq_staging_output', 'aiq_mbbs_bds_compiled.json');

const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
const nullQuotaRows = data.filter((r) => r.quota === null);

console.log(`Total records: ${data.length}`);
console.log(`Null-quota records: ${nullQuotaRows.length}\n`);

// Unique unparsed text strings (deduplicated) — this is what needs new patterns
const uniqueTexts = [...new Set(nullQuotaRows.map((r) => r.collegeName))];

console.log(`Unique unparsed quota+institute strings: ${uniqueTexts.length}\n`);
console.log('--- Sample (first 40, sorted) ---\n');
uniqueTexts.sort().slice(0, 40).forEach((t, i) => {
  console.log(`${i + 1}. ${t}`);
});

// Also write the full unique list to a file since there may be more than fits comfortably in a terminal
const outFile = path.join(__dirname, 'aiq_staging_output', 'null_quota_unique_strings.txt');
fs.writeFileSync(outFile, uniqueTexts.sort().join('\n'), 'utf8');
console.log(`\n📝 Full list of ${uniqueTexts.length} unique strings written to:\n${outFile}`);