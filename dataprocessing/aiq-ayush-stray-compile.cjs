const fs = require('fs');
const path = require('path');

const AIQ_INPUT_DIR = path.join(__dirname, 'aiq_source');
const OUTPUT_FILE = path.join(__dirname, 'aiq_staging_output', 'aiq_ayush_stray_compiled.json');

const REMARK_PATTERN = /^(Reported|Not Reported|Seat Surrendered|Upgraded|No Upgradation|Allotted|Fresh Allotted in \d+\w{2} Round(?:\([^)]*\))?|Did not opt for Upgradation\.|Did not fill up fresh choices\.)/;

const KNOWN_QUOTA_PATTERNS = [
  /^(Management\/Paid Seats Quota)/i,
  /^(All India Quota Govt Aided)/i,
  /^(All India Quota Government)/i,
  /^(Central Universites\s*\/\s*National Institutions)/i,
  /^(Non-Resident Indian)/i,
  /^(Muslim Minority Quota\(Govt Aided\))/i,
  /^(Jain Minority Quota\(Govt Aided\))/i,
  /^(Muslim Minority Quota)/i,
  /^(Jain Minority Quota)/i,
  /^(Linguistic Minority)/i,
  /^(Self Finance)/i,
];

const COURSE_PATTERN = /Bachelor of\s+\w+\s+Medicine\s+and\s+Surgery/is;

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
  const headerBoundary = text.search(/SNo Rank Allotted Quota/);
  const searchFrom = headerBoundary >= 0 ? headerBoundary : 0;
  
  // Stray rounds usually look like: "1 26664 Central Universites..."
  const rowPattern = /(?:^|\n|\s)\d+\s+(\d+)\s+(?=(?:Management|All India|Central|Non-Resident|Muslim|Jain|Linguistic|Self))/g;
  
  const rows = [];
  let match;
  let lastIndex = -1;
  let lastRank = null;
  
  while ((match = rowPattern.exec(text.slice(searchFrom))) !== null) {
    const absMatchIndex = searchFrom + match.index;
    if (lastIndex !== -1) {
      rows.push({ rank: lastRank, text: text.slice(lastIndex, absMatchIndex).trim() });
    }
    lastIndex = absMatchIndex + match[0].length;
    lastRank = match[1];
  }
  if (lastIndex !== -1) {
    rows.push({ rank: lastRank, text: text.slice(lastIndex).trim() });
  }
  
  return rows;
}

function parseRow(text, rank) {
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

  const tokens = afterCourse.split(/\s+/);
  let allottedCategory = tokens[0] || null;
  let candidateCategory = tokens[1] || null;
  let remark = tokens.slice(2).join(' ') || null;

  return {
    rank: parseInt(rank, 10),
    quota: normalizeWhitespace(quota),
    collegeName: normalizeWhitespace(institute),
    course: normalizeWhitespace(courseMatch[0]),
    allottedCategory,
    candidateCategory,
    remark,
  };
}

function compileAyushStray() {
  const masterData = [];
  const years = detectYearFolders();

  years.forEach((year) => {
    const yearPath = path.join(AIQ_INPUT_DIR, year);
    if (!fs.existsSync(yearPath)) return;
    const files = fs.readdirSync(yearPath).filter((f) => /ayush.*stray/i.test(f) && f.endsWith('.txt'));

    files.forEach((fileName) => {
      const filePath = path.join(yearPath, fileName);
      console.log(`⏳ Processing AYUSH stray round from ${fileName} (${year})...`);
      const rawText = fs.readFileSync(filePath, 'utf8');
      const rows = splitIntoRows(rawText);

      let count = 0;
      let skipped = 0;
      rows.forEach(({ rank, text }) => {
        const parsed = parseRow(text, rank);
        if (parsed) {
          const roundMatch = fileName.match(/stray(\d+)?/i);
          const roundName = roundMatch && roundMatch[1] ? `stray${roundMatch[1]}` : 'stray1';
          masterData.push({ ...parsed, year, dataset: 'AIQ', stream: 'AYUSH', source: roundName });
          count++;
        } else {
          skipped++;
        }
      });
      console.log(`✅ Extracted ${count} records, skipped ${skipped} from ${fileName}`);
    });
  });

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(masterData, null, 2), 'utf8');
  console.log(`\n🎉 Total: ${masterData.length} records written to ${OUTPUT_FILE}`);
}

compileAyushStray();