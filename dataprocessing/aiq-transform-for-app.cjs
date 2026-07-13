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
  if (course && course.includes('Ayurvedic')) return 'AYUSH';
  if (course && course.includes('Homoeopathic')) return 'AYUSH';
  if (course && course.includes('Unani')) return 'AYUSH';
  if (course && course.includes('Siddha')) return 'AYUSH';
  return 'MEDICAL';
}

// AIQ has no official college codes like KEA's M001MG — generate a short,
// stable synthetic one from the college name so existing UI code that keys
// off collegeCode (star/save, option-entry list, detail modal grouping)
// keeps working without changes.
function makeSyntheticCode(collegeName) {
  const hash = crypto.createHash('md5').update(collegeName).digest('hex').slice(0, 6).toUpperCase();
  return `AIQ-${hash}`;
}

// ── Data cleaning helpers ───────────────────────────────────────────

// Valid AIQ categories. Anything else gets mapped to UNKNOWN.
const VALID_CATEGORIES = new Set([
  'Open', 'OBC', 'EWS', 'ST', 'SC', 'UNKNOWN',
  // KEA-style (shouldn't appear in AIQ but just in case)
  'GM', '1G', '2AG', '2BG', '3AG', '3BG', 'GMR', 'GMHR',
]);

function normalizeCategory(cat) {
  if (!cat) return 'UNKNOWN';
  const trimmed = cat.trim();
  if (VALID_CATEGORIES.has(trimmed)) return trimmed;
  // "Reported", "Not", "UNIV.OF" are parsing artifacts — treat as UNKNOWN
  return 'UNKNOWN';
}

// College names from the PDF extraction sometimes contain garbage prefix:
//   "- - - - - - Did not fill up fresh choices. 1338 74045 - - - - - - - - All India Quota Govt Aided Vaidyaratnam Ayurved College..."
// We need to extract the actual college name from this mess.
function cleanCollegeName(name) {
  if (!name) return '';

  let cleaned = name;

  // Pattern: leading dashes + "Did not fill up fresh choices." + numbers + more dashes + quota text + actual college name
  // The actual college name typically starts after a known quota prefix pattern or after the last cluster of dashes.
  
  // Remove leading "- " sequences
  cleaned = cleaned.replace(/^[\s\-]+/, '');
  
  // Remove "Did not fill up fresh choices." and similar remarks
  cleaned = cleaned.replace(/Did not fill up fresh choices\.\s*/gi, '');
  cleaned = cleaned.replace(/Not Reported\.\s*/gi, '');
  cleaned = cleaned.replace(/Not Allotted\.\s*/gi, '');
  cleaned = cleaned.replace(/Seat Surrendered\.\s*/gi, '');
  cleaned = cleaned.replace(/Reported\.\s*/gi, '');
  cleaned = cleaned.replace(/No Upgradation\.\s*/gi, '');
  cleaned = cleaned.replace(/Upgraded\.\s*/gi, '');
  
  // Remove standalone numbers (rank numbers, serial numbers) that appear before the quota/institution name
  // Pattern: sequences of just digits surrounded by spaces or dashes
  cleaned = cleaned.replace(/^[\s\d\-]+/, '');
  
  // Now the name might start with a quota prefix like "All India Quota Govt Aided" or 
  // "Central Universites / National Institutions" followed by the actual college name.
  // We'll keep the quota prefix as part of the name since it provides context,
  // but let's try to extract just the college name.
  
  // Known quota prefixes that appear BEFORE the college name in the garbage data
  const quotaPrefixes = [
    /^All India Quota Government\s+/i,
    /^All India Quota Govt Aided\s+/i,
    /^Central Universites\s*\/?\s*National Institutions\s+/i,
    /^Deemed\/?\s*Paid Seats Quota\s+/i,
    /^Open Seat Quota\s+/i,
    /^Delhi University Quota\s+/i,
    /^IP University Quota\s+/i,
    /^Employee\s*s?\s*State Insurance Scheme[^)]*\)?\s*/i,
    /^Aligarh Muslim University \(AMU\) Quota\s+/i,
    /^B\.?Sc Nursing All India\s+/i,
    /^Muslim Quota\s+/i,
    /^Muslim Minority Quota[^)]*\)?\s*/i,
    /^Management\/?\s*Paid?\s*Seats Quota\s+/i,
    /^Linguistic Minority\s+/i,
    /^Jain Minority Quota\s+/i,
    /^Self Finance\s+/i,
    /^Non-?\s*Resident Indian[^)]*\)?\s*/i,
    /^Jamia Internal Quota\s+/i,
    /^\(AMU\)\s*Self finance[^)]*\s*/i,
    /^Internal\s*-?\s*Puducher\s*ry\s+UT\s+Domicile\s+/i,
    /^Foreign Country Quota\s+/i,
    /^Muslim\s+\w+\s+Quota\s+/i,
    /^Delhi NCR[^)]*Quota\s+/i,
  ];
  
  for (const prefix of quotaPrefixes) {
    cleaned = cleaned.replace(prefix, '');
  }
  
  // Remove any remaining leading dashes/spaces
  cleaned = cleaned.replace(/^[\s\-]+/, '');
  
  // Collapse multiple spaces and trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Truncate to "College Name, City" — take only first 2 comma-delimited parts
  // This strips the detailed address/pincode that comes from the PDF
  const parts = cleaned.split(',');
  if (parts.length > 2) {
    cleaned = parts.slice(0, 2).join(',').trim();
  }
  
  // If after all cleaning the name is empty or too short, return original (trimmed)
  if (cleaned.length < 5) {
    return name.replace(/\s+/g, ' ').trim();
  }
  
  return cleaned;
}

