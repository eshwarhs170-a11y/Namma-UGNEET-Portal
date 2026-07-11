const fs = require('fs');
const path = require('path');

const AIQ_DIR = path.join(__dirname, 'aiq_source', '2025');
const MAP_OUTPUT = path.join(__dirname, 'aiq_staging_output', 'aiq_category_map.json');

const FILES = ['aiq_r1.txt', 'aiq_r2.txt'];

const categoryMap = {};

const regex = /\b(MBBS|BDS|B\.?\s*Sc\.?(?:\s+Nursing)?)\s+([A-Za-z]+(?:\s+PwD)?)\s+([A-Za-z]+(?:\s+PwD)?)\s+(?:\d+\s+)?(Allotted|Fresh Allotted|Upgraded)/;

function processFile(filename) {
  const filePath = path.join(AIQ_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  console.log(`Processing ${filename}...`);
  const txt = fs.readFileSync(filePath, 'utf8');
  const blocks = txt.split(/\r?\n(?=\d+\s+\d+\s+(?:[A-Z]|-))/);
  
  let matchCount = 0;
  blocks.slice(1).forEach(block => {
    // Extract Rank from the first line "S.No Rank ..."
    const rankMatch = block.match(/^\d+\s+(\d+)/);
    if (!rankMatch) return;
    const rank = parseInt(rankMatch[1], 10);

    const m = block.match(regex);
    if (m) {
      const course = m[1];
      const allotted = m[2].trim();
      const candidate = m[3].trim();
      
      categoryMap[rank] = { allottedCategory: allotted, candidateCategory: candidate };
      matchCount++;
    }
  });
  console.log(`Found ${matchCount} categories in ${filename}`);
}

FILES.forEach(processFile);

fs.writeFileSync(MAP_OUTPUT, JSON.stringify(categoryMap, null, 2));
console.log(`Saved category map with ${Object.keys(categoryMap).length} ranks to ${MAP_OUTPUT}`);
