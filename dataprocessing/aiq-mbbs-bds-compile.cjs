const fs = require('fs');
const path = require('path');

const AIQ_INPUT_DIR = path.join(__dirname, 'aiq_source');
const OUTPUT_FILE = path.join(__dirname, 'aiq_staging_output', 'aiq_mbbs_bds_compiled.json');

// Added "Upgraded" — a real remark phrase we hadn't seen until testing against real data
const REMARK_PATTERN = /^(Reported|Not Reported|Seat Surrendered|Upgraded|Fresh Allotted in \d+\w{2} Round(?:\([^)]*\))?|Did not opt for Upgradation\.|Did not fill up fresh choices\.)/;

// Known irregular quota phrases that don't end in "Quota"/"Indian"/"India" —
// checked FIRST, before falling back to the generic ending-word heuristic.
// \s+ between words tolerates line-breaks and extra spaces from PDF extraction.
const KNOWN_QUOTA_PATTERNS = [
  /^(Employee['\s]*s\s+State\s+Insurance\s+Scheme\(?\s*ESI\s*\))/i,
  /^(Deemed\s*\/?\s*Paid\s+Seats\s+Quota)/i,
];

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
  const rowStartPattern = /(\d+)\s+(?=(-\s|(?=[A-Za-z])[a-zA-Z\/\s]{0,40}?(?:Quota|Institutions?|Indian|India|Employee)\b))/g;
  const starts = [];
  let m;
  while ((m = rowStartPattern.exec(text)) !== null) {
    starts.push({ index: m.index, rank: m[1], matchLen: m[0].length });
  }
  const rows = [];
  for (let i = 0; i < starts.length; i++) {
    const contentStart = starts[i].index + starts[i].matchLen;
    const end = i + 1 < starts.length ? starts[i + 1].index : text.length;
    rows.push({ rank: starts[i].rank, text: text.slice(contentStart, end).trim() });
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
  const courseMatch = text.match(/\b(MBBS|BDS)\b/s);
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

  return { quota, institute, course: courseMatch[0], allottedCategory, candidateCategory, remark };
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

function compileMbbsBds() {
  const masterData = [];
  const years = detectYearFolders();

  years.forEach((year) => {
    const yearPath = path.join(AIQ_INPUT_DIR, year);
    if (!fs.existsSync(yearPath)) return;
    const files = fs.readdirSync(yearPath).filter((f) => /r3|round3|revised/i.test(f) && f.endsWith('.txt'));

    files.forEach((fileName) => {
      const filePath = path.join(yearPath, fileName);
      console.log(`⏳ Processing MBBS/BDS final round from ${fileName} (${year})...`);
      const rawText = fs.readFileSync(filePath, 'utf8');
      const rows = splitIntoRows(rawText);

      let count = 0;
      let skipped = 0;
      let quotaNullCount = 0;
      rows.forEach(({ rank, text }) => {
        const parsed = parseRow(text, rank);
        if (parsed) {
          if (parsed.quota === null) quotaNullCount++;
          masterData.push({ ...parsed, year, dataset: 'AIQ', stream: 'MEDICAL_DENTAL' });
          count++;
        } else {
          skipped++;
        }
      });
      console.log(`✅ Extracted ${count} records, skipped ${skipped} (dash-only/unmatched) from ${fileName}`);
      if (quotaNullCount > 0) {
        console.log(`⚠️  ${quotaNullCount} records have quota:null — review these, likely an unrecognized quota phrase`);
      }
    });
  });

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(masterData), 'utf8');
  console.log(`\n🎉 Total: ${masterData.length} records written to ${OUTPUT_FILE}`);
}

compileMbbsBds();