const fs = require('fs');
const path = require('path');

const dir2026 = path.join(__dirname, '..', '2026');
const medPath = path.join(dir2026, 'medical_stray.txt');
const dentPath = path.join(dir2026, 'dental_stray.txt');

const rawMed = fs.readFileSync(medPath, 'utf8');
const rawDent = fs.readFileSync(dentPath, 'utf8');

const entryRegex = /(\d+)\s+(\d+)\s+([MD]\d+[A-Z0-9]*)\s+([\s\S]*?)(MBBS-?[A-Za-z]+\.?|BDS-?[A-Za-z]+\.?)\s+([A-Z0-9]+)\s+(\d+)(?:\s+(Allotted|ALLOTTED|PREVIOUS\s+ROUND\s+ALLOTTED|Reported|Not\s+Reported))?/g;

const medMatches = [...rawMed.matchAll(entryRegex)];

let currentRound = 1;
const medByRound = { 1: [], 2: [], 3: [], 4: [] };
const dentByRound = { 2: [], 3: [], 4: [] };

for (let i = 0; i < medMatches.length; i++) {
  const m = medMatches[i];
  const sl = parseInt(m[1], 10);
  if (sl === 1 && i > 0) {
    currentRound++;
  }
  const item = {
    originalSl: m[1],
    rank: m[2],
    code: m[3],
    college: m[4].replace(/\s+/g, ' ').trim(),
    course: m[5].trim(),
    category: m[6].trim(),
    fees: m[7],
    status: (m[8] || 'Allotted').trim()
  };
  if (item.code.startsWith('M')) {
    medByRound[currentRound].push(item);
  } else {
    dentByRound[currentRound].push(item);
  }
}

console.log('--- Extracted from medical_stray.txt ---');
console.log('Medical Stray 1:', medByRound[1].length);
console.log('Medical Stray 2:', medByRound[2].length);
console.log('Medical Stray 3:', medByRound[3].length);
console.log('Medical Stray 4:', medByRound[4].length);
console.log('Total Medical:', medByRound[1].length + medByRound[2].length + medByRound[3].length + medByRound[4].length);
console.log('Dental Stray 2:', dentByRound[2].length);
console.log('Dental Stray 3:', dentByRound[3].length);
console.log('Dental Stray 4:', dentByRound[4].length);
console.log('Total Dental from medical file:', dentByRound[2].length + dentByRound[3].length + dentByRound[4].length);

// Extract Stray 1 Dental from existing dental_stray.txt (first 328 records)
const dentMatches = [...rawDent.matchAll(entryRegex)].slice(0, 328);
console.log('Dental Stray 1 in dental_stray.txt:', dentMatches.length);
const dentStray1 = dentMatches.map(m => ({
  originalSl: m[1],
  rank: m[2],
  code: m[3],
  college: m[4].replace(/\s+/g, ' ').trim(),
  course: m[5].trim(),
  category: m[6].trim(),
  fees: m[7],
  status: (m[8] || 'Allotted').trim()
}));

// Function to format records nicely for text dump
function formatRound(stream, roundNum, records, dateStr) {
  const header = [
    'SL.NO All India',
    'Rank Course Code Name of the College Allotted. Course Name Allotted',
    'Category Course_fees Status'
  ].join('\n');

  const rows = records.map((r, idx) => {
    return `${idx + 1} ${r.rank} ${r.code} ${r.college} ${r.course} ${r.category} ${r.fees} ${r.status}`;
  }).join('\n');

  const roundName = roundNum === 1 ? 'STRAY ROUND' : `STRAY ${roundNum} ROUND`;
  const footer = [
    `UGNEET -2026 ${stream} ${roundName} FINAL SEAT ALLOTMENT LIST`,
    'Karnataka Examinations Authority',
    `PUBLISHED ON [${dateStr}]`
  ].join('\n');

  return `${header}\n${rows}\n${footer}\n`;
}

// Build new medical_stray.txt
const newMedText = [
  formatRound('MEDICAL', 1, medByRound[1], '22-10-2026'),
  formatRound('MEDICAL', 2, medByRound[2], '25-10-2026'),
  formatRound('MEDICAL', 3, medByRound[3], '26-10-2026'),
  formatRound('MEDICAL', 4, medByRound[4], '26-10-2026')
].join('\n');

// Build new dental_stray.txt
const newDentText = [
  formatRound('DENTAL', 1, dentStray1, '22-10-2026'),
  formatRound('DENTAL', 2, dentByRound[2], '25-10-2026'),
  formatRound('DENTAL', 3, dentByRound[3], '26-10-2026'),
  formatRound('DENTAL', 4, dentByRound[4], '26-10-2026')
].join('\n');

// Write back to files
fs.writeFileSync(medPath, newMedText, 'utf8');
fs.writeFileSync(dentPath, newDentText, 'utf8');

console.log('✅ Updated medical_stray.txt and dental_stray.txt successfully.');
