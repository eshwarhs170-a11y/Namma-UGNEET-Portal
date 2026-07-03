const fs = require('fs');
const path = require('path');

// Target paths - Updated to drop directly into your React frontend data directory
const TXT_DIR = __dirname;
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'data', 'medicalData.json');

// Direct mapping to your clean text files to capture 100% of the rows
const FILE_MAPPING = {
  'medical_r2.txt': { prefix: 'M', streamKey: 'MEDICAL' },
  'dental_r2.txt':  { prefix: 'D', streamKey: 'DENTAL' },
  'ayush_r2.txt':   { prefix: 'I', streamKey: 'AYUSH' }
};

async function processAllFiles() {
  const masterData = [];

  for (const [filename, info] of Object.entries(FILE_MAPPING)) {
    const txtPath = path.join(TXT_DIR, filename);

    if (!fs.existsSync(txtPath)) {
      console.log(`⚠️  Skipping ${filename}: File not found at ${txtPath}`);
      continue;
    }

    console.log(`⏳ Parsing data directly from text dump: ${filename}...`);
    
    try {
      const rawText = fs.readFileSync(txtPath, 'utf8');

      /* Upgraded KEA Dataset Regex Engine:
         Captures: SerialNo, Rank, CollegeCode, CollegeName, Course, Category, Fees.
         Now handles any trailing words like "Reproted" or "Not Reported" at the end of lines seamlessly.
      */
      const entryRegex = new RegExp(
        `(\\d+)\\s+(\\d+)\\s+(${info.prefix}\\d+[A-Z0-9]*)\\s+([\\s\\S]*?)(MBBS|BDS|BAMS|BHMS|BUMS|BYNS)(?:-[A-Za-z.]+)?\\s+([A-Z0-9]+)\\s+(\\d+)(?:\\s+[A-Za-z\\s]+)?`,
        'g'
      );

      let match;
      let streamCount = 0;

      while ((match = entryRegex.exec(rawText)) !== null) {
        masterData.push({
          serialNo: match[1],
          rank: parseInt(match[2], 10),
          collegeCode: match[3],
          collegeName: match[4].replace(/\s+/g, ' ').trim(), 
          courseDetails: match[5].trim(),
          category: match[6].trim(),
          fees: parseInt(match[7], 10),
          stream: info.streamKey,
          round: 'R2'
        });
        streamCount++;
      }

      console.log(`✅ Extracted ${streamCount} clean rows for ${info.streamKey}\n`);

    } catch (err) {
      console.error(`❌ Error processing ${filename}:`, err.message);
    }
  }

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(masterData, null, 2), 'utf8');
  console.log(`🎉 Compilation Complete! Total Records Saved: ${masterData.length}`);
  console.log(`📁 Database Location: ${OUTPUT_FILE}`);
}

processAllFiles();