const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Converts your aggregated AIQ cutoffs into the same record shape your
// Dashboard.jsx already expects from compiled_allotments.json — so the
// existing Explore/Predictor logic can work with AIQ records with minimal
// special-casing.

const INPUT_FILE = path.join(__dirname, 'aiq_staging_output', 'aiq_cutoffs_compiled.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'data', 'aiq_compiled_allotments.json');

function deriveStream(course) {
  if (course === 'MBBS') return 'MEDICAL';
  if (course === 'BDS') return 'DENTAL';
  return 'MEDICAL'; // fallback, shouldn't happen given your data only has MBBS/BDS
}

// AIQ has no official college codes like KEA's M001MG — generate a short,
// stable synthetic one from the college name so existing UI code that keys
// off collegeCode (star/save, option-entry list, detail modal grouping)
// keeps working without changes.
function makeSyntheticCode(collegeName) {
  const hash = crypto.createHash('md5').update(collegeName).digest('hex').slice(0, 6).toUpperCase();
  return `AIQ-${hash}`;
}

function transform() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Input not found: ${INPUT_FILE}. Run aiq-aggregate-cutoffs.cjs first.`);
    process.exit(1);
  }

  const cutoffs = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  console.log(`📥 Loaded ${cutoffs.length} AIQ cutoff groups`);

  const transformed = cutoffs.map((c) => ({
    year: c.year,
    stream: deriveStream(c.course),
    round: 'FINAL', // this dataset represents the final Round-3 consolidated state, not a specific round
    collegeCode: makeSyntheticCode(c.collegeName),
    collegeName: c.collegeName,
    courseDetails: c.course,
    category: c.category, // will literally be the string "UNKNOWN" when not recorded — app will label this
    fees: null, // AIQ allotment lists don't publish fees — app must handle null gracefully
    rank: c.cutoffRank,
    quota: c.quota, // AIQ-only field, not present in KEA data
    seatCount: c.seatCount,
    dataset: 'AIQ',
  }));

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(transformed), 'utf8');

  console.log(`\n🎉 Written ${transformed.length} app-ready AIQ records to:\n${OUTPUT_FILE}`);
  console.log(`\n🔍 Sample (first 2):`);
  console.log(JSON.stringify(transformed.slice(0, 2), null, 2));
}

transform();