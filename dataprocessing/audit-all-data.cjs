const fs = require('fs');
const path = require('path');

const KEA_PATH = path.join(__dirname, '..', 'public', 'data', 'compiled_allotments.json');
const AIQ_PATH = path.join(__dirname, '..', 'public', 'data', 'aiq_compiled_allotments.json');

function auditDataset(name, filePath) {
  console.log(`\n==================================================`);
  console.log(`AUDITING DATASET: ${name} (${filePath})`);
  console.log(`==================================================`);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`Total Records: ${data.length.toLocaleString('en-IN')}`);

  // 1. Years
  const years = [...new Set(data.map(d => d.year))].sort();
  console.log(`Years:`, years);

  // 2. Streams
  const streams = {};
  data.forEach(d => { streams[d.stream] = (streams[d.stream] || 0) + 1; });
  console.log(`Streams:`, streams);

  // 3. Rounds
  const rounds = {};
  data.forEach(d => { rounds[d.round] = (rounds[d.round] || 0) + 1; });
  console.log(`Rounds:`, rounds);

  // 4. Categories
  const categories = {};
  data.forEach(d => { categories[d.category] = (categories[d.category] || 0) + 1; });
  console.log(`Categories count:`, Object.keys(categories).length);
  console.log(`Categories:`, categories);

  // 5. Quotas (if present)
  if (data[0] && 'quota' in data[0]) {
    const quotas = {};
    data.forEach(d => { quotas[d.quota] = (quotas[d.quota] || 0) + 1; });
    console.log(`Quotas count:`, Object.keys(quotas).length);
    console.log(`Quotas:`, quotas);
  }

  // 6. Rank checks (invalid, <= 0, NaN, non-number)
  const invalidRanks = data.filter(d => typeof d.rank !== 'number' || isNaN(d.rank) || d.rank <= 0);
  console.log(`Invalid Ranks count:`, invalidRanks.length);
  if (invalidRanks.length > 0) {
    console.log(`Sample invalid ranks:`, invalidRanks.slice(0, 5));
  }

  // 7. College Name checks (garbage patterns)
  const garbageNameRegex = /did not|not reported|not allotted|surrender|upgrad|\bpage\b|\boption\b|^- -|- - -|^\d+\s*-\s*\d+/i;
  const suspiciousColleges = data.filter(d => !d.collegeName || d.collegeName.length < 3 || garbageNameRegex.test(d.collegeName));
  console.log(`Suspicious College Names count:`, suspiciousColleges.length);
  if (suspiciousColleges.length > 0) {
    const sampleNames = [...new Set(suspiciousColleges.map(d => d.collegeName))].slice(0, 15);
    console.log(`Sample suspicious college names:`, sampleNames);
  }

  // 8. College Code checks
  const missingCodes = data.filter(d => !d.collegeCode || typeof d.collegeCode !== 'string' || d.collegeCode.trim() === '');
  console.log(`Missing/Invalid College Codes count:`, missingCodes.length);

  // 9. Course details checks
  const courses = {};
  data.forEach(d => { courses[d.courseDetails] = (courses[d.courseDetails] || 0) + 1; });
  console.log(`Course details count:`, Object.keys(courses).length);
  console.log(`Course details:`, courses);
}

auditDataset('KEA', KEA_PATH);
auditDataset('AIQ', AIQ_PATH);
