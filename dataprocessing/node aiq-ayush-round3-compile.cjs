const fs = require('fs');
const path = require('path');

const AIQ_INPUT_DIR = path.join(__dirname, 'aiq_source');
const OUTPUT_FILE = path.join(__dirname, 'aiq_staging_output', 'aiq_ayush_round3_compiled.json');

const REMARK_PATTERN = /^(Reported|Not Reported|Seat Surrendered|Upgraded|No Upgradation|Allotted|Fresh Allotted in \d+\w{2} Round(?:\([^)]*\))?|Did not opt for Upgradation\.|Did not fill up fresh choices\.)/;

// AYUSH-specific quota phrases that don't fit the generic "ends in Quota/Institutions" pattern.
// "All India Quota Government" ends in "Government", not "Quota" — a real irregularity we saw
// in your actual samples.
const KNOWN_QUOTA_PATTERNS = [
  /^(All India Quota Government)/i,
  /^(Central Universites\s*\/\s*National Institutions)/i,
];

// Matches all 4 AYUSH degree names at once: BAMS, BHMS, BUMS, BSMS all follow
// "Bachelor of <X> Medicine and Surgery" — one pattern covers all of them.
const COURSE_PATTERN = /Bachelor of \w+ Medicine and Surgery/s;

function normalizeWhitespace(str) {
  return str ? str.replace(/\s+/g, ' ').trim() : str;
}

function detectYearFolders() {
  if (!fs.existsSync(AIQ_INPUT_DIR)) return [];
  return fs.readdirSync(AIQ_INPUT_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{4}$/.test(e.name))
    .map((e) => e.name)
    .sort();
}

function splitIntoRows(text) {
  const headerBoundary = text.search(/Remarks\s+\d/);
  const searchFrom = headerBoundary >= 0 ? headerBoundary : 0;

  const firstRowPattern = /(\d+)\s+(\d+)\s+(?=(-\s|(?=[A-Za-z])[a-zA-Z\/\s]{0,50}?(?:Quota|Institutions?|Indian|India|Central)\b))/;
  const firstMatch = text.slice(searchFrom).match(firstRowPattern);
  if (!firstMatch) return [];
  const startIdx = searchFrom + firstMatch.index;

  const remarkScan = new RegExp(REMARK_PATTERN.source.replace(/^\^/, ''), 'g');
  remarkScan.lastIndex = startIdx;

  const boundaries = [startIdx];
  let m;
  while ((m = remarkScan.exec(text)) !== null) {
    const afterRemarkIdx = remarkScan.lastIndex;
    const peek = text.slice(afterRemarkIdx, afterRemarkIdx + 80);
    const footerMatch = peek.match(/^\s*(?:Page No\.\s*\d+\s+[\d-]+\s+[\d:]+\s*(?:AM|PM)?)?\s*/i);
    const afterFooterIdx = afterRemarkIdx + (footerMatch ? footerMatch[0].length : 0);
    const twoNumMatch = text.slice(afterFooterIdx, afterFooterIdx + 20).match(/^(\d+)\s+(\d+)\s/);
    if (twoNumMatch) {
      boundaries.push(afterFooterIdx);
    }
  }

  const rows = [];
  for (let i = 0; i < boundaries.length; i++) {
    const rankMatch = text.slice(boundaries[i]).match(/^(\d+)\s+(\d+)\s+/);
    if (!rankMatch) continue;
    const contentStart = boundaries[i] + rankMatch[0].length;
    const end = i + 1 < boundaries.length ? boundaries[i + 1] : text.length;
    rows.push({ rank: rankMatch[2], text: text.slice(contentStart, end).trim() });
  }
  return rows;
}

function tryConsumeDashBlock(text, fieldCount) {
  const tokens = text.split(/\s+/);
  for (let i = 0; i < fieldCount; i++) {
    if (tokens[i] !== '-') return null;
  }
  return tokens.slice(fieldCount).join(' ');
}

