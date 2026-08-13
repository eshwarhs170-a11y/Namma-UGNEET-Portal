const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '2025', 'medical_r3.txt'),
  path.join(__dirname, '2025', 'dental_r3.txt')
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  
  let text = fs.readFileSync(file, 'utf8');
  
  // Fix end: Course + Category + Fees + Status
  // We use a global regex on the entire text so it handles newlines gracefully.
  // E.g., 'MBBS-\nOTHERS\nOTH2509350Allotted'
  const endRegex = /(MBBS-?\s*OTHERS|BDS-?\s*OTHERS|MBBS-?\s*PRIV\.?|BDS-?\s*PRIV\.?|MBBS-?[A-Za-z]+\.?|BDS-?[A-Za-z]+\.?)\s*([A-Z0-9]+?)\s*(\d+)\s*(Allotted|Reported|Reproted)/g;
  
  text = text.replace(endRegex, (match, p1, p2, p3, p4) => {
    const course = p1.replace(/\s+/g, '');
    return `${course} ${p2} ${p3} ${p4}`;
  });
  
  // Fix start: SLNO + Rank + Code
  // Since we replaced on the entire text, the text is now mostly fixed.
  // We still need to fix the start of lines, which we can do by splitting into lines now.
  const lines = text.split('\n');
  let expectedSlNo = 1;
  let fixedLines = [];
  
  for (let line of lines) {
    line = line.trim();
    if (!line) {
       fixedLines.push(line);
       continue;
    }
    
    const startRegex = new RegExp(`^(${expectedSlNo})(\\d+)([MD]\\d{2,3}[A-Z0-9]*)`);
    const match = line.match(startRegex);
    if (match) {
      line = line.replace(startRegex, `$1 $2 $3 `);
      expectedSlNo++;
    }
    
    fixedLines.push(line);
  }
  
  fs.writeFileSync(file, fixedLines.join('\n'), 'utf8');
  console.log(`Fixed ${file}`);
}
