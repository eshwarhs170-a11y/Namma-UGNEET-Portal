const fs = require('fs');
const path = require('path');

// Configuration for your data streams — now includes ALL 3 rounds per stream
const CONFIG = {
  medical: { prefix: 'M', streamKey: 'MEDICAL' },
  dental:  { prefix: 'D', streamKey: 'DENTAL' },
  ayush:   { prefix: 'I', streamKey: 'AYUSH' } // Uses 'I' prefix common in KEA AYUSH codes
};

const ROUNDS = ['r1', 'r2', 'r3']; // maps to round tags R1/R2/R3

const OUTPUT_FILE = path.join(__dirname, 'output', 'compiled_allotments.json');

function compileAllData() {
  const masterData = [];
  let globalSkippedChars = 0;

  Object.entries(CONFIG).forEach(([streamName, info]) => {
    ROUNDS.forEach((roundTag) => {
      const fileName = `${streamName}_${roundTag}.txt`;
      const filePath = path.join(__dirname, fileName);
      const roundLabel = roundTag.toUpperCase(); // r1 -> R1, r2 -> R2, r3 -> R3

      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipping ${streamName.toUpperCase()} ${roundLabel}: File not found at ${filePath}`);
        return;
      }

      console.log(`⏳ Processing ${streamName.toUpperCase()} ${roundLabel} data from ${fileName}...`);
      const rawText = fs.readFileSync(filePath, 'utf8');

      /*
        Regex Breakdown:
        1. (\d+)              -> Serial number
        2. (\d+)               -> NEET All India Rank
        3. (${prefix}\d+[A-Z0-9]*) -> College Code (e.g., I701AG)
        4. ([\s\S]*?)          -> College Name & Address
        5. course type alternation -> Course Type (hyphen and trailing period both optional —
           some rounds print "MBBS-GOVT." others print "MBBSOTHERS" with no separator at all)
        6. ([A-Z0-9]+)         -> Category (e.g., GM, 2AG, NRI, OPN)
        7. (\d+)               -> Fees
      */
      const entryRegex = new RegExp(
        `(\\d+)\\s+(\\d+)\\s+(${info.prefix}\\d+[A-Z0-9]*)\\s+([\\s\\S]*?)(BAMS-?[A-Za-z]+\\.?|BHMS-?[A-Za-z]+\\.?|BUMS-?[A-Za-z]+\\.?|BYNS-?[A-Za-z]+\\.?|MBBS-?[A-Za-z]+\\.?|BDS-?[A-Za-z]+\\.?)\\s+([A-Z0-9]+)\\s+(\\d+)`,
        'g'
      );

      let match;
      let count = 0;
      let lastIndex = 0;

      while ((match = entryRegex.exec(rawText)) !== null) {
        // Track any large gap between matches — usually means a record failed to parse
        const gap = match.index - lastIndex;
        if (gap > 40) { // small gaps are just whitespace/page breaks; big gaps mean a skipped record
          const skippedText = rawText.slice(lastIndex, match.index).trim();
          // Ignore known repeating page header/footer boilerplate and the table column-header row
          const isKnownHeader = /ALLOTMENT LIST\s*\[\d{2}-\d{2}-\d{4}\]/i.test(skippedText) ||
                                 /SL\.NO\s+All India/i.test(skippedText);
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
          round: roundLabel // R1, R2, or R3 — now correctly reflects the source file
        });

        count++;
      }

      console.log(`✅ Successfully extracted ${count} records from ${fileName}`);
    });
  });

  // Ensure the output folder exists before writing file
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(masterData, null, 2), 'utf8');
  console.log(`\n🎉 Process complete! Total parsed records: ${masterData.length}`);
  if (globalSkippedChars > 0) {
    console.log(`⚠️  Warning: ~${globalSkippedChars} characters across all files looked like skipped/unmatched records. Review the ↳ lines above.`);
  }
  console.log(`📁 Target database destination: ${OUTPUT_FILE}`);
}

compileAllData();