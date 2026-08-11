const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '2025', 'medical_r3.txt'),
  path.join(__dirname, '2025', 'dental_r3.txt')
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');
  
  let expectedSlNo = 1;
  let fixedLines = [];
  
  for (let line of lines) {
    line = line.trim();
    
    // Fix start: SLNO + Rank + Code
    const startRegex = new RegExp(`^(${expectedSlNo})(\\d+)([MD]\\d{2,3}[A-Z0-9]*)`);
    const match = line.match(startRegex);
    if (match) {
      line = line.replace(startRegex, `$1 $2 $3 `);
      expectedSlNo++;
    }
    
    // Fix end: Course + Category + Fees + Status
    // Non-greedy category followed by greedy digits for fees!
    const endRegex = /(MBBS-?[A-Za-z]+\.?|BDS-?[A-Za-z]+\.?)([A-Z0-9]+?)(\d+)(Allotted|Reported|Reproted)/;
    const endMatch = line.match(endRegex);
    if (endMatch) {
      line = line.replace(endRegex, `$1 $2 $3 $4`);
    }
    
    fixedLines.push(line);
  }
  
  fs.writeFileSync(file, fixedLines.join('\n'), 'utf8');
  console.log(`Fixed ${file}`);
}
