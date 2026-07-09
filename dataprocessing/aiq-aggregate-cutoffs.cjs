const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, 'aiq_staging_output', 'aiq_mbbs_bds_compiled.json');
const OUTPUT_FILE = path.join(__dirname, 'aiq_staging_output', 'aiq_cutoffs_compiled.json');

// Confirmed remark classification (verified against real AIQ data):
//
// HOLDING the seat (candidate genuinely occupies it — counts toward cutoff):
//   - "Reported"                          -> candidate is there
//   - "Upgraded"                          -> got moved to a better seat, holds the new one
//   - "No Upgradation"                    -> kept their existing seat, no change
//   - "Did not opt for Upgradation."      -> satisfied with allotted college, keeps it
//   - "Fresh Allotted in Xth Round"       -> newly given a seat this round, holds it
//
// NOT HOLDING the seat (must be excluded, or cutoffs get inflated):
//   - "Not Reported"                      -> never reported to claim it
//   - "Not Allotted."                     -> no seat was ever allotted to this rank
//   - "Seat Surrendered"                  -> gave up the seat for their own reasons
//   - "Did not fill up fresh choices."    -> never submitted fresh choices, no seat
const NON_HOLDING_REMARK_PATTERNS = [
  /not\s+reported/i,
  /not\s+allotted/i,
  /seat\s+surrendered/i,
  /did\s+not\s+fill\s+up\s+fresh\s+choices/i,
];

function isHoldingRemark(remark) {
  if (!remark) return true;
  return !NON_HOLDING_REMARK_PATTERNS.some((pat) => pat.test(remark));
}

function aggregateCutoffs() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Input not found: ${INPUT_FILE}. Run aiq-mbbs-bds-compile.cjs first.`);
    process.exit(1);
  }

  const rows = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  console.log(`📥 Loaded ${rows.length} raw candidate rows`);

  let excludedNonHolding = 0;
  let excludedMissingFields = 0;
  let missingCategoryCount = 0;

  const groups = new Map();

  rows.forEach((row) => {
    if (!row.collegeName || !row.course) {
      excludedMissingFields++;
      return;
    }
    if (!isHoldingRemark(row.remark)) {
      excludedNonHolding++;
      return;
    }
    if (!row.allottedCategory) {
      missingCategoryCount++;
    }

    const category = row.allottedCategory || 'UNKNOWN';
    const quota = row.quota || 'UNKNOWN';
    const key = `${row.collegeName}|${row.course}|${category}|${quota}|${row.year}`;

    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        collegeName: row.collegeName,
        course: row.course,
        category,
        quota,
        year: row.year,
        stream: row.stream,
        dataset: row.dataset,
        cutoffRank: row.rank,
        seatCount: 1,
      });
    } else {
      if (row.rank > existing.cutoffRank) existing.cutoffRank = row.rank;
      existing.seatCount += 1;
    }
  });

  const cutoffs = Array.from(groups.values()).sort((a, b) => a.cutoffRank - b.cutoffRank);

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cutoffs), 'utf8');

  console.log(`\n📊 Aggregation summary:`);
  console.log(`   Unique (college+course+category+quota) cutoff groups: ${cutoffs.length}`);
  console.log(`   Excluded — non-holding remark: ${excludedNonHolding}`);
  console.log(`   Excluded — missing college/course: ${excludedMissingFields}`);
  console.log(`   Rows with missing category (bucketed as UNKNOWN): ${missingCategoryCount}`);
  console.log(`\n🎉 Written to ${OUTPUT_FILE}`);

  console.log(`\n🔍 Sample (first 3 cutoffs):`);
  console.log(JSON.stringify(cutoffs.slice(0, 3), null, 2));
}

aggregateCutoffs();