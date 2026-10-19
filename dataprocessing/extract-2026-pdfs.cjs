const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

const OUT_DIR = path.join(__dirname, '2026');
const SEARCH_DIRS = [
  path.join(__dirname, '..', 'kea-pdfs', '2026'),
  path.join(__dirname, '..', 'kea-pdfs'),
  OUT_DIR
];

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function extractPdf(pdfPath) {
  const buf = fs.readFileSync(pdfPath);
  const data = await pdfParse(buf);
  return data.text;
}

// Map common filename formats to standardized target file names
function identifyTarget(fileName) {
  const name = fileName.toLowerCase();
  
  const stream = name.includes('dent') ? 'dental'
               : name.includes('ayush') ? 'ayush'
               : name.includes('med') ? 'medical'
               : null;
  if (!stream) return null;

  const round = name.includes('stray') ? 'stray'
              : name.includes('mop') || name.includes('r3') || name.includes('round3') || name.includes('round_3') || name.includes('round 3') || name.includes('3') ? 'r3'
              : name.includes('r2') || name.includes('round2') || name.includes('round_2') || name.includes('round 2') || name.includes('2') ? 'r2'
              : name.includes('r1') || name.includes('round1') || name.includes('round_1') || name.includes('round 1') || name.includes('1') ? 'r1'
              : null;
  if (!round) return null;

  return `${stream}_${round}.txt`;
}

async function run() {
  console.log('🔍 Scanning for 2026 PDF allotment files...\n');
  
  let found = 0;
  for (const dir of SEARCH_DIRS) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.pdf'));

    for (const f of files) {
      const targetName = identifyTarget(f);
      if (!targetName) continue;

      const pdfPath = path.join(dir, f);
      const outPath = path.join(OUT_DIR, targetName);
      
      console.log(`📄 Found: ${f} in ${path.relative(__dirname, dir) || '.'}`);
      console.log(`⏳ Extracting to ${targetName}...`);

      try {
        const text = await extractPdf(pdfPath);
        fs.writeFileSync(outPath, text, 'utf8');
        console.log(`✅ Extracted ${(text.length / 1024).toFixed(1)} KB -> dataprocessing/2026/${targetName}\n`);
        found++;
      } catch (err) {
        console.error(`❌ Failed to extract ${f}:`, err.message);
      }
    }
  }

  if (found === 0) {
    console.log('⚠️  No matching 2026 PDF files found.');
    console.log('👉 Please place your 2026 PDFs into:');
    console.log('   kea-pdfs/2026/ (or dataprocessing/2026/)');
    console.log('   with recognizable names like:');
    console.log('   - medical_r1.pdf or medical1.pdf');
    console.log('   - medical_r2.pdf or medical2.pdf');
    console.log('   - dental_r1.pdf  or dental1.pdf');
  } else {
    console.log(`🎉 Finished extracting ${found} PDF(s)!`);
    console.log('👉 You can now run: node dataprocessing/compile.cjs');
  }
}

run().catch(console.error);
