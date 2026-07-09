const fs = require('fs');
const path = require('path');

const AIQ_INPUT_DIR = path.join(__dirname, 'aiq_source');
const OUTPUT_FILE = path.join(__dirname, 'aiq_staging_output', 'aiq_mbbs_bds_compiled.json');

const REMARK_PATTERN = /^(Reported|Not\s+Reported|Not\s+Allotted\.|Seat\s+Surrendered|Upgraded|No\s+Upgradation|Fresh\s+Allotted\s+in\s+\d+\w{2}\s+Round(?:\([^)]*\))?|Did\s+not\s+opt\s+for\s+Upgradation\.|Did\s+not\s+fill\s+up\s+fresh\s+choices\.)/;

const KNOWN_QUOTA_PATTERNS = [
  /^(Non\s*-?\s*Resident\s+Indian\s*\(\s*A\s*M\s*U\s*\)\s*Quota)/i,
  /^(Non\s*-?\s*Resident\s+Indian\s*\(\s*Jamia\s*\)\s*Quota)/i,
  /^(Delhi\s*NCR\s*Children\s*\/?\s*Widows\s*of\s*Personnel\s*of\s*the\s*Armed\s*Forces\s*\(\s*CW\s*\)\s*DU\s*Quota)/i,
  /^(Delhi\s*NCR\s*Children\s*\/?\s*Widows\s*of\s*Personnel\s*of\s*the\s*Armed\s*Forces\s*\(\s*CW\s*\)\s*IP\s*Quota)/i,
  /^(Employee['’\s]*s\s+State\s+Insurance\s+Scheme\s+Nursing\s+Quota\s*\(\s*ESI-?IP\s*Quota\s*Nursing\s*\))/i,
  /^(Employee['’\s]*s\s+State\s+Insurance\s+Scheme\s*\(\s*ESI\s*\))/i,
  /^(Aligarh\s+Muslim\s+University\s*\(\s*A\s*M\s*U\s*\)\s*Quota)/i,
  /^(B\.?\s*Sc\.?\s+Nursing\s+Delhi\s*NCR\s*CW\s*Quota)/i,
  /^(B\.?\s*Sc\.?\s+Nursing\s+IP\s*CW\s*Quota)/i,
  /^(B\.?\s*Sc\.?\s+Nursing\s+Delhi\s*NCR)/i,
  /^(B\.?\s*Sc\.?\s+Nursing\s+All\s+India)/i,
  /^(Deemed\s*\/?\s*Paid\s+Seats\s+Quota)/i,
  /^(Internal\s*-?\s*Puduche\s*r\s*r\s*y\s+UT\s+Domicile)/i,
  /^(IP\s+University\s+Quota)/i,
  /^(Jain\s+Minority\s+Quota)/i,
  /^(Jamia\s+Internal\s+Quota)/i,
  /^(Muslim\s+Minority\s+Quota)/i,
  /^(Muslim\s+OBC\s+Quota)/i,
  /^(Muslim\s+ST\s+Quota)/i,
  /^(Muslim\s+Women\s+Quota)/i,
  /^(Muslim\s+Quota)/i,
  /^(Delhi\s+University\s+Quota)/i,
  /^(Foreign\s+Country\s+Quota)/i,
  /^(Open\s+Seat\s+Quota)/i,
  /^(Non\s*-?\s*Resident\s+Indian)/i,
  /^(\(\s*A\s*M\s*U\s*\)\s*Self\s*finance\s+All\s+India)/i,
  /^(\(\s*A\s*M\s*U\s*\)\s*Self\s*finance\s+internal)/i,
  /^(All\s+India)/i,
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
  // Anchor past the document's abbreviation legend / notes / column-header text first —
  // without this, a stray digit-followed-by-"Quota" pattern inside that header content
  // (e.g. "Page No. 1 ... Quota ...") can be mistaken for the true first data row,
  // gluing the entire header block onto whatever rank happens to match.
  // "option No. Remarks" is the literal end of the column-header row and appears
  // exactly once, immediately before real data begins.
  const HEADER_ANCHOR = /option\s*No\.\s*Remarks/i;
  const anchorMatch = text.match(HEADER_ANCHOR);
  const searchFrom = anchorMatch ? anchorMatch.index + anchorMatch[0].length : 0;

  const firstRowPattern = /(\d+)\s+(?=(-\s|(?=[A-Za-z])[a-zA-Z\/\s]{0,40}?(?:Quota|Institutions?|Indian|India|Employee)\b))/;
  const remainder = text.slice(searchFrom);
  const firstMatch = remainder.match(firstRowPattern);
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
    const digitMatch = text.slice(afterFooterIdx, afterFooterIdx + 10).match(/^(\d+)\s/);
    if (digitMatch) {
      boundaries.push(afterFooterIdx);
    }
  }

  const rows = [];
  for (let i = 0; i < boundaries.length; i++) {
    const rankMatch = text.slice(boundaries[i]).match(/^(\d+)\s+/);
    if (!rankMatch) continue;
    const contentStart = boundaries[i] + rankMatch[0].length;
    const end = i + 1 < boundaries.length ? boundaries[i + 1] : text.length;
    rows.push({ rank: rankMatch[1], text: text.slice(contentStart, end).trim() });
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
  const remark = remarkMatch ? normalizeWhitespace(remarkMatch[0]) : (normalizeWhitespace(afterCourse) || null);

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