// Normalize quota strings (fix line-break artifacts from PDF extraction)
function normalizeQuota(quota) {
  if (!quota) return 'UNKNOWN';
  return quota
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'UNKNOWN';
}

function transform() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input not found: ${INPUT_FILE}. Run aiq-aggregate-cutoffs.cjs first.`);
    process.exit(1);
  }

  const cutoffs = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  console.log(`Loaded ${cutoffs.length} AIQ cutoff groups`);

  let cleanedNameCount = 0;
  let fixedCategoryCount = 0;

  // Filter out records with garbage/empty college names or header bleed-through
  // (R1 PDFs often have the abbreviation legend parsed as a "college name")
  function isGarbageName(name) {
    if (!name || name.length < 5) return true;
    if (name.length > 160) return true; // legitimate college names are short
    if (/abbreviat/i.test(name)) return true;
    if (/allotted category/i.test(name)) return true;
    if (/candidate category/i.test(name)) return true;
    if (/counselling seats allotment/i.test(name)) return true;
    if (/neet-ug counselling/i.test(name)) return true;
    if (/\bsno\b.*\brank\b/i.test(name)) return true; // header row
    if (/^\d*\.\d+\s/i.test(name)) return true; // decimal rank prefix like "1.02 Open Seat..." or ".02 Open..."
    if (/^[\d\s.\-]+$/i.test(name)) return true; // pure numbers/dashes
    if (/^Open Seat Quota\s/i.test(name)) return true; // quota leaked into name
    if (/^NonResident\s/i.test(name)) return true; // quota leaked into name
    if (/^Non-Resident\s/i.test(name)) return true; // quota leaked into name
    if (/^All India\s/i.test(name) && name.length < 30) return true; // "All India Government..." as name
    if (/^- - - -/i.test(name)) return true; // dash block artifacts
    return false;
  }

  const transformed = cutoffs
    .map((c) => {
      const originalName = c.collegeName || '';
      const cleanedName = cleanCollegeName(originalName);
      const normalizedCat = normalizeCategory(c.category);
      
      if (cleanedName !== originalName) cleanedNameCount++;
      if (normalizedCat !== c.category) fixedCategoryCount++;

      return {
        year: c.year,
        stream: deriveStream(c.course),
        round: c.round || 'FINAL',
        collegeCode: makeSyntheticCode(cleanedName),
        collegeName: cleanedName,
        courseDetails: c.course,
        category: normalizedCat,
        fees: null,
        rank: c.cutoffRank,
        quota: normalizeQuota(c.quota),
        seatCount: c.seatCount,
        dataset: 'AIQ',
      };
    })
    .filter((r) => !isGarbageName(r.collegeName));


  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(transformed), 'utf8');

  console.log(`\nWritten ${transformed.length} app-ready AIQ records to:\n${OUTPUT_FILE}`);
  console.log(`Cleaned ${cleanedNameCount} college names`);
  console.log(`Fixed ${fixedCategoryCount} bad categories`);
  console.log(`\nSample (first 3):`);
  console.log(JSON.stringify(transformed.slice(0, 3), null, 2));
  
  // Print unique categories and quota values for verification
  const cats = {};
  transformed.forEach(r => { cats[r.category] = (cats[r.category] || 0) + 1; });
  console.log(`\nCategory distribution:`, cats);
}

transform();