function parseRealBlock(text, isFinalBlock) {
  const courseMatch = text.match(COURSE_PATTERN);
  if (!courseMatch) return null;

  const beforeCourse = text.slice(0, courseMatch.index).trim();
  let afterCourse = text.slice(courseMatch.index + courseMatch[0].length).trim();

  let quota = null;
  let institute = beforeCourse;

  for (const pattern of KNOWN_QUOTA_PATTERNS) {
    const m = beforeCourse.match(pattern);
    if (m) {
      quota = m[1];
      institute = beforeCourse.slice(m[0].length).trim();
      break;
    }
  }

  if (quota === null) {
    const quotaSplit = beforeCourse.match(/^([A-Za-z()\/\s]*?(?:Quota|Institutions?|Indian|India(?!\s+Institute)))\s+([\s\S]*)$/);
    if (quotaSplit) {
      quota = quotaSplit[1];
      institute = quotaSplit[2];
    }
  }

  quota = normalizeWhitespace(quota);
  institute = normalizeWhitespace(institute);

  let allottedCategory = null;
  let candidateCategory = null;
  let optionNo = null;

  if (isFinalBlock) {
    const tokens = afterCourse.split(/\s+/);
    allottedCategory = tokens[0] || null;
    candidateCategory = tokens[1] || null;
    let remainderStart = 2;
    if (tokens[2] && /^\d+$/.test(tokens[2])) {
      optionNo = tokens[2];
      remainderStart = 3;
    }
    afterCourse = tokens.slice(remainderStart).join(' ');
  }

  const remarkMatch = afterCourse.match(REMARK_PATTERN);
  const remark = remarkMatch ? remarkMatch[0] : (afterCourse || null);

  return { quota, institute, course: normalizeWhitespace(courseMatch[0]), allottedCategory, candidateCategory, remark };
}

function parseRow(rowText, rank) {
  let remaining = rowText;
  let current = null;
  const blockFieldCounts = [4, 4, 7];

  for (let blockIdx = 0; blockIdx < 3; blockIdx++) {
    const isFinal = blockIdx === 2;
    const fieldCount = blockFieldCounts[blockIdx];

    const afterDashSkip = tryConsumeDashBlock(remaining, fieldCount);
    if (afterDashSkip !== null) {
      remaining = afterDashSkip.trim();
      continue;
    }

    const parsed = parseRealBlock(remaining, isFinal);
    if (!parsed) break;

    current = parsed;
    const idx = remaining.indexOf(parsed.remark || '');
    remaining = idx >= 0 ? remaining.slice(idx + (parsed.remark ? parsed.remark.length : 0)).trim() : '';
  }

  if (!current) return null;

  return {
    rank: parseInt(rank, 10),
    quota: current.quota,
    collegeName: current.institute,
    course: current.course,
    allottedCategory: current.allottedCategory,
    candidateCategory: current.candidateCategory,
    remark: current.remark,
  };
}

function compileAyushRound3() {
  const masterData = [];
  const years = detectYearFolders();

  years.forEach((year) => {
    const yearPath = path.join(AIQ_INPUT_DIR, year);
    if (!fs.existsSync(yearPath)) return;
    const files = fs.readdirSync(yearPath).filter((f) => /ayush.*r3|ayush.*round3/i.test(f) && f.endsWith('.txt'));

    files.forEach((fileName) => {
      const filePath = path.join(yearPath, fileName);
      console.log(`⏳ Processing AYUSH final round from ${fileName} (${year})...`);
      const rawText = fs.readFileSync(filePath, 'utf8');
      const rows = splitIntoRows(rawText);

      let count = 0;
      let skipped = 0;
      let quotaNullCount = 0;
      rows.forEach(({ rank, text }) => {
        const parsed = parseRow(text, rank);
        if (parsed) {
          if (parsed.quota === null) quotaNullCount++;
          masterData.push({ ...parsed, year, dataset: 'AIQ', stream: 'AYUSH', source: 'round3' });
          count++;
        } else {
          skipped++;
        }
      });
      console.log(`✅ Extracted ${count} records, skipped ${skipped} from ${fileName}`);
      if (quotaNullCount > 0) {
        console.log(`⚠️  ${quotaNullCount} records have quota:null`);
      }
    });
  });

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(masterData), 'utf8');
  console.log(`\n🎉 Total: ${masterData.length} records written to ${OUTPUT_FILE}`);
}

compileAyushRound3();