const fs = require('fs');
const path = require('path');

const AIQ_INPUT_DIR = path.join(__dirname, 'aiq_source');
const OUTPUT_FILE = path.join(__dirname, 'aiq_staging_output', 'aiq_mbbs_bds_compiled.json');

const REMARK_PATTERN = /^(Reported|Not Reported|Seat Surrendered|Fresh Allotted in \d+\w{2} Round(?:\([^)]*\))?|Did not opt for Upgradation\.|Did not fill up fresh choices\.)/;

function detectYearFolders() {
  if (!fs.existsSync(AIQ_INPUT_DIR)) return [];
  return fs.readdirSync(AIQ_INPUT_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{4}$/.test(e.name))
    .map((e) => e.name)
    .sort();
}

function splitIntoRows(text) {
  const rowStartPattern = /(\d+)\s+(?=(-\s|[A-Z][a-zA-Z\/\s]*?(?:Quota|Institutions?|Indian|India)\b))/g;
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
  const courseMatch = text.match(/\b(MBBS|BDS)\b/);
  if (!courseMatch) return null;

  const beforeCourse = text.slice(0, courseMatch.index).trim();
  let afterCourse = text.slice(courseMatch.index + courseMatch[0].length).trim();

  const quotaSplit = beforeCourse.match(/^([A-Za-z()\/\s]*?(?:Quota|Institutions?|Indian|India(?!\s+Institute)))\s+(.*)$/);
  const quota = quotaSplit ? quotaSplit[1].trim() : null;
  const institute = quotaSplit ? quotaSplit[2].trim() : beforeCourse;

  let allottedCategory = null;
  let candidateCategory = null;
  let optionNo = null;

  if (isFinalBlock) {
    const tokens = afterCourse.split(/\s+/);
    allottedCategory = tokens[0] || null;
    candidateCategory = tokens[1] || null;
    optionNo = tokens[2] || null;
    afterCourse = tokens.slice(3).join(' ');
  }

  const remarkMatch = afterCourse.match(REMARK_PATTERN);
  const remark = remarkMatch ? remarkMatch[0] : afterCourse || null;
  const consumedLength = courseMatch.index + courseMatch[0].length +
    (isFinalBlock ? (allottedCategory ? allottedCategory.length + 1 : 0) +
                    (candidateCategory ? candidateCategory.length + 1 : 0) +
                    (optionNo ? optionNo.length + 1 : 0) : 0) +
    (remarkMatch ? remarkMatch[0].length : afterCourse.length);

  return { quota, institute, course: courseMatch[0], allottedCategory, candidateCategory, remark, consumedLength };
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
      rows.forEach(({ rank, text }) => {
        const parsed = parseRow(text, rank);
        if (parsed) {
          masterData.push({ ...parsed, year, dataset: 'AIQ', stream: 'MEDICAL_DENTAL' });
          count++;
        } else {
          skipped++;
        }
      });
      console.log(`✅ Extracted ${count} records, skipped ${skipped} (dash-only/unmatched) from ${fileName}`);
    });
  });

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(masterData), 'utf8');
  console.log(`\n🎉 Total: ${masterData.length} records written to ${OUTPUT_FILE}`);
}

compileMbbsBds();