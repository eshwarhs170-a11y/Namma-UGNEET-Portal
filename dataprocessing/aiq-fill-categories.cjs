const fs = require('fs');
const path = require('path');

const AIQ_SOURCE_DIR = path.join(__dirname, 'aiq_source');
const MAP_OUTPUT = path.join(__dirname, 'aiq_staging_output', 'aiq_category_map.json');

const categoryMap = fs.existsSync(MAP_OUTPUT) ? JSON.parse(fs.readFileSync(MAP_OUTPUT, 'utf8')) : {};

const regex = /\b(MBBS|BDS|B\.?\s*Sc\.?(?:\s+Nursing)?)\s+([A-Za-z]+(?:\s+PwD)?)\s+([A-Za-z]+(?:\s+PwD)?)\s+(?:\d+\s+)?(Allotted|Fresh Allotted|Upgraded)/;

const years = ['2024', '2025', '2026'];
const files = ['aiq_r1.txt', 'aiq_r2.txt', 'aiq_r3.txt', 'aiq_stray.txt'];

years.forEach(year => {
  files.forEach(filename => {
    const filePath = path.join(AIQ_SOURCE_DIR, year, filename);
    if (!fs.existsSync(filePath)) return;

    console.log(`Processing ${year}/${filename}...`);
    const txt = fs.readFileSync(filePath, 'utf8');

    // First try regex across full text for single-round files
    const singleRegex = /(\d+)\s+(\d+)\s+[\s\S]*?\s+(MBBS|BDS)\s+([A-Za-z]+(?:\s+PwD)?)\s+([A-Za-z]+(?:\s+PwD)?)\s+(Allotted|Reported|Fresh\s+Allotted|Upgraded)/g;
    let m;
    let matchCount = 0;
    while ((m = singleRegex.exec(txt)) !== null) {
      const rank = parseInt(m[2], 10);
      const allotted = m[4].trim();
      const candidate = m[5].trim();
      categoryMap[rank] = { allottedCategory: allotted, candidateCategory: candidate };
      matchCount++;
    }
    console.log(`Found ${matchCount} categories in ${year}/${filename}`);
  });
});

fs.writeFileSync(MAP_OUTPUT, JSON.stringify(categoryMap, null, 2));
console.log(`Saved category map with ${Object.keys(categoryMap).length} ranks to ${MAP_OUTPUT}`);
