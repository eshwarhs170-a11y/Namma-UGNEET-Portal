const fs = require('fs');
const path = require('path');

// Configuration for your data streams
const CONFIG = {
  medical: { prefix: 'M', streamKey: 'MEDICAL' },
  dental:  { prefix: 'D', streamKey: 'DENTAL' },
  ayush:   { prefix: 'I', streamKey: 'AYUSH' } // Uses 'I' prefix common in KEA AYUSH codes
};

const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'data', 'compiled_allotments.json');

// Auto-detect year folders (2024, 2025, 2026...) sitting inside dataprocessing/.
// Falls back to treating dataprocessing/ itself as a single unlabeled year if none are found,
// so this still works on an older, pre-reorg folder layout.
function detectYearFolders() {
  const entries = fs.readdirSync(__dirname, { withFileTypes: true });
  const years = entries
    .filter((e) => e.isDirectory() && /^\d{4}$/.test(e.name))
    .map((e) => e.name)
    .sort();
  return years.length > 0 ? years : [null];
}

function detectRoundFiles(folderPath, streamName) {
  if (!fs.existsSync(folderPath)) return [];
  const files = fs.readdirSync(folderPath);
  const pattern = new RegExp(`^${streamName}_(.+)\\.txt$`, 'i');
  return files
    .map((f) => {
      const m = f.match(pattern);
      return m ? { fileName: f, roundTag: m[1] } : null;
    })
    .filter(Boolean);
}

function compileAllData() {
  const masterData = [];
  let globalSkippedChars = 0;
  const years = detectYearFolders();

  console.log(`📅 Detected year folder(s): ${years.map((y) => y || '(root)').join(', ')}\n`);

  years.forEach((year) => {
    const yearPath = year ? path.join(__dirname, year) : __dirname;

    Object.entries(CONFIG).forEach(([streamName, info]) => {
      const roundFiles = detectRoundFiles(yearPath, streamName);

      if (roundFiles.length === 0) {
        console.log(`⚠️  No files found for ${streamName.toUpperCase()} in ${year || '(root)'}`);
        return;
      }

      roundFiles.forEach(({ fileName, roundTag }) => {
        const filePath = path.join(yearPath, fileName);
        const roundLabel = roundTag.toUpperCase();
        const yearLabel = year || 'UNSPECIFIED';

        console.log(`⏳ Processing ${streamName.toUpperCase()} ${roundLabel} (${yearLabel}) from ${fileName}...`);
        const rawText = fs.readFileSync(filePath, 'utf8');

        const entryRegex = new RegExp(
          `(\\d+)\\s+(\\d+)\\s+(${info.prefix}\\d+[A-Z0-9]*)\\s+([\\s\\S]*?)(BAMS-?[A-Za-z]+\\.?|BHMS-?[A-Za-z]+\\.?|BUMS-?[A-Za-z]+\\.?|BYNS-?[A-Za-z]+\\.?|MBBS-?[A-Za-z]+\\.?|BDS-?[A-Za-z]+\\.?)\\s+([A-Z0-9]+)\\s+(\\d+)`,
          'g'
        );

        let match;
        let count = 0;
        let lastIndex = 0;

        while ((match = entryRegex.exec(rawText)) !== null) {
          const gap = match.index - lastIndex;
          if (gap > 40) {
            const skippedText = rawText.slice(lastIndex, match.index).trim();
            const isKnownHeader =
              /ALLOTMENT LIST\s*\[\d{2}-\d{2}-\d{4}\]/i.test(skippedText) ||
              /SL\.NO\s+All India/i.test(skippedText) ||
              /ALLOTTED\s+IN\s+(MEDICAL|DENTAL|AYUSH)/i.test(skippedText) ||
              (/STRAY/i.test(skippedText) && /ROUND/i.test(skippedText));
            if (skippedText.length > 10 && !isKnownHeader) {
              globalSkippedChars += skippedText.length;
              console.log(`   ↳ Possibly skipped chunk before serial ${match[1]} (${skippedText.length} chars): "${skippedText.slice(0, 80).replace(/\s+/g, ' ')}..."`);
            }
          }
          lastIndex = entryRegex.lastIndex;

          const serialNo = match[1];
          const rank = parseInt(match[2], 10);
          const collegeCode = match[3];
          const collegeName = match[4].replace(/\s+/g, ' ').trim();
          const courseDetails = match[5].trim().replace(/\.$/, '');
          const category = match[6].trim();
          const fees = parseInt(match[7], 10);

          masterData.push({
            serialNo,
            rank,
            collegeCode,
            collegeName,
            courseDetails,
            category,
            fees,
            stream: info.streamKey,
            round: roundLabel,
            year: yearLabel
          });

          count++;
        }

        console.log(`✅ Successfully extracted ${count} records from ${fileName}`);
      });
    });
  });

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(masterData), 'utf8');
  const sizeKB = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(0);
  console.log(`\n🎉 Process complete! Total parsed records: ${masterData.length}`);
  console.log(`📦 Output file size: ${sizeKB} KB`);
  if (globalSkippedChars > 0) {
    console.log(`⚠️  Warning: ~${globalSkippedChars} characters across all files looked like skipped/unmatched records. Review the ↳ lines above.`);
  }
  console.log(`📁 Target database destination: ${OUTPUT_FILE}`);
}

compileAllData();